import { afterEach, describe, expect, it } from "vitest";

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

describe("local immutable event and outbox", () => {
  it("stores complete event evidence and keeps retry state outside the event", async () => {
    activeHarness = await createRepositoryHarness();
    const { database, repository, syncState, userId } = activeHarness;
    const card = (await repository.getStudyQueue("research_english", "new"))[0];
    if (card === undefined) {
      throw new Error("Expected an assigned demo card.");
    }
    const result = await repository.rateCard({
      presentationActionId: "outbox-action",
      cardId: card.cardId,
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:05:00.000Z"
    });
    const eventKey: [string, string] = [userId, result.eventId];
    const eventBeforeRetry = await database.local_review_events.get(eventKey);

    expect(eventBeforeRetry).toMatchObject({
      eventId: result.eventId,
      userId,
      cardId: card.cardId,
      module: "research_english",
      rating: "good",
      deviceId: `device-${userId}`,
      deviceSequence: 1,
      baseRevision: 0,
      syncStatus: "pending"
    });
    expect(eventBeforeRetry?.schedulerBefore).toBeDefined();
    expect(eventBeforeRetry?.schedulerAfter).toBeDefined();
    expect(syncState.getState()).toEqual({ status: "pending", pendingCount: 1 });

    const outbox = await database.sync_outbox.get(eventKey);
    expect(outbox).toMatchObject({ status: "pending", attemptCount: 0, lastError: null });
    if (outbox === undefined) {
      throw new Error("Expected a pending outbox record.");
    }
    await database.sync_outbox.put({
      ...outbox,
      status: "failed",
      attemptCount: 1,
      lastError: "offline",
      updatedAt: "2026-08-26T08:06:00.000Z"
    });

    expect(await database.local_review_events.get(eventKey)).toEqual(eventBeforeRetry);
    expect((await database.sync_outbox.get(eventKey))?.status).toBe("failed");
  });
});
