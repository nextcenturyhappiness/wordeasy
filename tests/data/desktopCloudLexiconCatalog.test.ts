import { afterEach, describe, expect, it } from "vitest";

import { seedDesktopLexiconCatalog } from "../../src/data/desktop/desktopLexiconCatalogSeed";
import { IndexedDbLearningRepository } from "../../src/data/indexedDbLearningRepository";
import { FULL_CATALOG_TOTAL } from "../../src/data/local/fullCatalog";
import { STANDALONE_CARDS } from "../../src/data/standalone/standaloneCards";
import { LearningDatabase } from "../../src/db/learningDatabase";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";

const USER_ID = "desktop-cloud-lexicon-user";
const EMAIL = "desktop-cloud-lexicon@example.invalid";
const TIMEZONE = "Asia/Shanghai";
const NOW = new Date("2026-09-17T08:00:00.000Z");
const STUDY_DATE = "2026-09-17";

let activeDatabase: LearningDatabase | null = null;

function requireCard(module: "research_english" | "medical_english" | "essential_medical") {
  const card = STANDALONE_CARDS.find((candidate) => candidate.sense.module === module);
  if (card === undefined) {
    throw new Error(`Expected a ${module} catalog card.`);
  }
  return card;
}

function createCloudRepository(options?: {
  deferredBootstrap?: boolean;
  fuzzy?: boolean;
}): IndexedDbLearningRepository {
  const database = new LearningDatabase(`wordeasy-desktop-cloud-lexicon-${crypto.randomUUID()}`);
  activeDatabase = database;
  return new IndexedDbLearningRepository({
    database,
    userId: USER_ID,
    email: EMAIL,
    timezone: TIMEZONE,
    deviceId: "desktop-cloud-lexicon-device",
    scheduler: new FsrsSchedulerAdapter(),
    syncState: new LocalSyncStateStore(),
    now: () => NOW,
    ...(options?.fuzzy === true ? { fuzzyLexiconSearch: true } : {}),
    ...(options?.deferredBootstrap === false
      ? {}
      : {
          deferredBootstrap: seedDesktopLexiconCatalog
        })
  });
}

afterEach(async () => {
  if (activeDatabase !== null) {
    activeDatabase.close();
    await activeDatabase.delete();
    activeDatabase = null;
  }
});

describe("desktop cloud lexicon catalog seed", () => {
  it("does not seed the full catalog on Home, and hosted cloud search stays snapshot-only", async () => {
    const hosted = createCloudRepository({ deferredBootstrap: false });
    await hosted.initialize();
    expect(await hosted.getCachedHome()).toBeNull();
    expect(await activeDatabase?.cached_cards.count()).toBe(0);
    expect(await hosted.searchLocalCards(requireCard("research_english").word.lemma)).toEqual([]);
    expect(await hosted.searchLocalCards("phagocytosis")).toEqual([]);
  });

  it("upserts the full local catalog for desktop search without creating assignments", async () => {
    const research = requireCard("research_english");
    const medical = STANDALONE_CARDS.find(
      (card) => card.sense.module === "medical_english" && card.card.active
    );
    const essential =
      STANDALONE_CARDS.find(
        (card) => card.sense.module === "essential_medical" && card.word.lemma === "phagocytosis"
      ) ?? requireCard("essential_medical");
    if (medical === undefined) {
      throw new Error("Expected an active Medical catalog card.");
    }

    const database = new LearningDatabase(`wordeasy-desktop-cloud-lexicon-${crypto.randomUUID()}`);
    activeDatabase = database;
    await database.cached_cards.put({
      userId: USER_ID,
      cardId: "snapshot-only-card",
      wordId: "snapshot-word",
      wordSenseId: "snapshot-sense",
      contextId: "snapshot-context",
      module: "research_english",
      category: "general_research",
      lemma: "snapshotlemma",
      displayForm: "snapshotlemma",
      partOfSpeech: "noun",
      ipa: "",
      meaningEn: "only present from a daily snapshot",
      meaningZh: "快照专有词",
      usageNote: "",
      contextSentence: "The snapshotlemma was never part of the local catalog seed.",
      targetText: "snapshotlemma",
      plainEnglishParaphrase: "A snapshot-only token.",
      sentenceTranslationZh: "这是仅出现在当日快照里的词。",
      collocations: [],
      sourceType: "original_example",
      sourceTitle: null,
      sourceUrl: null,
      doi: null,
      pmid: null,
      active: true,
      cachedAt: NOW.toISOString()
    });
    await database.cached_assignment_sets.add({
      userId: USER_ID,
      module: "research_english",
      studyDate: STUDY_DATE,
      queue: "new",
      status: "ready",
      shortage: null,
      createdAt: NOW.toISOString()
    });
    await database.cached_daily_assignments.add({
      userId: USER_ID,
      module: "research_english",
      studyDate: STUDY_DATE,
      cardId: "snapshot-only-card",
      wordSenseId: "snapshot-sense",
      category: "general_research",
      position: 0,
      completedAt: null,
      createdAt: NOW.toISOString()
    });

    const repository = new IndexedDbLearningRepository({
      database,
      userId: USER_ID,
      email: EMAIL,
      timezone: TIMEZONE,
      deviceId: "desktop-cloud-lexicon-device",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => NOW,
      fuzzyLexiconSearch: true,
      deferredBootstrap: seedDesktopLexiconCatalog
    });
    await repository.initialize();
    expect(await database.cached_cards.count()).toBe(1);

    const researchHits = await repository.searchLocalCards(research.word.lemma);
    const medicalHits = await repository.searchLocalCards(medical.word.lemma);
    const essentialHits = await repository.searchLocalCards(essential.word.lemma);
    const fuzzyEssential = await repository.searchLocalCards("phagocytoss");

    expect(researchHits.some((hit) => hit.cardId === research.card.id)).toBe(true);
    expect(researchHits.find((hit) => hit.cardId === research.card.id)).toMatchObject({
      module: "research_english",
      lemma: research.word.lemma
    });
    expect(medicalHits.some((hit) => hit.cardId === medical.card.id)).toBe(true);
    expect(essentialHits.some((hit) => hit.cardId === essential.card.id)).toBe(true);
    expect(fuzzyEssential.map((hit) => hit.lemma)).toContain("phagocytosis");
    expect(researchHits.some((hit) => hit.cardId === "snapshot-only-card")).toBe(false);
    expect(await repository.searchLocalCards("snapshotlemma")).toEqual([
      expect.objectContaining({ cardId: "snapshot-only-card", lemma: "snapshotlemma" })
    ]);

    expect(await database.cached_cards.count()).toBe(FULL_CATALOG_TOTAL + 1);
    expect(await database.cached_cards.get([USER_ID, "snapshot-only-card"])).toMatchObject({
      lemma: "snapshotlemma"
    });
    expect(await database.cached_daily_assignments.count()).toBe(1);
    expect(
      await database.cached_assignment_sets.get([USER_ID, "research_english", STUDY_DATE, "new"])
    ).toMatchObject({ status: "ready" });
    expect(await database.cached_daily_review_assignments.count()).toBe(0);
  });
});
