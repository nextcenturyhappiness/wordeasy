import type { ModuleSlug } from "../../application/contracts";
import type { LearningDatabase } from "../../db/learningDatabase";
import type {
  CachedCardRow,
  CachedDailyAssignmentRow,
  CachedDailyReviewAssignmentRow,
  DailySummaryRow
} from "../../db/records";
import type {
  CloudContextCard,
  CloudDailyLearningSnapshot,
  CloudLearningRepository
} from "./types";

function cachedCard(userId: string, card: CloudContextCard, cachedAt: string): CachedCardRow {
  return {
    userId,
    cardId: card.cardId,
    wordId: card.wordId,
    wordSenseId: card.wordSenseId,
    contextId: card.contextId,
    module: card.module,
    category: card.category,
    lemma: card.lemma,
    displayForm: card.displayForm,
    partOfSpeech: card.partOfSpeech,
    ipa: card.ipa,
    meaningEn: card.meaningEn,
    meaningZh: card.meaningZh,
    usageNote: card.usageNote,
    contextSentence: card.contextSentence,
    targetText: card.targetText,
    plainEnglishParaphrase: card.plainEnglishParaphrase,
    sentenceTranslationZh: card.sentenceTranslationZh,
    collocations: [...card.collocations],
    sourceType: card.sourceType,
    sourceTitle: card.sourceTitle,
    sourceUrl: card.sourceUrl,
    doi: card.doi,
    pmid: card.pmid,
    cachedAt
  };
}

export class AccountCloudDayCache {
  constructor(
    readonly userId: string,
    private readonly database: LearningDatabase,
    private readonly cloud: CloudLearningRepository,
    private readonly now: () => Date = () => new Date()
  ) {
    if (userId.trim().length === 0 || cloud.userId !== userId) {
      throw new Error("Cloud day cache dependencies must share one account scope.");
    }
  }

  async refresh(module: ModuleSlug, studyDate: string): Promise<CloudDailyLearningSnapshot> {
    await this.cloud.ensureNewAssignment(module, studyDate);
    await this.cloud.ensureReviewAssignment(module, studyDate);
    const snapshot = await this.cloud.getDailySnapshot(module, studyDate);
    await this.#cacheSnapshot(module, studyDate, snapshot);
    return snapshot;
  }

  async #cacheSnapshot(
    module: ModuleSlug,
    studyDate: string,
    snapshot: CloudDailyLearningSnapshot
  ): Promise<void> {
    const nowIso = this.now().toISOString();
    const newSet = snapshot.newAssignment;
    const reviewSet = snapshot.reviewAssignment;
    if (
      newSet === null ||
      reviewSet === null ||
      newSet.module !== module ||
      reviewSet.module !== module ||
      newSet.studyDate !== studyDate ||
      reviewSet.studyDate !== studyDate
    ) {
      throw new Error("Cloud daily snapshot is incomplete or escaped its requested scope.");
    }
    const cardsById = new Map(snapshot.cards.map((card) => [card.cardId, card]));
    const assignedCardIds = new Set([
      ...newSet.assignments.map((assignment) => assignment.cardId),
      ...reviewSet.assignments.map((assignment) => assignment.cardId)
    ]);
    if ([...assignedCardIds].some((cardId) => !cardsById.has(cardId))) {
      throw new Error("Cloud snapshot omitted content for an assigned card.");
    }

    await this.database.transaction(
      "rw",
      this.database.cached_cards,
      this.database.cached_assignment_sets,
      this.database.cached_daily_assignments,
      this.database.cached_daily_review_assignments,
      this.database.daily_summary,
      async () => {
        await this.database.cached_cards.bulkPut(
          snapshot.cards.map((card) => cachedCard(this.userId, card, nowIso))
        );

        const currentNew = await this.database.cached_daily_assignments
          .where("[userId+module+studyDate]")
          .equals([this.userId, module, studyDate])
          .toArray();
        const remoteNewIds = new Set(newSet.assignments.map((assignment) => assignment.cardId));
        if (currentNew.some((assignment) => !remoteNewIds.has(assignment.cardId))) {
          throw new Error("Stable cloud New assignment conflicts with the local cached set.");
        }
        const currentNewByCard = new Map(
          currentNew.map((assignment) => [assignment.cardId, assignment])
        );
        const newRows: CachedDailyAssignmentRow[] = newSet.assignments.map((assignment) => {
          const card = cardsById.get(assignment.cardId);
          if (card === undefined) {
            throw new Error(`Missing cloud card ${assignment.cardId}.`);
          }
          return {
            userId: this.userId,
            module,
            studyDate,
            cardId: assignment.cardId,
            wordSenseId: card.wordSenseId,
            category: assignment.category,
            position: assignment.position - 1,
            completedAt: currentNewByCard.get(assignment.cardId)?.completedAt ?? null,
            createdAt: currentNewByCard.get(assignment.cardId)?.createdAt ?? nowIso
          };
        });
        await this.database.cached_daily_assignments.bulkPut(newRows);
        await this.database.cached_assignment_sets.put({
          userId: this.userId,
          module,
          studyDate,
          queue: "new",
          status: newSet.status,
          shortage: newSet.shortage,
          createdAt: nowIso
        });

        const currentReview = await this.database.cached_daily_review_assignments
          .where("[userId+module+studyDate]")
          .equals([this.userId, module, studyDate])
          .toArray();
        const remoteReviewIds = new Set(
          reviewSet.assignments.map((assignment) => assignment.cardId)
        );
        if (currentReview.some((assignment) => !remoteReviewIds.has(assignment.cardId))) {
          throw new Error("Stable cloud Review assignment conflicts with the local cached set.");
        }
        const currentReviewByCard = new Map(
          currentReview.map((assignment) => [assignment.cardId, assignment])
        );
        const reviewRows: CachedDailyReviewAssignmentRow[] = reviewSet.assignments.map(
          (assignment) => ({
            userId: this.userId,
            module,
            studyDate,
            cardId: assignment.cardId,
            position: assignment.position - 1,
            completedAt: currentReviewByCard.get(assignment.cardId)?.completedAt ?? null,
            createdAt: currentReviewByCard.get(assignment.cardId)?.createdAt ?? nowIso
          })
        );
        await this.database.cached_daily_review_assignments.bulkPut(reviewRows);
        await this.database.cached_assignment_sets.put({
          userId: this.userId,
          module,
          studyDate,
          queue: "review",
          status: "ready",
          shortage: null,
          createdAt: nowIso
        });

        const summaryKey: [string, ModuleSlug, string] = [this.userId, module, studyDate];
        const prior = await this.database.daily_summary.get(summaryKey);
        const summary: DailySummaryRow = {
          userId: this.userId,
          module,
          studyDate,
          newCompleted: newRows.filter((row) => row.completedAt !== null).length,
          newTotal: newRows.length,
          reviewCompleted: reviewRows.filter((row) => row.completedAt !== null).length,
          reviewTotal: reviewRows.length,
          totalLearned: prior?.totalLearned ?? 0,
          streak: prior?.streak ?? 0,
          pendingSyncCount: prior?.pendingSyncCount ?? 0,
          updatedAt: nowIso
        };
        await this.database.daily_summary.put(summary);
      }
    );
  }
}
