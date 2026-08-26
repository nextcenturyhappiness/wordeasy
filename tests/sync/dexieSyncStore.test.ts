import { afterEach, describe, expect, it } from "vitest";

import type { ContextCardView } from "../../src/application/contracts";
import type { CloudPullPage, PushEventOutcome } from "../../src/data/cloud/types";
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
    const card = requireCard(await repository.getStudyQueue("research_english", "new"), 0);
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

    expect((await database.sync_outbox.get([userId, rated.eventId]))?.status).toBe("synced");
    expect(await database.local_review_events.get([userId, rated.eventId])).toEqual(eventBefore);
    expect(await ownStore.getPendingCount()).toBe(0);
  });

  it("preserves partial failures with bounded retry metadata", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const cards = await repository.getStudyQueue("research_english", "new");
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
    expect(accepted?.status).toBe("synced");
    expect(failed).toMatchObject({
      status: "failed",
      attemptCount: 1,
      lastError: "invalid_event"
    });
    expect(failed?.nextAttemptAt).toBe("2026-08-26T08:08:02.000Z");
    expect(await store.getPendingCount()).toBe(1);
  });

  it("merges a remote-device event idempotently and rebuilds local materializations", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const card = requireCard(await repository.getStudyQueue("research_english", "new"), 0);
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
        eventId: "20000000-0000-4000-8000-000000000001"
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
});
