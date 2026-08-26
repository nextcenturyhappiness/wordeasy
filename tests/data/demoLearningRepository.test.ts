import { afterEach, describe, expect, it, vi } from "vitest";

import type { RateCardInput } from "../../src/application/contracts";
import { DemoLearningRepository } from "../../src/data/demoLearningRepository";
import { LearningDatabase } from "../../src/db/learningDatabase";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";
import {
  FIXED_NOW,
  createRepositoryHarness,
  deleteRepositoryHarness,
  type RepositoryHarness
} from "./testHarness";

const harnesses: RepositoryHarness[] = [];

async function harness(
  options?: Parameters<typeof createRepositoryHarness>[0]
): Promise<RepositoryHarness> {
  const value = await createRepositoryHarness(options);
  harnesses.push(value);
  return value;
}

function ratingInput(cardId: string, presentationActionId: string): RateCardInput {
  return {
    presentationActionId,
    cardId,
    module: "research_english",
    queue: "new",
    studyDate: "2026-08-26",
    rating: "good",
    reviewedAt: "2026-08-26T08:05:00.000Z"
  };
}

function requireCard<T>(card: T | undefined): T {
  if (card === undefined) {
    throw new Error("Expected an assigned demo card.");
  }
  return card;
}

afterEach(async () => {
  await Promise.all(harnesses.splice(0).map(deleteRepositoryHarness));
});

