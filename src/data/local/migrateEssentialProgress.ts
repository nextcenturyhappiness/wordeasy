import { isMergedMedicalNewAssignment } from "../../domain/assignment";
import type { DomainModuleSlug, NormalizedContextCard } from "../../domain/learning";
import type { LearningDatabase } from "../../db/learningDatabase";
import type { CachedCardRow, LearnedWordSenseRow, LocalReviewStateRow } from "../../db/records";

interface ProgressAlias {
  fromModule: DomainModuleSlug;
  fromCardId: string;
  fromSenseId: string;
  toCardId: string;
  toSenseId: string;
}

export interface EssentialProgressMigrationInput {
  database: LearningDatabase;
  userId: string;
  studyDate: string;
  nextCards: readonly NormalizedContextCard[];
  updatedAt: string;
}

function normalizeLemma(lemma: string): string {
  return lemma.trim().toLowerCase();
}

function progressAliases(
  oldCards: readonly CachedCardRow[],
  nextCards: readonly NormalizedContextCard[]
): ProgressAlias[] {
  const nextById = new Map(nextCards.map((card) => [card.card.id, card]));
  const nextMedicalByLemma = new Map<string, NormalizedContextCard>();
  for (const card of nextCards) {
    if (card.sense.module !== "medical_english") {
      continue;
    }
    const key = normalizeLemma(card.word.lemma);
    if (!nextMedicalByLemma.has(key)) {
      nextMedicalByLemma.set(key, card);
    }
  }

  const aliases: ProgressAlias[] = [];
  for (const old of oldCards) {
    if (old.module !== "medical_english" && old.module !== "essential_medical") {
      continue;
    }
    const keptById = nextById.get(old.cardId);
    if (keptById !== undefined && keptById.sense.module === "medical_english") {
      if (old.module === "essential_medical" || old.wordSenseId !== keptById.sense.id) {
        aliases.push({
          fromModule: old.module,
          fromCardId: old.cardId,
          fromSenseId: old.wordSenseId,
          toCardId: keptById.card.id,
          toSenseId: keptById.sense.id
        });
      }
      continue;
    }

    const byLemma = nextMedicalByLemma.get(normalizeLemma(old.lemma));
    if (byLemma === undefined || byLemma.card.id === old.cardId) {
      continue;
    }
    aliases.push({
      fromModule: old.module,
      fromCardId: old.cardId,
      fromSenseId: old.wordSenseId,
      toCardId: byLemma.card.id,
      toSenseId: byLemma.sense.id
    });
  }
  return aliases;
}

/**
 * Moves local 必备医学英语 progress onto the merged Medical English cards.
 * Immutable review events stay on their original module. Today's Medical New
 * queue is rebuilt unless it is already the merged 1+1+8 set. Today's Medical
 * Review queue is rebuilt so retargeted due cards can enter it.
 */
