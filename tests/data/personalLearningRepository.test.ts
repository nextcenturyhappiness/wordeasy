import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  RateCardInput,
  ReviewRating,
  ReviewResult,
  ReviewScheduler,
  SchedulerCard
} from "../../src/application/contracts";
import { LocalAssignmentService } from "../../src/data/localAssignmentService";
import { PersonalLearningRepository } from "../../src/data/personalLearningRepository";
import { STANDALONE_CARDS } from "../../src/data/standalone/standaloneCards";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";

const USER_ID = "personal-test-user";
const EMAIL = "personal-test-user@example.invalid";
const TIMEZONE = "Asia/Shanghai";
const DAY_ONE_NOW = new Date("2026-08-26T08:00:00.000Z");
const DAY_TWO_NOW = new Date("2026-08-27T08:00:00.000Z");
const DAY_ONE = "2026-08-26";
const DAY_TWO = "2026-08-27";

class DeterministicScheduler implements ReviewScheduler {
  readonly implementationVersion = "deterministic-personal-test-v1";

  preview(): never {
    throw new Error("Preview is not used by repository regression tests.");
  }

  rate(card: SchedulerCard, rating: ReviewRating, now: Date): ReviewResult {
    const reviews = typeof card.state.reviews === "number" ? card.state.reviews : 0;
    return {
      stateBefore: card.state,
      stateAfter: { reviews: reviews + 1, lastRating: rating },
      dueAt: new Date(now.getTime() + (rating === "again" ? 60_000 : 86_400_000)).toISOString()
    };
  }
}

interface PersonalHarness {
  databaseName: string;
  database: LearningDatabase;
  repository: PersonalLearningRepository;
  loadCards: ReturnType<typeof vi.fn<() => Promise<typeof STANDALONE_CARDS>>>;
  loadScheduler: ReturnType<typeof vi.fn<() => Promise<ReviewScheduler>>>;
}

const databaseNames = new Set<string>();
const databases = new Set<LearningDatabase>();
let eventSequence = 0;

function trackDatabase(databaseName: string, database: LearningDatabase): LearningDatabase {
  databaseNames.add(databaseName);
  databases.add(database);
  return database;
}

async function createHarness(options?: {
  databaseName?: string;
  now?: () => Date;
  loadCards?: () => Promise<typeof STANDALONE_CARDS>;
  loadScheduler?: () => Promise<ReviewScheduler>;
}): Promise<PersonalHarness> {
  const databaseName = options?.databaseName ?? `wordeasy-personal-${crypto.randomUUID()}`;
  const database = trackDatabase(databaseName, new LearningDatabase(databaseName));
  const loadCards = vi.fn(options?.loadCards ?? (async () => Promise.resolve(STANDALONE_CARDS)));
  const loadScheduler = vi.fn(
    options?.loadScheduler ?? (async () => Promise.resolve(new DeterministicScheduler()))
  );
  const repository = new PersonalLearningRepository({
    database,
    userId: USER_ID,
    email: EMAIL,
    timezone: TIMEZONE,
    deviceId: "personal-test-device",
    scheduler: loadScheduler,
    syncState: new LocalSyncStateStore(),
    loadCards,
    now: options?.now ?? (() => new Date(DAY_ONE_NOW)),
    eventIdFactory: () => {
      eventSequence += 1;
      return `30000000-0000-4000-8000-${eventSequence.toString().padStart(12, "0")}`;
    }
  });
  await repository.initialize();
  return { databaseName, database, repository, loadCards, loadScheduler };
}

