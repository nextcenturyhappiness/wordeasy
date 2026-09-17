import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { LocalAssignmentService } from "../../src/data/localAssignmentService";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";
import type { CachedCardRow } from "../../src/db/records";

const USER_ID = "assignment-eligibility-user";
const DAY_ONE = "2026-08-26";
const DAY_TWO = "2026-08-27";
const CREATED_AT = "2026-08-26T08:00:00.000Z";

const databases = new Set<LearningDatabase>();
const databaseNames = new Set<string>();

afterEach(async () => {
  for (const database of databases) {
    database.close();
  }
  databases.clear();
  await Promise.all([...databaseNames].map(async (name) => Dexie.delete(name)));
  databaseNames.clear();
});

async function openService(): Promise<{
  database: LearningDatabase;
  service: LocalAssignmentService;
}> {
  const databaseName = `wordeasy-assignment-eligibility-${crypto.randomUUID()}`;
  databaseNames.add(databaseName);
  const database = new LearningDatabase(databaseName);
  databases.add(database);
  await openLearningDatabase(database);
  return { database, service: new LocalAssignmentService(database, USER_ID) };
}

function researchCard(
  cardId: string,
  category: string,
  wordSenseId = `${cardId}-sense`
): CachedCardRow {
  return {
    userId: USER_ID,
    cardId,
    wordId: `${cardId}-word`,
    wordSenseId,
    contextId: `${cardId}-context`,
    module: "research_english",
    category,
    lemma: cardId,
    displayForm: cardId,
    partOfSpeech: "noun",
    ipa: "/test/",
    meaningEn: "meaning",
    meaningZh: "释义",
    usageNote: "usage",
    contextSentence: `${cardId} in context.`,
    targetText: cardId,
    plainEnglishParaphrase: "paraphrase",
    sentenceTranslationZh: "翻译",
    collocations: ["one", "two", "three"],
    sourceType: "original_example",
    sourceTitle: null,
    sourceUrl: null,
    doi: null,
    pmid: null,
    active: true,
    cachedAt: CREATED_AT
  };
}

function quotaCards(extraGeneral = 0): CachedCardRow[] {
  const cards: CachedCardRow[] = [];
  for (let index = 0; index < 5 + extraGeneral; index += 1) {
    cards.push(researchCard(`general-${String(index)}`, "general_research"));
  }
  for (let index = 0; index < 2; index += 1) {
    cards.push(researchCard(`stats-${String(index)}`, "statistics_methodology"));
  }
  for (let index = 0; index < 3; index += 1) {
    cards.push(researchCard(`bio-${String(index)}`, "bioinformatics"));
  }
  return cards;
}

describe("LocalAssignmentService New eligibility", () => {
  it("still selects a previously assigned unlearned card as New on a later day", async () => {
    const { database, service } = await openService();
    await database.cached_cards.bulkAdd(quotaCards());

    const dayOne = await service.ensureResearchNew(DAY_ONE, CREATED_AT);
    expect(dayOne.status).toBe("ready");
    if (dayOne.status !== "ready") {
      return;
    }
    expect(dayOne.assignments).toHaveLength(10);
    expect(await database.learned_word_senses.count()).toBe(0);

    const dayTwo = await service.ensureResearchNew(DAY_TWO, "2026-08-27T08:00:00.000Z");
    expect(dayTwo.status).toBe("ready");
    if (dayTwo.status !== "ready") {
      return;
    }
    expect(dayTwo.assignments).toHaveLength(10);
    expect(dayTwo.assignments.every((assignment) => assignment.studyDate === DAY_TWO)).toBe(true);
  });

  it("excludes a learned word sense from later New selection", async () => {
    const { database, service } = await openService();
    await database.cached_cards.bulkAdd(quotaCards(1));

    const dayOne = await service.ensureResearchNew(DAY_ONE, CREATED_AT);
    expect(dayOne.status).toBe("ready");
    if (dayOne.status !== "ready") {
      return;
    }
    const learned = dayOne.assignments.find(
      (assignment) => assignment.category === "general_research"
    );
    expect(learned).toBeDefined();
    if (learned === undefined) {
      return;
    }
    await database.learned_word_senses.add({
      userId: USER_ID,
      module: "research_english",
      wordSenseId: learned.wordSenseId,
      firstCardId: learned.cardId,
      firstEventId: "10000000-0000-4000-8000-000000000001",
      firstLearnedAt: "2026-08-26T08:05:00.000Z"
    });

    const dayTwo = await service.ensureResearchNew(DAY_TWO, "2026-08-27T08:00:00.000Z");
    expect(dayTwo.status).toBe("ready");
    if (dayTwo.status !== "ready") {
      return;
    }
    expect(dayTwo.assignments.map((assignment) => assignment.cardId)).not.toContain(learned.cardId);
    expect(
      dayTwo.assignments.filter((assignment) => assignment.category === "general_research")
    ).toHaveLength(5);
  });

  it("replaces an empty Research shortage when unlearned cards now fill the quota", async () => {
    const { database, service } = await openService();
    await database.cached_cards.bulkAdd(quotaCards());
    await database.cached_assignment_sets.add({
      userId: USER_ID,
      module: "research_english",
      studyDate: DAY_ONE,
      queue: "new",
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: "general_research",
        required: 5,
        available: 0,
        message: "Not enough new General Research cards are available."
      },
      createdAt: CREATED_AT
    });
    await database.daily_summary.add({
      userId: USER_ID,
      module: "research_english",
      studyDate: DAY_ONE,
      newCompleted: 0,
      newTotal: 0,
      reviewCompleted: 0,
      reviewTotal: 0,
      totalLearned: 0,
      streak: 0,
      pendingSyncCount: 0,
      updatedAt: CREATED_AT
    });

    const healed = await service.ensureResearchNew(DAY_ONE, CREATED_AT);
    expect(healed.status).toBe("ready");
    if (healed.status !== "ready") {
      return;
    }
    expect(healed.assignments).toHaveLength(10);
    expect(
      healed.assignments.filter((assignment) => assignment.category === "general_research")
    ).toHaveLength(5);
    expect(
      healed.assignments.filter((assignment) => assignment.category === "statistics_methodology")
    ).toHaveLength(2);
    expect(
      healed.assignments.filter((assignment) => assignment.category === "bioinformatics")
    ).toHaveLength(3);
    expect(
      await database.cached_assignment_sets.get([USER_ID, "research_english", DAY_ONE, "new"])
    ).toMatchObject({ status: "ready", shortage: null });
    expect(
      (await database.daily_summary.get([USER_ID, "research_english", DAY_ONE]))?.newTotal
    ).toBe(10);
  });
});
