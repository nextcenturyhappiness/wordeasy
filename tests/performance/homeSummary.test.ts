import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalReviewEventRow, SyncOutboxRow } from "../../src/db/records";
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

function eventRow(userId: string, index: number): LocalReviewEventRow {
  const sequence = index + 1;
  const eventId = `performance-event-${String(sequence).padStart(5, "0")}`;
  return {
    eventId,
    presentationActionId: `performance-action-${String(sequence).padStart(5, "0")}`,
    userId,
    cardId: `performance-card-${String(index % 20).padStart(2, "0")}`,
    wordSenseId: `performance-sense-${String(index % 20).padStart(2, "0")}`,
    module: "research_english",
    queue: "review",
    studyDate: "2026-08-26",
    rating: "good",
    reviewedAt: new Date(Date.UTC(2026, 7, 1, 0, 0, sequence)).toISOString(),
    timezone: "Asia/Shanghai",
    deviceId: "performance-device",
    deviceSequence: sequence,
    baseRevision: index,
    schedulerBefore: { revision: index },
    schedulerAfter: {
      revision: sequence,
      due: new Date(Date.UTC(2026, 7, 2, 0, 0, sequence)).toISOString()
    },
    schedulerImplementationVersion: "performance-fixture",
    syncStatus: "synced",
    createdAt: "2026-08-26T08:00:00.000Z"
  };
}

describe("Home summary performance", () => {
  it("keeps Home and push claims bounded with 10,000 active outbox records", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const rows = Array.from({ length: 10_000 }, (_, index) => eventRow(userId, index));
    const outboxRows: SyncOutboxRow[] = rows.map((event, index) => ({
      userId,
      eventId: event.eventId,
      cardId: event.cardId,
      module: index % 2 === 0 ? "research_english" : "medical_english",
      status: index % 3 === 0 ? "pending" : index % 3 === 1 ? "failed" : "syncing",
      attemptCount: 0,
      nextAttemptAt: "2026-08-26T08:00:00.000Z",
      lastError: null,
      createdAt: event.createdAt,
      updatedAt: index % 3 === 2 ? "2026-08-26T07:58:00.000Z" : event.createdAt
    }));
    await database.local_review_events.bulkAdd(rows);
    await database.sync_outbox.bulkAdd(outboxRows);

    const historyRead = vi.spyOn(database.local_review_events, "toArray");
    const historyQuery = vi.spyOn(database.local_review_events, "where");
    const eventBulkGet = vi.spyOn(database.local_review_events, "bulkGet");
    const outboxWhere = vi.spyOn(database.sync_outbox, "where");
    const outboxBulkPut = vi
      .spyOn(database.sync_outbox, "bulkPut")
      .mockResolvedValue([userId, "bounded-lease-proof"]);
    const syncStore = new DexieAccountSyncStore(database, userId);
    const homeStartedAt = performance.now();
    const home = await repository.getCachedHome();
    const homeElapsedMilliseconds = performance.now() - homeStartedAt;
    const pendingStartedAt = performance.now();
    const pendingCount = await syncStore.getPendingCount();
    const pendingElapsedMilliseconds = performance.now() - pendingStartedAt;
    const claimStartedAt = performance.now();
    const claimed = await syncStore.claimPushBatch(new Date("2026-08-26T08:01:00.000Z"), 100);
    const claimElapsedMilliseconds = performance.now() - claimStartedAt;
    eventBulkGet.mockClear();
    const reconciledWhileActive = await syncStore.applyReconciledState(
      {
        cardId: "performance-card-00",
        module: "research_english",
        schedulerState: { source: "trusted-edge" },
        dueAt: "2026-08-27T08:00:00.000Z",
        lastReviewedAt: "2026-08-26T08:00:00.000Z",
        revision: 10_000,
        schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
        expectedRevision: 9_999,
        eventSetHash: "performance-active-card"
      },
      new Date("2026-08-26T08:01:01.000Z")
    );

    expect(await database.local_review_events.count()).toBe(10_000);
    expect(await database.sync_outbox.count()).toBe(10_000);
    expect(historyRead).not.toHaveBeenCalled();
    expect(historyQuery).not.toHaveBeenCalled();
    expect(outboxWhere.mock.calls.map(([index]) => index)).not.toContain("userId");
    expect(outboxWhere.mock.calls.map(([index]) => index)).toContain(
      "[userId+status+nextAttemptAt+createdAt+eventId]"
    );
    expect(outboxWhere.mock.calls.map(([index]) => index)).toContain("[userId+status+updatedAt]");
    expect(pendingCount).toBe(10_000);
    expect(claimed).toHaveLength(100);
    expect(outboxBulkPut).toHaveBeenCalledTimes(1);
    expect(outboxBulkPut.mock.calls[0]?.[0]).toHaveLength(100);
    expect(outboxBulkPut.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.objectContaining({ status: "syncing" })])
    );
    expect(reconciledWhileActive).toBe(false);
    expect(eventBulkGet).not.toHaveBeenCalled();
    expect(home?.modules.research_english.new).toEqual({ completed: 0, total: 10 });
    expect(homeElapsedMilliseconds).toBeLessThan(100);
    expect(pendingElapsedMilliseconds).toBeLessThan(200);
    expect(claimElapsedMilliseconds).toBeLessThan(350);
  }, 45_000);
});