export async function migrateEssentialProgressIntoMedical({
  database,
  userId,
  studyDate,
  nextCards,
  updatedAt
}: EssentialProgressMigrationInput): Promise<void> {
  await database.transaction(
    "rw",
    [
      database.cached_cards,
      database.learned_word_senses,
      database.local_review_states,
      database.sync_outbox,
      database.cached_daily_assignments,
      database.cached_daily_review_assignments,
      database.cached_assignment_sets,
      database.daily_summary
    ],
    async () => {
      const oldCards = await database.cached_cards.where("userId").equals(userId).toArray();
      const aliases = progressAliases(oldCards, nextCards);
      const identityAliases = aliases.filter(
        (alias) => alias.fromCardId === alias.toCardId && alias.fromSenseId === alias.toSenseId
      );
      const remapAliases = aliases.filter(
        (alias) => alias.fromCardId !== alias.toCardId || alias.fromSenseId !== alias.toSenseId
      );

      const learnedMedical = new Set(
        (
          await database.learned_word_senses
            .where("[userId+module]")
            .equals([userId, "medical_english"])
            .toArray()
        ).map((row) => row.wordSenseId)
      );

      const applyLearned = async (alias: ProgressAlias): Promise<void> => {
        const source = await database.learned_word_senses.get([
          userId,
          alias.fromModule,
          alias.fromSenseId
        ]);
        if (source !== undefined && !learnedMedical.has(alias.toSenseId)) {
          const moved: LearnedWordSenseRow = {
            ...source,
            module: "medical_english",
            wordSenseId: alias.toSenseId,
            firstCardId: alias.toCardId
          };
          await database.learned_word_senses.put(moved);
          learnedMedical.add(alias.toSenseId);
        }
        if (
          source !== undefined &&
          (alias.fromModule !== "medical_english" || alias.fromSenseId !== alias.toSenseId)
        ) {
          await database.learned_word_senses.delete([userId, alias.fromModule, alias.fromSenseId]);
        }
      };

      const applyReviewState = async (alias: ProgressAlias): Promise<void> => {
        const source = await database.local_review_states.get([userId, alias.fromCardId]);
        if (source === undefined) {
          return;
        }
        if (alias.fromCardId === alias.toCardId) {
          if (source.module !== "medical_english") {
            await database.local_review_states.put({ ...source, module: "medical_english" });
          }
          return;
        }
        const destination = await database.local_review_states.get([userId, alias.toCardId]);
        await database.local_review_states.delete([userId, alias.fromCardId]);
        if (destination === undefined) {
          const moved: LocalReviewStateRow = {
            ...source,
            cardId: alias.toCardId,
            module: "medical_english"
          };
          await database.local_review_states.put(moved);
        }
      };

      for (const alias of [...identityAliases, ...remapAliases]) {
        await applyLearned(alias);
        await applyReviewState(alias);
      }

      const leftoverLearned = await database.learned_word_senses
        .where("[userId+module]")
        .equals([userId, "essential_medical"])
        .toArray();
      for (const row of leftoverLearned) {
        await database.learned_word_senses.delete([userId, "essential_medical", row.wordSenseId]);
      }

      const leftoverStates = await database.local_review_states
        .where("userId")
        .equals(userId)
        .toArray();
      for (const state of leftoverStates) {
        if (state.module === "essential_medical") {
          await database.local_review_states.delete([userId, state.cardId]);
        }
      }

      const essentialOutbox = await database.sync_outbox
        .where("[userId+module]")
        .equals([userId, "essential_medical"])
        .toArray();
      const aliasByCard = new Map(aliases.map((alias) => [alias.fromCardId, alias]));
      for (const row of essentialOutbox) {
        const alias = aliasByCard.get(row.cardId);
        await database.sync_outbox.put({
          ...row,
          module: "medical_english",
          cardId: alias?.toCardId ?? row.cardId
        });
      }

      const essentialAssignments = await database.cached_daily_assignments
        .where("[userId+module]")
        .equals([userId, "essential_medical"])
        .toArray();
      for (const row of essentialAssignments) {
        await database.cached_daily_assignments.delete([
          userId,
          "essential_medical",
          row.studyDate,
          row.cardId
        ]);
      }
      const essentialReviews = await database.cached_daily_review_assignments
        .where("[userId+module]")
        .equals([userId, "essential_medical"])
        .toArray();
      for (const row of essentialReviews) {
        await database.cached_daily_review_assignments.delete([
          userId,
          "essential_medical",
          row.studyDate,
          row.cardId
        ]);
      }
      const essentialSets = await database.cached_assignment_sets
        .where("[userId+module+studyDate]")
        .between([userId, "essential_medical", ""], [userId, "essential_medical", "\uffff"])
        .toArray();
      for (const row of essentialSets) {
        await database.cached_assignment_sets.delete([
          userId,
          "essential_medical",
          row.studyDate,
          row.queue
        ]);
      }
      const summaries = await database.daily_summary.where("userId").equals(userId).toArray();
      for (const summary of summaries) {
        if (summary.module === "essential_medical") {
          await database.daily_summary.delete([userId, "essential_medical", summary.studyDate]);
        }
      }

      const todayNew = await database.cached_daily_assignments
        .where("[userId+module+studyDate]")
        .equals([userId, "medical_english", studyDate])
        .toArray();
      if (!isMergedMedicalNewAssignment(todayNew.map((row) => row.category))) {
        for (const row of todayNew) {
          await database.cached_daily_assignments.delete([
            userId,
            "medical_english",
            studyDate,
            row.cardId
          ]);
        }
        await database.cached_assignment_sets.delete([userId, "medical_english", studyDate, "new"]);
      }

      const todayReview = await database.cached_daily_review_assignments
        .where("[userId+module+studyDate]")
        .equals([userId, "medical_english", studyDate])
        .toArray();
      for (const row of todayReview) {
        await database.cached_daily_review_assignments.delete([
          userId,
          "medical_english",
          studyDate,
          row.cardId
        ]);
      }
      await database.cached_assignment_sets.delete([
        userId,
        "medical_english",
        studyDate,
        "review"
      ]);

      const medicalSummary = await database.daily_summary.get([
        userId,
        "medical_english",
        studyDate
      ]);
      if (medicalSummary !== undefined) {
        const totalLearned = await database.learned_word_senses
          .where("[userId+module]")
          .equals([userId, "medical_english"])
          .count();
        await database.daily_summary.put({ ...medicalSummary, totalLearned, updatedAt });
      }
    }
  );
}
