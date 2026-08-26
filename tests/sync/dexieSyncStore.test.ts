import { afterEach, describe, expect, it } from "vitest";

import type { ContextCardView } from "../../src/application/contracts";
import type { CloudPullPage, PushEventOutcome } from "../../src/data/cloud/types";
import { INITIAL_PULL_CURSOR } from "../../src/sync/contracts";
import { DexieAccountSyncStore } from "../../src/sync/dexieSyncStore";
import {
  createRepositoryHarness,
  deleteRepositoryHarness,
  type RepositoryHarness
} from "../data/testHarness";

let activeHarness: RepositoryHarness | null = null;

afterEach(async () => {
  if (activeHarness !== null) {
    await deleteRepositoryHarness(activeHarness);
    activeHarness = null;
  }
});

function outcome(
  eventId: string,
  status: "applied" | "rejected",
  cardId: string
): PushEventOutcome {
  return {
    eventId,
    cardId,
    status,
    applicationStatus: status === "applied" ? "applied" : null,
    canonicalRevision: status === "applied" ? 1 : null,
    reason: status === "rejected" ? "invalid_event" : null,
    clockAnomaly: false
  };
}

function requireCard(cards: ContextCardView[], index: number): ContextCardView {
  const card = cards[index];
  if (card === undefined) {
    throw new Error(`Expected assigned card at index ${String(index)}.`);
  }
  return card;
}