describe("DemoLearningRepository", () => {
  it("hydrates normalized Context Cards through a stable Research 5+2+3 assignment", async () => {
    const { repository } = await harness();

    const snapshot = await repository.getStudyQueue("research_english", "new");
    const queue = snapshot.cards;
    const counts = Object.fromEntries(
      ["general_research", "statistics_methodology", "bioinformatics"].map((category) => [
        category,
        queue.filter((card) => card.category === category).length
      ])
    );

    expect(queue).toHaveLength(10);
    expect(snapshot).toMatchObject({
      module: "research_english",
      queue: "new",
      studyDate: "2026-08-26"
    });
    expect(counts).toEqual({
      general_research: 5,
      statistics_methodology: 2,
      bioinformatics: 3
    });
    expect(queue.every((card) => card.contextSentence.includes(card.targetText))).toBe(true);
    expect(queue.every((card) => card.collocations.length >= 3)).toBe(true);
    expect(new Set(queue.map((card) => card.wordSenseId)).size).toBe(10);
  });

  it("commits event, card-bound state, distinct completion, summary, and outbox atomically", async () => {
    const { database, repository, userId } = await harness();
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards[0]);

    const first = await repository.rateCard(ratingInput(card.cardId, "presentation-1"));
    const again = await repository.rateCard({
      ...ratingInput(card.cardId, "presentation-2"),
      rating: "again",
      reviewedAt: "2026-08-26T08:06:00.000Z"
    });

    expect(first.summary.new).toEqual({ completed: 1, total: 10 });
    expect(again.summary.new).toEqual({ completed: 1, total: 10 });
    expect(again.summary.review).toEqual({ completed: 0, total: 0 });
    expect(await database.local_review_events.count()).toBe(2);
    expect(await database.sync_outbox.count()).toBe(2);
    const state = await database.local_review_states.get([userId, card.cardId]);
    expect(state).toMatchObject({ cardId: card.cardId, revision: 2 });
    expect(await database.local_review_states.get([userId, card.lemma])).toBeUndefined();
    const assignment = await database.cached_daily_assignments.get([
      userId,
      "research_english",
      "2026-08-26",
      card.cardId
    ]);
    expect(assignment?.completedAt).toBe("2026-08-26T08:05:00.000Z");
  });

  it("deduplicates simultaneous ratings by presentationActionId", async () => {
    const { database, repository } = await harness();
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards[0]);
    const input = ratingInput(card.cardId, "double-click-action");

    const [first, second] = await Promise.all([
      repository.rateCard(input),
      repository.rateCard(input)
    ]);

    expect(first.eventId).toBe(second.eventId);
    expect(await database.local_review_events.count()).toBe(1);
    expect(await database.sync_outbox.count()).toBe(1);
    expect((await repository.getToday("research_english")).new.completed).toBe(1);
  });

  it("rolls back every rating mutation when the outbox write fails", async () => {
    const { database, repository, syncState, userId } = await harness();
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards[0]);
    const collidingEventId = "20000000-0000-4000-8000-000000000001";
    await database.sync_outbox.add({
      userId,
      eventId: collidingEventId,
      module: "research_english",
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: "2026-08-26T08:00:00.000Z",
      lastError: null,
      createdAt: "2026-08-26T08:00:00.000Z",
      updatedAt: "2026-08-26T08:00:00.000Z"
    });
    const collidingRepository = new DemoLearningRepository({
      database,
      userId,
      email: "test-user-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "device-test-user-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState,
      now: () => new Date(FIXED_NOW),
      eventIdFactory: () => collidingEventId
    });

    await expect(
      collidingRepository.rateCard(ratingInput(card.cardId, "outbox-collision"))
    ).rejects.toBeDefined();

    expect(await database.local_review_events.count()).toBe(0);
    expect(await database.local_review_states.count()).toBe(0);
    expect((await repository.getToday("research_english")).new.completed).toBe(0);
    expect(
      (
        await database.cached_daily_assignments.get([
          userId,
          "research_english",
          "2026-08-26",
          card.cardId
        ])
      )?.completedAt
    ).toBeNull();
    expect((await database.sync_metadata.get([userId, "device-sequence"]))?.value).toMatchObject({
      nextSequence: 0
    });
  });

  it("counts learned words by distinct wordSenseId rather than cardId", async () => {
    const { database, repository, userId } = await harness();
    const [firstValue, secondValue] = (await repository.getStudyQueue("research_english", "new"))
      .cards;
    const first = requireCard(firstValue);
    const second = requireCard(secondValue);
    const secondRow = await database.cached_cards.get([userId, second.cardId]);
    if (secondRow === undefined) {
      throw new Error("Expected the second cached card.");
    }
    await database.cached_cards.put({ ...secondRow, wordSenseId: first.wordSenseId });

    await repository.rateCard(ratingInput(first.cardId, "sense-first"));
    const secondResult = await repository.rateCard(ratingInput(second.cardId, "sense-second-card"));

    expect(secondResult.summary.new.completed).toBe(2);
    expect(secondResult.summary.wordsLearned).toBe(1);
    expect(await database.learned_word_senses.count()).toBe(1);
  });

  it("preserves four ratings, states, summaries, and outbox across a database reopen", async () => {
    const firstHarness = await harness();
    const queue = (await firstHarness.repository.getStudyQueue("research_english", "new")).cards;
    for (const [index, card] of queue.slice(0, 4).entries()) {
      await firstHarness.repository.rateCard(
        ratingInput(card.cardId, `refresh-presentation-${String(index)}`)
      );
    }
    firstHarness.database.close();

    const reopenedDatabase = new LearningDatabase(firstHarness.databaseName);
    const reopenedSync = new LocalSyncStateStore();
    const reopened = new DemoLearningRepository({
      database: reopenedDatabase,
      userId: firstHarness.userId,
      email: "test-user-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "device-test-user-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: reopenedSync,
      now: () => new Date(FIXED_NOW)
    });
    await reopened.initialize();

    expect((await reopened.getToday("research_english")).new).toEqual({ completed: 4, total: 10 });
    expect(await reopenedDatabase.local_review_events.count()).toBe(4);
    expect(await reopenedDatabase.local_review_states.count()).toBe(4);
    expect(await reopenedDatabase.sync_outbox.count()).toBe(4);
    expect(
      (await reopened.getStudyQueue("research_english", "new")).cards.map((card) => card.cardId)
    ).toEqual(queue.slice(4).map((card) => card.cardId));
    reopenedDatabase.close();
  });

  it("keeps Medical progress isolated and reads Home without review-event history", async () => {
    const { database, repository } = await harness();
    const medicalBefore = await repository.getToday("medical_english");
    const card = requireCard((await repository.getStudyQueue("research_english", "new")).cards[0]);
    await repository.rateCard(ratingInput(card.cardId, "module-isolation"));

    const historyRead = vi.spyOn(database.local_review_events, "toArray");
    const historyQuery = vi.spyOn(database.local_review_events, "where");
    const home = await repository.getCachedHome();
    expect(historyRead).not.toHaveBeenCalled();
    expect(historyQuery).not.toHaveBeenCalled();
    expect(home?.modules.research_english.new.completed).toBe(1);
    expect(await repository.getToday("medical_english")).toEqual(medicalBefore);
  });

  it("partitions cached cards, progress, state, and outbox by userId", async () => {
    const databaseName = `wordeasy-shared-account-test-${crypto.randomUUID()}`;
    const accountA = await harness({ databaseName, userId: "account-a" });
    const syncB = new LocalSyncStateStore();
    const databaseB = new LearningDatabase(databaseName);
    const accountB = new DemoLearningRepository({
      database: databaseB,
      userId: "account-b",
      email: "b@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "device-b",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: syncB,
      now: () => new Date(FIXED_NOW)
    });
    await accountB.initialize();
    const cardA = requireCard(
      (await accountA.repository.getStudyQueue("research_english", "new")).cards[0]
    );
    await accountA.repository.rateCard(ratingInput(cardA.cardId, "account-a-action"));

    expect((await accountB.getToday("research_english")).new.completed).toBe(0);
    expect(await databaseB.sync_outbox.where("userId").equals("account-b").count()).toBe(0);
    expect(await databaseB.local_review_states.where("userId").equals("account-b").count()).toBe(0);
    databaseB.close();
  });

  it("freezes an all-or-nothing shortage after the first day consumes all demo cards", async () => {
    const firstDay = await harness();
    firstDay.database.close();
    const nextDayDatabase = new LearningDatabase(firstDay.databaseName);
    const nextDay = new DemoLearningRepository({
      database: nextDayDatabase,
      userId: firstDay.userId,
      email: "test-user-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "device-test-user-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-27T08:00:00.000Z")
    });
    await nextDay.initialize();

    const today = await nextDay.getToday("research_english");
    expect(today.new).toEqual({ completed: 0, total: 0 });
    expect(today.contentShortage).toMatchObject({
      code: "content_shortage",
      category: "general_research",
      required: 5,
      available: 0
    });
    expect((await nextDay.getStudyQueue("research_english", "new")).cards).toEqual([]);
    nextDayDatabase.close();
  });
});
