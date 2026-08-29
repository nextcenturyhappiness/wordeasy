import type { ContentShortage } from "../application/contracts";
import {
  selectMedicalAssignment,
  selectResearchAssignment,
  type AssignmentCandidate,
  type ResearchSelectionResult
} from "../domain/assignment";
import type { DomainModuleSlug } from "../domain/learning";
import { studyDateFor } from "../domain/time";
import type { LearningDatabase } from "../db/learningDatabase";
import type {
  CachedAssignmentSetRow,
  CachedDailyAssignmentRow,
  CachedDailyReviewAssignmentRow,
  DailySummaryRow
} from "../db/records";

export type EnsureAssignmentResult =
  | { status: "ready"; assignments: CachedDailyAssignmentRow[] }
  | { status: "shortage"; shortage: ContentShortage };

function emptySummary(
  userId: string,
  module: DomainModuleSlug,
  studyDate: string,
  updatedAt: string
): DailySummaryRow {
  return {
    userId,
    module,
    studyDate,
    newCompleted: 0,
    newTotal: 0,
    reviewCompleted: 0,
    reviewTotal: 0,
    totalLearned: 0,
    streak: 0,
    pendingSyncCount: 0,
    updatedAt
  };
}

export class LocalAssignmentService {
  constructor(
    private readonly database: LearningDatabase,
    private readonly userId: string
  ) {}

  async ensureResearchNew(studyDate: string, createdAt: string): Promise<EnsureAssignmentResult> {
    return this.ensureNew("research_english", studyDate, createdAt, selectResearchAssignment);
  }

  async ensureMedicalNew(studyDate: string, createdAt: string): Promise<EnsureAssignmentResult> {
    return this.ensureNew("medical_english", studyDate, createdAt, selectMedicalAssignment);
  }