describe("Dexie account sync store", () => {
  it("claims only its account and acknowledges idempotent cloud acceptance outside events", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards, 0);
    const rated = await repository.rateCard({
      presentationActionId: "sync-claim",
      cardId: card.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    const eventBefore = await database.local_review_events.get([userId, rated.eventId]);
    const ownStore = new DexieAccountSyncStore(database, userId);
    const otherStore = new DexieAccountSyncStore(database, "user-b");

    expect(await otherStore.claimPushBatch(new Date("2026-08-26T08:06:00.000Z"), 10)).toEqual([]);
    const claimed = await ownStore.claimPushBatch(new Date("2026-08-26T08:06:00.000Z"), 10);
    expect(claimed).toHaveLength(1);
    expect(claimed[0]).toMatchObject({ userId, eventId: rated.eventId });
    expect(claimed[0]?.dueAt).toBe(eventBefore?.schedulerAfter.due);

    await ownStore.applyPushOutcomes(
      [outcome(rated.eventId, "applied", card.cardId)],
      new Date("2026-08-26T08:07:00.000Z")
    );

    expect(await database.sync_outbox.get([userId, rated.eventId])).toBeUndefined();
    expect(await database.local_review_events.get([userId, rated.eventId])).toEqual({
      ...eventBefore,
      syncStatus: "synced"
    });
    expect(await ownStore.getPendingCount()).toBe(0);
  });

  it("preserves partial failures with bounded retry metadata", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const cards = (await repository.getStudyQueue("research_english", "new")).cards;
    const first = requireCard(cards, 0);
    const second = requireCard(cards, 1);
    const firstResult = await repository.rateCard({
      presentationActionId: "partial-a",
      cardId: first.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    const secondResult = await repository.rateCard({
      presentationActionId: "partial-b",
      cardId: second.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "hard",
      reviewedAt: "2026-08-26T08:06:00.000Z"
    });
    const store = new DexieAccountSyncStore(database, userId);
    await store.claimPushBatch(new Date("2026-08-26T08:07:00.000Z"), 10);
    await store.applyPushOutcomes(
      [
        outcome(firstResult.eventId, "applied", first.cardId),
        outcome(secondResult.eventId, "rejected", second.cardId)
      ],
      new Date("2026-08-26T08:08:00.000Z")
    );

    const accepted = await database.sync_outbox.get([userId, firstResult.eventId]);
    const failed = await database.sync_outbox.get([userId, secondResult.eventId]);
    expect(accepted).toBeUndefined();
    expect(failed).toMatchObject({
      status: "failed",
      attemptCount: 1,
      lastError: "invalid_event"
    });
    expect(failed?.nextAttemptAt).toBe("2026-08-26T08:08:02.000Z");
    expect(await store.getPendingCount()).toBe(1);
  });

  it("claims due and expired rows at exact index boundaries without claiming future rows", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const cards = (await repository.getStudyQueue("research_english", "new")).cards;
    const rated: Array<{ eventId: string; cardId: string }> = [];
    for (let index = 0; index < 6; index += 1) {
      const card = requireCard(cards, index);
      const result = await repository.rateCard({
        presentationActionId: `claim-boundary-${String(index)}`,
        cardId: card.cardId,
        module: "research_english",
        queue: "new",
        studyDate: "2026-08-26",
        rating: "good",
        reviewedAt: `2026-08-26T08:0${String(index)}:00.000Z`
      });
      rated.push({ eventId: result.eventId, cardId: card.cardId });
    }
    const rows = await database.sync_outbox.bulkGet(
      rated.map((item): [string, string] => [userId, item.eventId])
    );
    const nowIso = "2026-08-26T09:00:00.000Z";
    const futureIso = "2026-08-26T09:00:00.001Z";
    const cutoffIso = "2026-08-26T08:58:00.000Z";
    const unexpiredIso = "2026-08-26T08:58:00.001Z";
    const statuses = ["pending", "pending", "failed", "failed", "syncing", "syncing"] as const;
    await database.sync_outbox.bulkPut(
      rows.map((row, index) => {
        if (row === undefined) {
          throw new Error("Expected boundary outbox fixture.");
        }
        return {
          ...row,
          status: statuses[index] ?? "pending",
          nextAttemptAt: index === 1 || index === 3 ? futureIso : nowIso,
          updatedAt: index === 4 ? cutoffIso : index === 5 ? unexpiredIso : cutoffIso
        };
      })
    );
    const store = new DexieAccountSyncStore(database, userId);

    const claimed = await store.claimPushBatch(new Date(nowIso), 10);

    expect(new Set(claimed.map((event) => event.eventId))).toEqual(
      new Set([rated[0]?.eventId, rated[2]?.eventId, rated[4]?.eventId])
    );
  });

  it("merges a remote-device event idempotently and rebuilds local materializations", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards, 0);
    const page: CloudPullPage = {
      events: [
        {
          eventId: "20000000-0000-4000-8000-000000000001",
          cardId: card.cardId,
          wordSenseId: card.wordSenseId,
          module: "research_english",
          presentationActionId: "remote-action-a",
          queue: "new",
          studyDate: "2026-08-26",
          timezone: "Asia/Shanghai",
          rating: "good",
          reviewedAt: "2026-08-26T08:05:00.000Z",
          receivedAt: "2026-08-26T08:05:01.000Z",
          orderingAt: "2026-08-26T08:05:00.000Z",
          clockAnomaly: false,
          deviceId: "device-b",
          deviceSequence: 1,
          baseRevision: 0,
          schedulerBefore: {},
          schedulerAfter: { due: "2026-08-27T08:05:00.000Z" },
          dueAt: "2026-08-27T08:05:00.000Z",
          schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
          applicationStatus: "applied",
          canonicalRevision: 1,
          conflictReason: null
        }
      ],
      states: [
        {
          cardId: card.cardId,
          module: "research_english",
          schedulerState: { due: "2026-08-27T08:05:00.000Z" },
          dueAt: "2026-08-27T08:05:00.000Z",
          lastReviewedAt: "2026-08-26T08:05:00.000Z",
          revision: 1,
          schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
          canonicalEventSetHash: null,
          updatedAt: "2026-08-26T08:05:01.000Z"
        }
      ],
      conflictedCardIds: [],
      nextCursor: {
        receivedAt: "2026-08-26T08:05:01.000Z",
        eventId: "20000000-0000-4000-8000-000000000001",
        stateSequence: 1,
        stateEpoch: "trusted-review-state-v1"
      },
      hasMore: false
    };
    const store = new DexieAccountSyncStore(database, userId);

    await store.mergePullPage(page);
    await store.mergePullPage(page);

    expect(await database.local_review_events.count()).toBe(1);
    expect(
      (
        await database.cached_daily_assignments.get([
          userId,
          "research_english",
          "2026-08-26",
          card.cardId
        ])
      )?.completedAt
    ).toBe("2026-08-26T08:05:00.000Z");
    expect(
      await database.daily_summary.get([userId, "research_english", "2026-08-26"])
    ).toMatchObject({ newCompleted: 1, newTotal: 10, totalLearned: 1, streak: 1 });
    expect((await database.local_review_states.get([userId, card.cardId]))?.revision).toBe(1);
    expect(await store.getPullCursor()).toEqual(page.nextCursor);
  });

  it("keeps pending summaries module-scoped and never double-counts Home pending", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const research = requireCard(
      (await repository.getStudyQueue("research_english", "new")).cards,
      0
    );
    const medical = requireCard(
      (await repository.getStudyQueue("medical_english", "new")).cards,
      0
    );
    const researchResult = await repository.rateCard({
      presentationActionId: "module-pending-research",
      cardId: research.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    const medicalResult = await repository.rateCard({
      presentationActionId: "module-pending-medical",
      cardId: medical.cardId,
      module: "medical_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:06:00.000Z"
    });
    const store = new DexieAccountSyncStore(database, userId);
    await store.claimPushBatch(new Date("2026-08-26T08:07:00.000Z"), 10);
    await store.applyPushOutcomes(
      [
        outcome(researchResult.eventId, "applied", research.cardId),
        outcome(medicalResult.eventId, "rejected", medical.cardId)
      ],
      new Date("2026-08-26T08:08:00.000Z")
    );

    expect(
      await database.daily_summary.get([userId, "research_english", "2026-08-26"])
    ).toMatchObject({ pendingSyncCount: 0 });
    expect(
      await database.daily_summary.get([userId, "medical_english", "2026-08-26"])
    ).toMatchObject({ pendingSyncCount: 1 });
    expect((await repository.getCachedHome())?.pendingSyncCount).toBe(1);
  });

  it("pulls canonical state independently after an event-only cursor and clears the old epoch", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const cards = (await repository.getStudyQueue("research_english", "new")).cards;
    const updatedCard = requireCard(cards, 0);
    const rejectedOnlyCard = requireCard(cards, 1);
    const legacyEventCursor = {
      receivedAt: "2026-08-26T08:05:01.000Z",
      eventId: "20000000-0000-4000-8000-000000000008"
    };
    await database.local_review_states.bulkPut(
      [updatedCard, rejectedOnlyCard].map((card) => ({
        userId,
        cardId: card.cardId,
        module: "research_english" as const,
        schedulerState: { source: "legacy-browser" },
        dueAt: "2026-08-27T08:00:00.000Z",
        lastReviewedAt: "2026-08-26T08:00:00.000Z",
        revision: 1,
        schedulerImplementationVersion: "legacy-browser-v1",
        updatedAt: "2026-08-26T08:00:00.000Z"
      }))
    );
    await database.sync_metadata.put({
      userId,
      key: "cloud-pull-cursor-v1",
      value: legacyEventCursor,
      updatedAt: "2026-08-26T08:05:01.000Z"
    });
    const store = new DexieAccountSyncStore(database, userId);

    expect(await store.getPullCursor()).toEqual({
      ...legacyEventCursor,
      stateSequence: 0,
      stateEpoch: ""
    });
    await store.mergePullPage({
      events: [],
      states: [
        {
          cardId: updatedCard.cardId,
          module: "research_english",
          schedulerState: { source: "trusted-edge" },
          dueAt: "2026-08-28T08:00:00.000Z",
          lastReviewedAt: "2026-08-26T09:00:00.000Z",
          revision: 2,
          schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
          canonicalEventSetHash: "trusted-hash",
          updatedAt: "2026-08-26T09:00:01.000Z"
        }
      ],
      conflictedCardIds: [],
      nextCursor: {
        ...legacyEventCursor,
        stateSequence: 42,
        stateEpoch: "trusted-review-state-v1"
      },
      hasMore: false
    });

    expect(await database.local_review_states.get([userId, updatedCard.cardId])).toMatchObject({
      revision: 2,
      schedulerState: { source: "trusted-edge" }
    });
    expect(
      await database.local_review_states.get([userId, rejectedOnlyCard.cardId])
    ).toBeUndefined();
    expect(await store.getPullCursor()).toEqual({
      ...legacyEventCursor,
      stateSequence: 42,
      stateEpoch: "trusted-review-state-v1"
    });
  });

  it("preserves tentative states for active outbox cards during an epoch reset", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const cards = (await repository.getStudyQueue("research_english", "new")).cards;
    const pendingCard = requireCard(cards, 0);
    const staleCloudOnlyCard = requireCard(cards, 1);
    await repository.rateCard({
      presentationActionId: "epoch-pending-card",
      cardId: pendingCard.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    await database.local_review_states.put({
      userId,
      cardId: staleCloudOnlyCard.cardId,
      module: "research_english",
      schedulerState: { source: "legacy-browser" },
      dueAt: "2026-08-27T08:00:00.000Z",
      lastReviewedAt: "2026-08-26T08:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "legacy-browser-v1",
      updatedAt: "2026-08-26T08:00:00.000Z"
    });
    const store = new DexieAccountSyncStore(database, userId);

    await store.mergePullPage({
      events: [],
      states: [],
      conflictedCardIds: [],
      nextCursor: {
        ...INITIAL_PULL_CURSOR,
        stateEpoch: "trusted-review-state-v1"
      },
      hasMore: false
    });

    expect(await database.local_review_states.get([userId, pendingCard.cardId])).toBeDefined();
    expect(
      await database.local_review_states.get([userId, staleCloudOnlyCard.cardId])
    ).toBeUndefined();
  });

  it("durably reconciles a canonical state skipped behind an active outbox cursor", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards, 0);
    const rated = await repository.rateCard({
      presentationActionId: "cursor-pending-card",
      cardId: card.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    await database.sync_metadata.put({
      userId,
      key: "cloud-pull-cursor-v1",
      value: {
        ...INITIAL_PULL_CURSOR,
        stateEpoch: "trusted-review-state-v1"
      },
      updatedAt: "2026-08-26T08:05:01.000Z"
    });
    const storeBeforeRestart = new DexieAccountSyncStore(database, userId);
    const advancedCursor = {
      ...INITIAL_PULL_CURSOR,
      stateSequence: 12,
      stateEpoch: "trusted-review-state-v1"
    };

    await storeBeforeRestart.mergePullPage({
      events: [],
      states: [
        {
          cardId: card.cardId,
          module: "research_english",
          schedulerState: { source: "trusted-other-device" },
          dueAt: "2026-08-29T08:00:00.000Z",
          lastReviewedAt: "2026-08-26T09:00:00.000Z",
          revision: 2,
          schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
          canonicalEventSetHash: "trusted-other-device-hash",
          updatedAt: "2026-08-26T09:00:01.000Z"
        }
      ],
      conflictedCardIds: [],
      nextCursor: advancedCursor,
      hasMore: false
    });

    expect(await storeBeforeRestart.getPullCursor()).toEqual(advancedCursor);
    expect(await storeBeforeRestart.getPendingConflictCardIds()).toEqual([card.cardId]);
    expect(
      (await database.local_review_states.get([userId, card.cardId]))?.schedulerState
    ).not.toEqual({ source: "trusted-other-device" });

    await storeBeforeRestart.claimPushBatch(new Date("2026-08-26T09:01:00.000Z"), 10);
    await storeBeforeRestart.applyPushOutcomes(
      [
        {
          eventId: rated.eventId,
          cardId: card.cardId,
          status: "duplicate",
          applicationStatus: "reconciled",
          canonicalRevision: 2,
          reason: null,
          clockAnomaly: false
        }
      ],
      new Date("2026-08-26T09:01:01.000Z")
    );

    const storeAfterRestart = new DexieAccountSyncStore(database, userId);
    expect(await storeAfterRestart.getPendingConflictCardIds()).toEqual([card.cardId]);
    await expect(
      storeAfterRestart.applyReconciledState(
        {
          cardId: card.cardId,
          module: "research_english",
          schedulerState: { source: "trusted-other-device" },
          dueAt: "2026-08-29T08:00:00.000Z",
          lastReviewedAt: "2026-08-26T09:00:00.000Z",
          revision: 2,
          schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
          expectedRevision: 2,
          eventSetHash: "trusted-other-device-hash"
        },
        new Date("2026-08-26T09:01:02.000Z")
      )
    ).resolves.toBe(true);
    expect(await storeAfterRestart.getPendingConflictCardIds()).toEqual([]);
    expect(await database.local_review_states.get([userId, card.cardId])).toMatchObject({
      revision: 2,
      schedulerState: { source: "trusted-other-device" }
    });
  });

  it("persists unresolved conflict work before advancing the event cursor", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards, 0);
    const cursor = {
      receivedAt: "2026-08-26T08:05:01.000Z",
      eventId: "20000000-0000-4000-8000-000000000009",
      stateSequence: 0,
      stateEpoch: "trusted-review-state-v1"
    };
    const storeBeforeCrash = new DexieAccountSyncStore(database, userId);

    await storeBeforeCrash.mergePullPage({
      events: [],
      states: [],
      conflictedCardIds: [card.cardId],
      nextCursor: cursor,
      hasMore: false
    });

    const storeAfterRestart = new DexieAccountSyncStore(database, userId);
    expect(await storeAfterRestart.getPullCursor()).toEqual(cursor);
    expect(await storeAfterRestart.getPendingConflictCardIds()).toEqual([card.cardId]);

    await storeAfterRestart.applyReconciledState(
      {
        cardId: card.cardId,
        module: "research_english",
        schedulerState: { trusted: true },
        dueAt: "2026-08-27T08:05:00.000Z",
        lastReviewedAt: "2026-08-26T08:05:00.000Z",
        revision: 2,
        schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
        expectedRevision: 1,
        eventSetHash: "trusted-hash"
      },
      new Date("2026-08-26T08:06:00.000Z")
    );
    expect(await storeAfterRestart.getPendingConflictCardIds()).toEqual([]);
  });
});