function ratingInput(options: {
  cardId: string;
  actionId: string;
  queue?: RateCardInput["queue"];
  module?: RateCardInput["module"];
  studyDate?: string;
  rating?: RateCardInput["rating"];
  reviewedAt?: string;
}): RateCardInput {
  return {
    presentationActionId: options.actionId,
    cardId: options.cardId,
    module: options.module ?? "research_english",
    queue: options.queue ?? "new",
    studyDate: options.studyDate ?? DAY_ONE,
    rating: options.rating ?? "good",
    reviewedAt: options.reviewedAt ?? "2026-08-26T08:05:00.000Z"
  };
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

afterEach(async () => {
  for (const database of databases) {
    database.close();
  }
  databases.clear();
  await Promise.all([...databaseNames].map((databaseName) => Dexie.delete(databaseName)));
  databaseNames.clear();
});

describe("PersonalLearningRepository", () => {
  it("initializes Home summaries without loading the card catalog or scheduler", async () => {
    const { database, repository, loadCards, loadScheduler } = await createHarness();

    expect(loadCards).not.toHaveBeenCalled();
    expect(loadScheduler).not.toHaveBeenCalled();
    expect(await database.cached_cards.count()).toBe(0);
    expect(await repository.getCachedHome()).toMatchObject({
      studyDate: DAY_ONE,
      modules: {
        research_english: { new: { completed: 0, total: 10 }, review: { completed: 0, total: 0 } },
        medical_english: { new: { completed: 0, total: 10 }, review: { completed: 0, total: 0 } }
      }
    });
    expect(loadCards).not.toHaveBeenCalled();
    expect(loadScheduler).not.toHaveBeenCalled();
  });

  it("loads all 60 cards only on first Study access and freezes a stable 5+2+3 queue", async () => {
    const { database, repository, loadCards, loadScheduler } = await createHarness();

    const first = await repository.getStudyQueue("research_english", "new");
    const second = await repository.getStudyQueue("research_english", "new");
    const categories = Object.fromEntries(
      ["general_research", "statistics_methodology", "bioinformatics"].map((category) => [
        category,
        first.cards.filter((card) => card.category === category).length
      ])
    );

    expect(loadCards).toHaveBeenCalledTimes(1);
    expect(loadScheduler).not.toHaveBeenCalled();
    expect(await database.cached_cards.count()).toBe(60);
    expect(first.cards).toHaveLength(10);
    expect(second.cards.map((card) => card.cardId)).toEqual(first.cards.map((card) => card.cardId));
    expect(categories).toEqual({
      general_research: 5,
      statistics_methodology: 2,
      bioinformatics: 3
    });
  });

  it("retries a failed catalog load in the same running repository", async () => {
    let attempt = 0;
    const { repository, loadCards } = await createHarness({
      loadCards: () => {
        attempt += 1;
        if (attempt === 1) {
          return Promise.reject(new Error("transient catalog load failure"));
        }
        return Promise.resolve(STANDALONE_CARDS);
      }
    });

    await expect(repository.getStudyQueue("research_english", "new")).rejects.toThrow(
      "transient catalog load failure"
    );
    const recovered = await repository.getStudyQueue("research_english", "new");
    expect(recovered.cards).toHaveLength(10);
    expect(recovered.cards.every((card) => card.module === "research_english")).toBe(true);
    expect(loadCards).toHaveBeenCalledTimes(2);
  });

  it("replaces stale cached catalog rows before assigning formal cards", async () => {
    const { database, repository } = await createHarness();
    const template = requireValue(
      STANDALONE_CARDS.find((card) => card.sense.module === "research_english"),
      "Expected a Research catalog card."
    );
    await database.cached_cards.put({
      userId: USER_ID,
      cardId: "stale-card",
      wordId: template.word.id,
      wordSenseId: template.sense.id,
      contextId: template.context.id,
      module: template.sense.module,
      category: template.sense.category,
      lemma: template.word.lemma,
      displayForm: template.word.displayForm,
      partOfSpeech: template.word.partOfSpeech,
      ipa: template.word.ipa,
      meaningEn: template.sense.meaningEn,
      meaningZh: template.sense.meaningZh,
      usageNote: template.sense.usageNote,
      contextSentence: template.context.contextSentence,
      targetText: template.context.targetText,
      plainEnglishParaphrase: template.context.plainEnglishParaphrase,
      sentenceTranslationZh: template.context.sentenceTranslationZh,
      collocations: [...template.context.collocations],
      sourceType: template.context.source.type,
      sourceTitle: template.context.source.title,
      sourceUrl: template.context.source.url,
      doi: template.context.source.doi,
      pmid: template.context.source.pmid,
      cachedAt: DAY_ONE_NOW.toISOString()
    });

    await repository.getStudyQueue("research_english", "new");

    expect(await database.cached_cards.count()).toBe(60);
    expect(await database.cached_cards.get([USER_ID, "stale-card"])).toBeUndefined();
  });

  it("loads the scheduler on first rating, never while merely opening Study", async () => {
    const { repository, loadScheduler } = await createHarness();
    const card = requireValue(
      (await repository.getStudyQueue("research_english", "new")).cards[0],
      "Expected a Research assignment."
    );

    expect(loadScheduler).not.toHaveBeenCalled();
    await repository.rateCard(ratingInput({ cardId: card.cardId, actionId: "first-rating" }));
    await repository.rateCard(
      ratingInput({
        cardId: card.cardId,
        actionId: "second-rating",
        rating: "again",
        reviewedAt: "2026-08-26T08:06:00.000Z"
      })
    );

    expect(loadScheduler).toHaveBeenCalledTimes(1);
  });

  it("materializes a due Review after reopening on the next day without reloading the JS catalog", async () => {
    const first = await createHarness();
    const card = requireValue(
      (await first.repository.getStudyQueue("research_english", "new")).cards[0],
      "Expected a Research assignment."
    );
    await first.repository.rateCard(ratingInput({ cardId: card.cardId, actionId: "day-one-new" }));
    first.database.close();

    const second = await createHarness({
      databaseName: first.databaseName,
      now: () => new Date(DAY_TWO_NOW),
      loadCards: () =>
        Promise.reject(new Error("A complete IndexedDB catalog must not reload the JS catalog."))
    });
    const review = await second.repository.getStudyQueue("research_english", "review");

    expect(second.loadCards).not.toHaveBeenCalled();
    expect(second.loadScheduler).not.toHaveBeenCalled();
    expect(review.cards.map((value) => value.cardId)).toEqual([card.cardId]);
    expect((await second.repository.getToday("research_english")).review).toEqual({
      completed: 0,
      total: 1
    });
    expect((await second.repository.getToday("medical_english")).review).toEqual({
      completed: 0,
      total: 0
    });
  });

  it("keeps a same-day zero Review set frozen after a newly due state appears", async () => {
    const { database, repository } = await createHarness();
    const assigned = await repository.getStudyQueue("research_english", "new");
    const assignedIds = new Set(assigned.cards.map((card) => card.cardId));
    const unassigned = requireValue(
      STANDALONE_CARDS.find(
        (card) => card.sense.module === "research_english" && !assignedIds.has(card.card.id)
      ),
      "Expected an unassigned Research card."
    );
    await database.local_review_states.put({
      userId: USER_ID,
      cardId: unassigned.card.id,
      module: "research_english",
      schedulerState: { injected: true },
      dueAt: "2026-08-26T07:59:00.000Z",
      lastReviewedAt: "2026-08-25T08:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "legacy-test",
      updatedAt: "2026-08-26T08:00:00.000Z"
    });

    expect((await repository.getStudyQueue("research_english", "review")).cards).toEqual([]);
    expect((await repository.getToday("research_english")).review).toEqual({
      completed: 0,
      total: 0
    });
    expect(
      await database.cached_assignment_sets.get([USER_ID, "research_english", DAY_ONE, "review"])
    ).toMatchObject({ status: "ready" });
  });

  it("counts a Review card once even when Again is submitted repeatedly", async () => {
    const first = await createHarness();
    const card = requireValue(
      (await first.repository.getStudyQueue("research_english", "new")).cards[0],
      "Expected a Research assignment."
    );
    await first.repository.rateCard(ratingInput({ cardId: card.cardId, actionId: "learn-card" }));
    first.database.close();
    const second = await createHarness({
      databaseName: first.databaseName,
      now: () => new Date(DAY_TWO_NOW)
    });
    const reviewCard = requireValue(
      (await second.repository.getStudyQueue("research_english", "review")).cards[0],
      "Expected a due Review assignment."
    );

    const firstAgain = await second.repository.rateCard(
      ratingInput({
        cardId: reviewCard.cardId,
        actionId: "review-again-1",
        queue: "review",
        studyDate: DAY_TWO,
        rating: "again",
        reviewedAt: "2026-08-27T08:05:00.000Z"
      })
    );
    const secondAgain = await second.repository.rateCard(
      ratingInput({
        cardId: reviewCard.cardId,
        actionId: "review-again-2",
        queue: "review",
        studyDate: DAY_TWO,
        rating: "again",
        reviewedAt: "2026-08-27T08:06:00.000Z"
      })
    );

    expect(firstAgain.summary.review).toEqual({ completed: 1, total: 1 });
    expect(secondAgain.summary.review).toEqual({ completed: 1, total: 1 });
    expect((await second.repository.getToday("research_english")).review).toEqual({
      completed: 1,
      total: 1
    });
  });

  it("isolates new and Review progress between Research and Medical", async () => {
    const first = await createHarness();
    const researchCard = requireValue(
      (await first.repository.getStudyQueue("research_english", "new")).cards[0],
      "Expected a Research assignment."
    );
    await first.repository.rateCard(
      ratingInput({ cardId: researchCard.cardId, actionId: "research-only" })
    );

    expect((await first.repository.getToday("research_english")).new.completed).toBe(1);
    expect((await first.repository.getToday("medical_english")).new.completed).toBe(0);
    first.database.close();
    const second = await createHarness({
      databaseName: first.databaseName,
      now: () => new Date(DAY_TWO_NOW)
    });

    expect((await second.repository.getToday("research_english")).review.total).toBe(1);
    expect((await second.repository.getToday("medical_english")).review.total).toBe(0);
  });

  it("rolls Home forward after local midnight without restarting the app", async () => {
    let currentNow = new Date(DAY_ONE_NOW);
    const { repository, loadCards, loadScheduler } = await createHarness({
      now: () => new Date(currentNow)
    });
    expect((await repository.getCachedHome())?.studyDate).toBe(DAY_ONE);

    currentNow = new Date(DAY_TWO_NOW);
    const nextHome = await repository.getCachedHome();

    expect(nextHome).toMatchObject({
      studyDate: DAY_TWO,
      modules: {
        research_english: { new: { completed: 0, total: 10 } },
        medical_english: { new: { completed: 0, total: 10 } }
      }
    });
    expect(loadCards).not.toHaveBeenCalled();
    expect(loadScheduler).not.toHaveBeenCalled();
  });

  it("migrates a legacy empty Review set once and preserves its rebuilt queue on reopen", async () => {
    const first = await createHarness();
    const priorAssignment = requireValue(
      (await first.repository.getStudyQueue("research_english", "new")).cards[0],
      "Expected a prior-day Research assignment."
    );
    await first.database.local_review_states.put({
      userId: USER_ID,
      cardId: priorAssignment.cardId,
      module: "research_english",
      schedulerState: { legacy: true },
      dueAt: "2026-08-27T07:00:00.000Z",
      lastReviewedAt: "2026-08-26T08:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "legacy-test",
      updatedAt: "2026-08-26T08:00:00.000Z"
    });
    await first.database.cached_assignment_sets.put({
      userId: USER_ID,
      module: "research_english",
      studyDate: DAY_TWO,
      queue: "review",
      status: "ready",
      shortage: null,
      createdAt: "2026-08-27T00:00:00.000Z"
    });
    await first.database.sync_metadata.delete([USER_ID, "personal-review-queues-v1"]);
    first.database.close();

    const migrated = await createHarness({
      databaseName: first.databaseName,
      now: () => new Date(DAY_TWO_NOW),
      loadCards: () =>
        Promise.reject(new Error("Migration must use the complete IndexedDB catalog."))
    });
    expect(
      (await migrated.repository.getStudyQueue("research_english", "review")).cards.map(
        (card) => card.cardId
      )
    ).toEqual([priorAssignment.cardId]);
    expect(
      await migrated.database.sync_metadata.get([USER_ID, "personal-review-queues-v1"])
    ).toBeDefined();
    migrated.database.close();

    const reopened = await createHarness({
      databaseName: first.databaseName,
      now: () => new Date(DAY_TWO_NOW),
      loadCards: () => Promise.reject(new Error("Reopen must use the complete IndexedDB catalog."))
    });
    expect(
      (await reopened.repository.getStudyQueue("research_english", "review")).cards.map(
        (card) => card.cardId
      )
    ).toEqual([priorAssignment.cardId]);
    expect(reopened.loadCards).not.toHaveBeenCalled();
  });
});

describe("LocalAssignmentService due-day boundaries", () => {
  it("uses America/New_York local midnights across the spring DST transition", async () => {
    const databaseName = `wordeasy-personal-dst-${crypto.randomUUID()}`;
    const database = trackDatabase(databaseName, new LearningDatabase(databaseName));
    await openLearningDatabase(database);
    const service = new LocalAssignmentService(database, USER_ID);
    const state = (cardId: string, dueAt: string) => ({
      userId: USER_ID,
      cardId,
      module: "research_english" as const,
      schedulerState: {},
      dueAt,
      lastReviewedAt: "2026-03-01T12:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "dst-test",
      updatedAt: "2026-03-01T12:00:00.000Z"
    });
    await database.local_review_states.bulkAdd([
      state("before-spring-midnight", "2026-03-08T04:59:59.999Z"),
      state("at-spring-midnight", "2026-03-08T05:00:00.000Z"),
      state("at-post-dst-midnight", "2026-03-09T04:00:00.000Z")
    ]);

    expect(
      (
        await service.ensureDueReviewSet(
          "research_english",
          "2026-03-07",
          "America/New_York",
          "2026-03-07T12:00:00.000Z"
        )
      ).map((assignment) => assignment.cardId)
    ).toEqual(["before-spring-midnight"]);
    expect(
      (
        await service.ensureDueReviewSet(
          "research_english",
          "2026-03-08",
          "America/New_York",
          "2026-03-08T12:00:00.000Z"
        )
      ).map((assignment) => assignment.cardId)
    ).toEqual(["before-spring-midnight", "at-spring-midnight"]);
  });

  it("uses America/New_York local midnight across the fall DST transition", async () => {
    const databaseName = `wordeasy-personal-dst-fall-${crypto.randomUUID()}`;
    const database = trackDatabase(databaseName, new LearningDatabase(databaseName));
    await openLearningDatabase(database);
    const service = new LocalAssignmentService(database, USER_ID);
    const state = (cardId: string, dueAt: string) => ({
      userId: USER_ID,
      cardId,
      module: "research_english" as const,
      schedulerState: {},
      dueAt,
      lastReviewedAt: "2026-10-25T12:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "dst-test",
      updatedAt: "2026-10-25T12:00:00.000Z"
    });
    await database.local_review_states.bulkAdd([
      state("before-fall-midnight", "2026-11-02T04:59:59.999Z"),
      state("at-fall-midnight", "2026-11-02T05:00:00.000Z")
    ]);

    expect(
      (
        await service.ensureDueReviewSet(
          "research_english",
          "2026-11-01",
          "America/New_York",
          "2026-11-01T12:00:00.000Z"
        )
      ).map((assignment) => assignment.cardId)
    ).toEqual(["before-fall-midnight"]);
  });
});