  async ensureProvisionalNewSummary(
    module: DomainModuleSlug,
    studyDate: string,
    catalogSize: number,
    dailyQuota: number,
    createdAt: string
  ): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.cached_daily_assignments,
      this.database.cached_assignment_sets,
      this.database.daily_summary,
      async () => {
        const summaryKey: [string, DomainModuleSlug, string] = [this.userId, module, studyDate];
        const summary =
          (await this.database.daily_summary.get(summaryKey)) ??
          emptySummary(this.userId, module, studyDate, createdAt);
        const existingSet = await this.database.cached_assignment_sets.get([
          this.userId,
          module,
          studyDate,
          "new"
        ]);
        if (existingSet !== undefined) {
          const assignedToday = await this.database.cached_daily_assignments
            .where("[userId+module+studyDate]")
            .equals([this.userId, module, studyDate])
            .count();
          await this.database.daily_summary.put({
            ...summary,
            newTotal: existingSet.status === "ready" ? assignedToday : 0,
            updatedAt: createdAt
          });
          return;
        }

        const assignedBeforeToday = await this.database.cached_daily_assignments
          .where("[userId+module]")
          .equals([this.userId, module])
          .count();
        const remaining = Math.max(0, catalogSize - assignedBeforeToday);
        await this.database.daily_summary.put({
          ...summary,
          newTotal: remaining >= dailyQuota ? dailyQuota : 0,
          updatedAt: createdAt
        });
      }
    );
  }

  async ensureDueReviewSet(
    module: DomainModuleSlug,
    studyDate: string,
    timezone: string,
    createdAt: string
  ): Promise<CachedDailyReviewAssignmentRow[]> {
    return this.database.transaction(
      "rw",
      this.database.cached_daily_assignments,
      this.database.cached_daily_review_assignments,
      this.database.cached_assignment_sets,
      this.database.local_review_states,
      this.database.daily_summary,
      async () => {
        const setKey: [string, DomainModuleSlug, string, "review"] = [
          this.userId,
          module,
          studyDate,
          "review"
        ];
        const existingSet = await this.database.cached_assignment_sets.get(setKey);
        if (existingSet !== undefined) {
          const existingAssignments = await this.database.cached_daily_review_assignments
            .where("[userId+module+studyDate]")
            .equals([this.userId, module, studyDate])
            .sortBy("position");
          await this.#updateReviewTotal(module, studyDate, existingAssignments.length, createdAt);
          return existingAssignments;
        }

        const currentNewCardIds = new Set(
          (
            await this.database.cached_daily_assignments
              .where("[userId+module+studyDate]")
              .equals([this.userId, module, studyDate])
              .toArray()
          ).map((assignment) => assignment.cardId)
        );
        const eligibleStates = (
          await this.database.local_review_states
            .where("[userId+module+dueAt]")
            .between([this.userId, module, ""], [this.userId, module, "\uffff"], true, true)
            .toArray()
        )
          .filter(
            (state) =>
              state.dueAt !== null &&
              studyDateFor(new Date(state.dueAt), timezone) <= studyDate &&
              !currentNewCardIds.has(state.cardId)
          )
          .sort(
            (left, right) =>
              (left.dueAt ?? "").localeCompare(right.dueAt ?? "") ||
              left.cardId.localeCompare(right.cardId)
          );
        const assignments = eligibleStates.map(
          (state, position) =>
            ({
              userId: this.userId,
              module,
              studyDate,
              cardId: state.cardId,
              position,
              completedAt: null,
              createdAt
            }) satisfies CachedDailyReviewAssignmentRow
        );
        if (assignments.length > 0) {
          await this.database.cached_daily_review_assignments.bulkAdd(assignments);
        }
        await this.database.cached_assignment_sets.add({
          userId: this.userId,
          module,
          studyDate,
          queue: "review",
          status: "ready",
          shortage: null,
          createdAt
        });
        await this.#updateReviewTotal(module, studyDate, assignments.length, createdAt);
        return assignments;
      }
    );
  }

  private async ensureNew(
    module: DomainModuleSlug,
    studyDate: string,
    createdAt: string,
    select: (
      candidates: AssignmentCandidate[],
      userId: string,
      studyDate: string
    ) => ResearchSelectionResult
  ): Promise<EnsureAssignmentResult> {
    return this.database.transaction(
      "rw",
      this.database.cached_cards,
      this.database.cached_daily_assignments,
      this.database.cached_assignment_sets,
      this.database.daily_summary,
      async () => {
        const setKey: [string, DomainModuleSlug, string, "new"] = [
          this.userId,
          module,
          studyDate,
          "new"
        ];
        const existingSet = await this.database.cached_assignment_sets.get(setKey);
        if (existingSet !== undefined) {
          if (existingSet.status === "shortage" && existingSet.shortage !== null) {
            return { status: "shortage", shortage: existingSet.shortage };
          }
          const assignments = await this.database.cached_daily_assignments
            .where("[userId+module+studyDate]")
            .equals([this.userId, module, studyDate])
            .sortBy("position");
          return { status: "ready", assignments };
        }

        const allCards = await this.database.cached_cards
          .where("[userId+module]")
          .equals([this.userId, module])
          .toArray();
        const previouslyAssigned = new Set(
          (
            await this.database.cached_daily_assignments
              .where("[userId+module]")
              .equals([this.userId, module])
              .toArray()
          ).map((assignment) => assignment.cardId)
        );
        const selection = select(
          allCards
            .filter((card) => !previouslyAssigned.has(card.cardId))
            .map((card) => ({ cardId: card.cardId, category: card.category })),
          this.userId,
          studyDate
        );
        const summaryKey: [string, DomainModuleSlug, string] = [this.userId, module, studyDate];
        const summary =
          (await this.database.daily_summary.get(summaryKey)) ??
          emptySummary(this.userId, module, studyDate, createdAt);

        if (selection.status === "shortage") {
          const frozenSet: CachedAssignmentSetRow = {
            userId: this.userId,
            module,
            studyDate,
            queue: "new",
            status: "shortage",
            shortage: selection.shortage,
            createdAt
          };
          await this.database.cached_assignment_sets.add(frozenSet);
          await this.database.daily_summary.put({ ...summary, newTotal: 0, updatedAt: createdAt });
          return { status: "shortage", shortage: selection.shortage };
        }

        const cardById = new Map(allCards.map((card) => [card.cardId, card]));
        const assignments = selection.cards.map((selected, position) => {
          const card = cardById.get(selected.cardId);
          if (card === undefined) {
            throw new Error(`Selected card ${selected.cardId} is not cached.`);
          }
          return {
            userId: this.userId,
            module,
            studyDate,
            cardId: card.cardId,
            wordSenseId: card.wordSenseId,
            category: card.category,
            position,
            completedAt: null,
            createdAt
          } satisfies CachedDailyAssignmentRow;
        });
        await this.database.cached_daily_assignments.bulkAdd(assignments);
        await this.database.cached_assignment_sets.add({
          userId: this.userId,
          module,
          studyDate,
          queue: "new",
          status: "ready",
          shortage: null,
          createdAt
        });
        await this.database.daily_summary.put({
          ...summary,
          newTotal: assignments.length,
          updatedAt: createdAt
        });
        return { status: "ready", assignments };
      }
    );
  }

  async ensureEmptyReviewSet(
    module: DomainModuleSlug,
    studyDate: string,
    createdAt: string
  ): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.cached_assignment_sets,
      this.database.daily_summary,
      async () => {
        const setKey: [string, DomainModuleSlug, string, "review"] = [
          this.userId,
          module,
          studyDate,
          "review"
        ];
        const existing = await this.database.cached_assignment_sets.get(setKey);
        if (existing === undefined) {
          await this.database.cached_assignment_sets.add({
            userId: this.userId,
            module,
            studyDate,
            queue: "review",
            status: "ready",
            shortage: null,
            createdAt
          });
        }
        const summaryKey: [string, DomainModuleSlug, string] = [this.userId, module, studyDate];
        if ((await this.database.daily_summary.get(summaryKey)) === undefined) {
          await this.database.daily_summary.add(
            emptySummary(this.userId, module, studyDate, createdAt)
          );
        }
      }
    );
  }

  async #updateReviewTotal(
    module: DomainModuleSlug,
    studyDate: string,
    reviewTotal: number,
    updatedAt: string
  ): Promise<void> {
    const summaryKey: [string, DomainModuleSlug, string] = [this.userId, module, studyDate];
    const summary =
      (await this.database.daily_summary.get(summaryKey)) ??
      emptySummary(this.userId, module, studyDate, updatedAt);
    await this.database.daily_summary.put({ ...summary, reviewTotal, updatedAt });
  }
}
