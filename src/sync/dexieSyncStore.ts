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
import type { DailySummaryRow, SyncOutboxRow } from "../db/records";
import { INITIAL_PULL_CURSOR, type AccountLocalSyncStore } from "./contracts";

const PULL_CURSOR_KEY = "cloud-pull-cursor-v1";
const SYNCING_LEASE_MS = 120_000;
const MAX_RETRY_DELAY_MS = 300_000;

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

function isActiveOutbox(row: SyncOutboxRow): boolean {
  return row.status === "pending" || row.status === "syncing" || row.status === "failed";
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
  return { receivedAt, eventId };
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
      this.database.daily_summary,
      async () => {
        const eligible = (
          await this.database.sync_outbox.where("userId").equals(this.userId).toArray()
        )
          .filter(
            (row) =>
              ((row.status === "pending" || row.status === "failed") &&
                row.nextAttemptAt <= nowIso) ||
              (row.status === "syncing" && row.updatedAt <= expiredLease)
          )
          .sort(
            (left, right) =>
              left.nextAttemptAt.localeCompare(right.nextAttemptAt) ||
              left.createdAt.localeCompare(right.createdAt) ||
              left.eventId.localeCompare(right.eventId)
          )
          .slice(0, limit);

        for (const row of eligible) {
          await this.database.sync_outbox.put({ ...row, status: "syncing", updatedAt: nowIso });
        }

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
        await this.#refreshPendingCounts();
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
      this.database.daily_summary,
      async () => {
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
          } else {
            await this.database.sync_outbox.put({
              ...row,
              status: "synced",
              lastError: null,
              updatedAt: nowIso
            });
          }
        }
        await this.#refreshPendingCounts();
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
        await this.#refreshPendingCounts();
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
        await this.#refreshPendingCounts();
      }
    );
  }

  async getPullCursor(): Promise<typeof INITIAL_PULL_CURSOR> {
    this.#assertActive();
    const row = await this.database.sync_metadata.get([this.userId, PULL_CURSOR_KEY]);
    return row === undefined ? INITIAL_PULL_CURSOR : cursorFromUnknown(row.value);
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

        const activeOutbox = (
          await this.database.sync_outbox.where("userId").equals(this.userId).toArray()
        ).filter(isActiveOutbox);
        const activeEvents = await this.database.local_review_events.bulkGet(
          activeOutbox.map((row): [string, string] => [this.userId, row.eventId])
        );
        const locallyPendingCards = new Set(
          activeEvents.flatMap((event) => (event === undefined ? [] : [event.cardId]))
        );

        for (const state of page.states) {
          if (locallyPendingCards.has(state.cardId)) {
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

        for (const summaryKey of affectedSummaries) {
          const separator = summaryKey.indexOf("|");
          const module = summaryKey.slice(0, separator) as DomainModuleSlug;
          const studyDate = summaryKey.slice(separator + 1);
          await this.#rebuildSummary(module, studyDate);
        }
        await this.#refreshPendingCounts();
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
      async () => {
        const activeOutbox = (
          await this.database.sync_outbox.where("userId").equals(this.userId).toArray()
        ).filter(isActiveOutbox);
        const activeEvents = await this.database.local_review_events.bulkGet(
          activeOutbox.map((row): [string, string] => [this.userId, row.eventId])
        );
        if (activeEvents.some((event) => event?.cardId === state.cardId)) {
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
        return true;
      }
    );
  }

  async getPendingCount(): Promise<number> {
    this.#assertActive();
    return (await this.database.sync_outbox.where("userId").equals(this.userId).toArray()).filter(
      isActiveOutbox
    ).length;
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
    const pendingSyncCount = (
      await this.database.sync_outbox.where("userId").equals(this.userId).toArray()
    ).filter(isActiveOutbox).length;
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
      streak: calculateStreak(studyDays.map((day) => day.studyDate)),
      pendingSyncCount,
      updatedAt: existing?.updatedAt ?? updatedAt
    };
    await this.database.daily_summary.put({ ...summary, updatedAt });
  }

  async #refreshPendingCounts(): Promise<void> {
    const pendingSyncCount = (
      await this.database.sync_outbox.where("userId").equals(this.userId).toArray()
    ).filter(isActiveOutbox).length;
    const summaries = await this.database.daily_summary
      .where("userId")
      .equals(this.userId)
      .toArray();
    const updatedAt = new Date().toISOString();
    await this.database.daily_summary.bulkPut(
      summaries.map((summary) => ({ ...summary, pendingSyncCount, updatedAt }))
    );
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new Error("The account-scoped Dexie sync store has been disposed.");
    }
  }
}
