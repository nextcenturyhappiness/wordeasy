import { afterEach, describe, expect, it, vi } from "vitest";

import type { LocalReviewEventRow } from "../../src/db/records";
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
    schedulerAfter: { revision: sequence },
    schedulerImplementationVersion: "performance-fixture",
    syncStatus: "synced",
    createdAt: "2026-08-26T08:00:00.000Z"
  };
}

describe("Home summary performance", () => {
  it("reads the materialized summary without scanning 10,000 review events", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, userId } = activeHarness;
    const rows = Array.from({ length: 10_000 }, (_, index) => eventRow(userId, index));
    await database.local_review_events.bulkAdd(rows);

    const historyRead = vi.spyOn(database.local_review_events, "toArray");
    const historyQuery = vi.spyOn(database.local_review_events, "where");
    const startedAt = performance.now();
    const home = await repository.getCachedHome();
    const elapsedMilliseconds = performance.now() - startedAt;

    expect(await database.local_review_events.count()).toBe(10_000);
    expect(historyRead).not.toHaveBeenCalled();
    expect(historyQuery).not.toHaveBeenCalled();
    expect(home?.modules.research_english.new).toEqual({ completed: 0, total: 10 });
    expect(elapsedMilliseconds).toBeLessThan(100);
  });
});
