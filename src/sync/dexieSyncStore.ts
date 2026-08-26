import type {
  CloudPullPage,
  CloudPushEvent,
  PushEventOutcome,
  ReconciledReviewState
} from "../data/cloud/types";
import type { DomainModuleSlug } from "../domain/learning";
import type { LocalReviewEvent, LocalReviewState } from "../domain/review";
import { calculateStreak } from "../domain/time";
import type { LearningDatabase } from "../db/learningDatabase";
import type { DailySummaryRow } from "../db/records";
import { INITIAL_PULL_CURSOR, type AccountLocalSyncStore } from "./contracts";

const PULL_CURSOR_KEY = "cloud-pull-cursor-v1";
const PENDING_CONFLICTS_KEY = "pending-reconciliation-cards-v1";
const SYNCING_LEASE_MS = 120_000;
const MAX_RETRY_DELAY_MS = 300_000;
const SYNCED_PRUNE_BATCH_SIZE = 50;
const STRING_INDEX_MAX = "\uffff";
const ACTIVE_OUTBOX_STATUSES = ["pending", "syncing", "failed"] as const;

function assertDate(value: string, label: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${label} must be an ISO date-time.`);
  }
}

function eventDueAt(event: LocalReviewEvent): string {
  const dueAt = event.schedulerAfter.due;
  if (typeof dueAt !== "string") {
    throw new Error(`Local event ${event.eventId} has no scheduler due date.`);
  }
  assertDate(dueAt, `Local event ${event.eventId} due date`);
  return dueAt;
}

function retryAt(now: Date, attemptCount: number): string {
  const delay = Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** Math.min(attemptCount, 8));
  return new Date(now.getTime() + delay).toISOString();
}

function eligibleAt(row: { status: string; nextAttemptAt: string; updatedAt: string }): string {
  return row.status === "syncing" ? row.updatedAt : row.nextAttemptAt;
}

function cursorFromUnknown(value: unknown): typeof INITIAL_PULL_CURSOR {
  if (typeof value !== "object" || value === null) {
    return INITIAL_PULL_CURSOR;
  }
  const receivedAt = "receivedAt" in value ? value.receivedAt : undefined;
  const eventId = "eventId" in value ? value.eventId : undefined;
  if (typeof receivedAt !== "string" || typeof eventId !== "string") {
    return INITIAL_PULL_CURSOR;
  }
  assertDate(receivedAt, "Pull cursor");
  const stateSequence = "stateSequence" in value ? value.stateSequence : undefined;
  const stateEpoch = "stateEpoch" in value ? value.stateEpoch : undefined;
  return {
    receivedAt,
    eventId,
    stateSequence:
      typeof stateSequence === "number" && Number.isSafeInteger(stateSequence) && stateSequence >= 0
        ? stateSequence
        : 0,
    stateEpoch: typeof stateEpoch === "string" ? stateEpoch : ""
  };
}

function conflictCardIdsFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((cardId): cardId is string => typeof cardId === "string"))]
    .filter((cardId) => cardId.trim().length > 0)
    .sort();
}

export class DexieAccountSyncStore implements AccountLocalSyncStore {
  #disposed = false;

  constructor(
    private readonly database: LearningDatabase,
    readonly userId: string
  ) {
    if (userId.trim().length === 0) {
      throw new Error("Dexie sync store requires an account userId.");
    }
  }

  async claimPushBatch(now: Date, limit: number): Promise<CloudPushEvent[]> {
    this.#assertActive();
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error("Push batch limit must be a positive integer.");
    }
    const nowIso = now.toISOString();
    const expiredLease = new Date(now.getTime() - SYNCING_LEASE_MS).toISOString();
    return this.database.transaction(
      "rw",
      this.database.sync_outbox,
      this.database.local_review_events,
      async () => {
        const acknowledgedKeys = await this.database.sync_outbox
          .where("[userId+status]")
          .equals([this.userId, "synced"])
          .limit(SYNCED_PRUNE_BATCH_SIZE)
          .primaryKeys();
        await this.database.sync_outbox.bulkDelete(acknowledgedKeys);

        const [pending, failed, syncing] = await Promise.all([
          this.database.sync_outbox
            .where("[userId+status+nextAttemptAt+createdAt+eventId]")
            .between(
              [this.userId, "pending", "", "", ""],
              [this.userId, "pending", nowIso, STRING_INDEX_MAX, STRING_INDEX_MAX]
            )
            .limit(limit)
            .toArray(),
          this.database.sync_outbox
            .where("[userId+status+nextAttemptAt+createdAt+eventId]")
            .between(
              [this.userId, "failed", "", "", ""],
              [this.userId, "failed", nowIso, STRING_INDEX_MAX, STRING_INDEX_MAX]
            )
            .limit(limit)
            .toArray(),
          this.database.sync_outbox
            .where("[userId+status+updatedAt]")
            .between(
              [this.userId, "syncing", ""],
              [this.userId, "syncing", expiredLease],
              true,
              true
            )
            .limit(limit)
            .toArray()
        ]);
        const eligible = [...pending, ...failed, ...syncing]
          .sort(
            (left, right) =>
              eligibleAt(left).localeCompare(eligibleAt(right)) ||
              left.createdAt.localeCompare(right.createdAt) ||
              left.eventId.localeCompare(right.eventId)
          )
          .slice(0, limit);

        await this.database.sync_outbox.bulkPut(
          eligible.map((row) => ({ ...row, status: "syncing" as const, updatedAt: nowIso }))
        );

        const events = await this.database.local_review_events.bulkGet(
          eligible.map((row): [string, string] => [this.userId, row.eventId])
        );
        const result = events.map((event, index) => {
          if (event === undefined) {
            throw new Error(
              `Outbox references missing event ${eligible[index]?.eventId ?? "unknown"}.`
            );
          }
          if (event.userId !== this.userId) {
            throw new Error("Outbox event escaped its account scope.");
          }
          return { ...event, dueAt: eventDueAt(event) };
        });
        return result;
      }
    );
  }

  async applyPushOutcomes(outcomes: PushEventOutcome[], now: Date): Promise<void> {
    this.#assertActive();
    const uniqueIds = new Set(outcomes.map((outcome) => outcome.eventId));
    if (uniqueIds.size !== outcomes.length) {
      throw new Error("Push outcomes repeat an event ID.");
    }
    const nowIso = now.toISOString();
    await this.database.transaction(
      "rw",
      this.database.sync_outbox,
      this.database.local_review_events,
      this.database.daily_summary,
      async () => {
        const changedModules = new Set<DomainModuleSlug>();
        for (const outcome of outcomes) {
          const key: [string, string] = [this.userId, outcome.eventId];
          const row = await this.database.sync_outbox.get(key);
          if (row === undefined) {
            throw new Error(`Push outcome references missing account outbox ${outcome.eventId}.`);
          }
          if (outcome.status === "rejected") {
            const attempts = row.attemptCount + 1;
            await this.database.sync_outbox.put({
              ...row,
              status: "failed",
              attemptCount: attempts,
              nextAttemptAt: retryAt(now, attempts),
              lastError: outcome.reason ?? "cloud rejected event",
              updatedAt: nowIso
            });
            const event = await this.database.local_review_events.get(key);
            if (event !== undefined) {
              await this.database.local_review_events.put({ ...event, syncStatus: "failed" });
            }
          } else {
            await this.database.sync_outbox.delete(key);
            const event = await this.database.local_review_events.get(key);
            if (event !== undefined) {
              await this.database.local_review_events.put({ ...event, syncStatus: "synced" });
            }
            changedModules.add(row.module);
          }
        }
        await this.#refreshPendingCounts(changedModules);
      }
    );
  }

  async markPushFailure(eventIds: string[], message: string, now: Date): Promise<void> {
    this.#assertActive();
    const nowIso = now.toISOString();
    await this.database.transaction(
      "rw",
      this.database.sync_outbox,
      this.database.daily_summary,
      async () => {
        for (const eventId of eventIds) {
          const key: [string, string] = [this.userId, eventId];
          const row = await this.database.sync_outbox.get(key);
          if (row === undefined || row.status === "synced") {
            continue;
          }
          const attempts = row.attemptCount + 1;
          await this.database.sync_outbox.put({
            ...row,
            status: "failed",
            attemptCount: attempts,
            nextAttemptAt: retryAt(now, attempts),
            lastError: message.slice(0, 500),
            updatedAt: nowIso
          });
        }
      }
    );
  }

  async releasePushClaims(eventIds: string[], now: Date): Promise<void> {
    this.#assertActive();
    const nowIso = now.toISOString();
    await this.database.transaction(
      "rw",
      this.database.sync_outbox,
      this.database.daily_summary,
      async () => {
        for (const eventId of eventIds) {
          const key: [string, string] = [this.userId, eventId];
          const row = await this.database.sync_outbox.get(key);
          if (row?.status === "syncing") {
            await this.database.sync_outbox.put({
              ...row,
              status: "pending",
              nextAttemptAt: nowIso,
              updatedAt: nowIso
            });
          }
        }
      }
    );
  }

  async getPullCursor(): Promise<typeof INITIAL_PULL_CURSOR> {
    this.#assertActive();
    const row = await this.database.sync_metadata.get([this.userId, PULL_CURSOR_KEY]);
    return row === undefined ? INITIAL_PULL_CURSOR : cursorFromUnknown(row.value);
  }

  async getPendingConflictCardIds(): Promise<string[]> {
    this.#assertActive();
    const row = await this.database.sync_metadata.get([this.userId, PENDING_CONFLICTS_KEY]);
    return row === undefined ? [] : conflictCardIdsFromUnknown(row.value);
  }

  async mergePullPage(page: CloudPullPage): Promise<void> {
    this.#assertActive();
    await this.database.transaction(
      "rw",
      [
        this.database.local_review_events,
        this.database.local_review_states,
        this.database.sync_outbox,
        this.database.sync_metadata,
        this.database.cached_daily_assignments,
        this.database.cached_daily_review_assignments,
        this.database.learned_word_senses,
        this.database.study_days,
        this.database.daily_summary
      ],
      async () => {
        const affectedSummaries = new Set<string>();
        const currentCursorRow = await this.database.sync_metadata.get([
          this.userId,
          PULL_CURSOR_KEY
        ]);
        const currentCursor = cursorFromUnknown(currentCursorRow?.value);
        const epochChanged = currentCursor.stateEpoch !== page.nextCursor.stateEpoch;
        const locallyPendingCards = epochChanged
          ? await this.#activeOutboxCardIds()
          : await this.#activeOutboxCardIdsFor(page.states.map((state) => state.cardId));
        if (epochChanged) {
          await this.database.local_review_states
            .where("userId")
            .equals(this.userId)
            .filter((state) => !locallyPendingCards.has(state.cardId))
            .delete();
        }
        const pendingConflictRow = await this.database.sync_metadata.get([
          this.userId,
          PENDING_CONFLICTS_KEY
        ]);
        const pendingConflictCardIds = new Set(
          conflictCardIdsFromUnknown(pendingConflictRow?.value)
        );
        for (const cardId of page.conflictedCardIds) {
          pendingConflictCardIds.add(cardId);
        }
        for (const remote of page.events) {
          const key: [string, string] = [this.userId, remote.eventId];
          const existing = await this.database.local_review_events.get(key);
          if (existing === undefined) {
            await this.database.local_review_events.add({
              eventId: remote.eventId,
              presentationActionId: remote.presentationActionId,
              userId: this.userId,
              cardId: remote.cardId,
              wordSenseId: remote.wordSenseId,
              module: remote.module,
              queue: remote.queue,
              studyDate: remote.studyDate,
              rating: remote.rating,
              reviewedAt: remote.reviewedAt,
              timezone: remote.timezone,
              deviceId: remote.deviceId,
              deviceSequence: remote.deviceSequence,
              baseRevision: remote.baseRevision,
              schedulerBefore: remote.schedulerBefore,
              schedulerAfter: remote.schedulerAfter,
              schedulerImplementationVersion: remote.schedulerImplementationVersion,
              syncStatus: "synced",
              createdAt: remote.receivedAt
            });
          } else if (
            existing.cardId !== remote.cardId ||
            existing.rating !== remote.rating ||
            existing.deviceId !== remote.deviceId ||
            existing.deviceSequence !== remote.deviceSequence
          ) {
            throw new Error(`Remote event ${remote.eventId} conflicts with immutable local data.`);
          }

          if (remote.queue === "new") {
            const assignmentKey: [string, DomainModuleSlug, string, string] = [
              this.userId,
              remote.module,
              remote.studyDate,
              remote.cardId
            ];
            const assignment = await this.database.cached_daily_assignments.get(assignmentKey);
            if (assignment !== undefined && assignment.completedAt === null) {
              await this.database.cached_daily_assignments.put({
                ...assignment,
                completedAt: remote.orderingAt
              });
            }
            const learnedKey: [string, DomainModuleSlug, string] = [
              this.userId,
              remote.module,
              remote.wordSenseId
            ];
            if ((await this.database.learned_word_senses.get(learnedKey)) === undefined) {
              await this.database.learned_word_senses.add({
                userId: this.userId,
                module: remote.module,
                wordSenseId: remote.wordSenseId,
                firstCardId: remote.cardId,
                firstEventId: remote.eventId,
                firstLearnedAt: remote.orderingAt
              });
            }
          } else {
            const assignmentKey: [string, DomainModuleSlug, string, string] = [
              this.userId,
              remote.module,
              remote.studyDate,
              remote.cardId
            ];
            const assignment =
              await this.database.cached_daily_review_assignments.get(assignmentKey);
            if (assignment !== undefined && assignment.completedAt === null) {
              await this.database.cached_daily_review_assignments.put({
                ...assignment,
                completedAt: remote.orderingAt
              });
            }
          }

          const studyDayKey: [string, string] = [this.userId, remote.studyDate];
          if ((await this.database.study_days.get(studyDayKey)) === undefined) {
            await this.database.study_days.add({
              userId: this.userId,
              studyDate: remote.studyDate,
              firstEventId: remote.eventId,
              firstStudiedAt: remote.orderingAt
            });
          }
          affectedSummaries.add(`${remote.module}|${remote.studyDate}`);
        }

        for (const state of page.states) {
          if (locallyPendingCards.has(state.cardId)) {
            pendingConflictCardIds.add(state.cardId);
            continue;
          }
          const localState: LocalReviewState = {
            userId: this.userId,
            cardId: state.cardId,
            module: state.module,
            schedulerState: state.schedulerState,
            dueAt: state.dueAt,
            lastReviewedAt: state.lastReviewedAt,
            revision: state.revision,
            schedulerImplementationVersion: state.schedulerImplementationVersion,
            updatedAt: state.updatedAt
          };
          await this.database.local_review_states.put(localState);
        }

        await this.database.sync_metadata.put({
          userId: this.userId,
          key: PULL_CURSOR_KEY,
          value: page.nextCursor,
          updatedAt: new Date().toISOString()
        });
        await this.database.sync_metadata.put({
          userId: this.userId,
          key: PENDING_CONFLICTS_KEY,
          value: [...pendingConflictCardIds].sort(),
          updatedAt: new Date().toISOString()
        });

        for (const summaryKey of affectedSummaries) {
          const separator = summaryKey.indexOf("|");
          const module = summaryKey.slice(0, separator) as DomainModuleSlug;
          const studyDate = summaryKey.slice(separator + 1);
          await this.#rebuildSummary(module, studyDate);
        }
      }
    );
  }

  async applyReconciledState(state: ReconciledReviewState, now: Date): Promise<boolean> {
    this.#assertActive();
    return this.database.transaction(
      "rw",
      this.database.local_review_states,
      this.database.local_review_events,
      this.database.sync_outbox,
      this.database.sync_metadata,
      async () => {
        if (await this.#hasActiveOutboxForCard(state.cardId)) {
          return false;
        }
        await this.database.local_review_states.put({
          userId: this.userId,
          cardId: state.cardId,
          module: state.module,
          schedulerState: state.schedulerState,
          dueAt: state.dueAt,
          lastReviewedAt: state.lastReviewedAt,
          revision: state.revision,
          schedulerImplementationVersion: state.schedulerImplementationVersion,
          updatedAt: now.toISOString()
        });
        const pendingConflictRow = await this.database.sync_metadata.get([
          this.userId,
          PENDING_CONFLICTS_KEY
        ]);
        const pendingConflictCardIds = conflictCardIdsFromUnknown(pendingConflictRow?.value).filter(
          (cardId) => cardId !== state.cardId
        );
        await this.database.sync_metadata.put({
          userId: this.userId,
          key: PENDING_CONFLICTS_KEY,
          value: pendingConflictCardIds,
          updatedAt: now.toISOString()
        });
        return true;
      }
    );
  }

  async getPendingCount(): Promise<number> {
    this.#assertActive();
    return this.#activeOutboxCount();
  }

  dispose(): void {
    this.#disposed = true;
  }

  async #rebuildSummary(module: DomainModuleSlug, studyDate: string): Promise<void> {
    const summaryKey: [string, DomainModuleSlug, string] = [this.userId, module, studyDate];
    const [existing, newAssignments, reviewAssignments, learnedCount, studyDays] =
      await Promise.all([
        this.database.daily_summary.get(summaryKey),
        this.database.cached_daily_assignments
          .where("[userId+module+studyDate]")
          .equals(summaryKey)
          .toArray(),
        this.database.cached_daily_review_assignments
          .where("[userId+module+studyDate]")
          .equals(summaryKey)
          .toArray(),
        this.database.learned_word_senses
          .where("[userId+module]")
          .equals([this.userId, module])
          .count(),
        this.database.study_days.where("userId").equals(this.userId).toArray()
      ]);
    const pendingSyncCount = await this.#activeOutboxCount(module);
    const updatedAt = new Date().toISOString();
    const summary: DailySummaryRow = {
      userId: this.userId,
      module,
      studyDate,
      newCompleted: newAssignments.filter((assignment) => assignment.completedAt !== null).length,
      newTotal: newAssignments.length,
      reviewCompleted: reviewAssignments.filter((assignment) => assignment.completedAt !== null)
        .length,
      reviewTotal: reviewAssignments.length,
      totalLearned: learnedCount,
      streak: calculateStreak(
        studyDays.map((day) => day.studyDate),
        studyDate
      ),
      pendingSyncCount,
      updatedAt: existing?.updatedAt ?? updatedAt
    };
    await this.database.daily_summary.put({ ...summary, updatedAt });
  }

  async #refreshPendingCounts(modules: ReadonlySet<DomainModuleSlug>): Promise<void> {
    if (modules.size === 0) {
      return;
    }
    const summaries = await this.database.daily_summary
      .where("userId")
      .equals(this.userId)
      .toArray();
    const updatedAt = new Date().toISOString();
    for (const module of modules) {
      const pendingSyncCount = await this.#activeOutboxCount(module);
      await this.database.daily_summary.bulkPut(
        summaries
          .filter((summary) => summary.module === module)
          .map((summary) => ({ ...summary, pendingSyncCount, updatedAt }))
      );
    }
  }

  async #activeOutboxCardIds(): Promise<Set<string>> {
    const cardIds = new Set<string>();
    await Promise.all(
      ACTIVE_OUTBOX_STATUSES.map((status) =>
        this.database.sync_outbox
          .where("[userId+status]")
          .equals([this.userId, status])
          .each((row) => cardIds.add(row.cardId))
      )
    );
    return cardIds;
  }

  async #activeOutboxCardIdsFor(cardIds: string[]): Promise<Set<string>> {
    const active = new Set<string>();
    for (const cardId of new Set(cardIds)) {
      if (await this.#hasActiveOutboxForCard(cardId)) {
        active.add(cardId);
      }
    }
    return active;
  }

  async #hasActiveOutboxForCard(cardId: string): Promise<boolean> {
    for (const status of ACTIVE_OUTBOX_STATUSES) {
      const key = await this.database.sync_outbox
        .where("[userId+cardId+status]")
        .equals([this.userId, cardId, status])
        .firstKey();
      if (key !== undefined) {
        return true;
      }
    }
    return false;
  }

  async #activeOutboxCount(module?: DomainModuleSlug): Promise<number> {
    const rows = await Promise.all(
      ACTIVE_OUTBOX_STATUSES.map((status) =>
        module === undefined
          ? this.database.sync_outbox.where("[userId+status]").equals([this.userId, status]).count()
          : this.database.sync_outbox
              .where("[userId+module+status]")
              .equals([this.userId, module, status])
              .count()
      )
    );
    return rows.reduce((total, count) => total + count, 0);
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error("The account-scoped Dexie sync store has been disposed.");
    }
  }
}
