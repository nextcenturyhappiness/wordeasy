import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ModuleSlug } from "../../src/application/contracts";
import { AccountCloudDayCache } from "../../src/data/cloud/cloudDayCache";
import { parseDailyLearningSnapshot } from "../../src/data/cloud/parsers";
import type {
  CloudContextCard,
  CloudDailyLearningSnapshot,
  CloudLearningRepository,
  CloudNewAssignmentSet,
  CloudPullPage,
  CloudReviewAssignmentSet,
  PushEventOutcome,
  ReconciledReviewState
} from "../../src/data/cloud/types";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";
import { readyEssentialDailySnapshotPayload } from "./essentialDailySnapshotPayload";

let activeDatabase: LearningDatabase | null = null;

afterEach(async () => {
  if (activeDatabase !== null) {
    const name = activeDatabase.name;
    activeDatabase.close();
    await Dexie.delete(name);
    activeDatabase = null;
  }
});

function cloudCard(
  index: number,
  category: string,
  options: {
    module?: ModuleSlug;
    prefix?: string;
    collocations?: string[];
    usageNote?: string;
  } = {}
): CloudContextCard {
  const module = options.module ?? "research_english";
  const prefix = options.prefix ?? "card";
  const suffix = String(index);
  const lemma = `lemma-${suffix}`;
  const essential = module === "essential_medical";
  return {
    cardId: `${prefix}-${suffix}`,
    wordId: `word-${suffix}`,
    wordSenseId: `sense-${suffix}`,
    contextId: `context-${suffix}`,
    module,
    category,
    lemma,
    displayForm: lemma,
    ipa: "/test/",
    partOfSpeech: "noun",
    meaningEn: "A contextual meaning.",
    meaningZh: "语境释义",
    usageNote: options.usageNote ?? (essential ? "" : "Used in research writing."),
    contextSentence: `The ${lemma} appears in context.`,
    targetText: lemma,
    plainEnglishParaphrase: "A plain paraphrase.",
    sentenceTranslationZh: "完整句子翻译。",
    collocations: options.collocations ?? (essential ? [] : ["test collocation"]),
    sourceType: "original_example",
    sourceTitle: null,
    sourceUrl: null,
    doi: null,
    pmid: null
  };
}

function readyResearchAssignments(): CloudNewAssignmentSet {
  const categories = [
    ...Array.from({ length: 5 }, () => "general_research"),
    ...Array.from({ length: 2 }, () => "statistics_methodology"),
    ...Array.from({ length: 3 }, () => "bioinformatics")
  ];
  return {
    status: "ready",
    setId: "new-set-a",
    module: "research_english",
    studyDate: "2026-08-26",
    timezone: "Asia/Shanghai",
    shortage: null,
    assignments: categories.map((category, index) => ({
      cardId: `card-${String(index)}`,
      category,
      position: index + 1
    }))
  };
}

function readyEssentialAssignments(): CloudNewAssignmentSet {
  return {
    status: "ready",
    setId: "essential-new-set",
    module: "essential_medical",
    studyDate: "2026-09-09",
    timezone: "Asia/Shanghai",
    shortage: null,
    assignments: Array.from({ length: 10 }, (_, index) => ({
      cardId: `essential-${String(index)}`,
      category: "core",
      position: index + 1
    }))
  };
}

function emptyReviewSet(
  module: ModuleSlug,
  studyDate: string,
  setId: string
): CloudReviewAssignmentSet {
  return {
    status: "ready",
    setId,
    module,
    studyDate,
    timezone: "Asia/Shanghai",
    cutoffAt: `${studyDate}T16:00:00.000Z`,
    assignments: []
  };
}

function snapshotFor(newSet: CloudNewAssignmentSet): CloudDailyLearningSnapshot {
  return {
    newAssignment: newSet,
    reviewAssignment: emptyReviewSet(newSet.module, newSet.studyDate, `${newSet.module}-review`),
    cards: newSet.assignments.map((assignment, index) =>
      cloudCard(index, assignment.category, {
        module: newSet.module,
        prefix: assignment.cardId.replace(/-\d+$/, "")
      })
    )
  };
}

class FakeCloudLearningRepository implements CloudLearningRepository {
  readonly userId = "user-a";
  readonly snapshot: CloudDailyLearningSnapshot;
  readonly calls: string[] = [];

  constructor(snapshot: CloudDailyLearningSnapshot = snapshotFor(readyResearchAssignments())) {
    this.snapshot = snapshot;
  }

  ensureNewAssignment(): Promise<CloudNewAssignmentSet> {
    this.calls.push("new");
    const newSet = this.snapshot.newAssignment;
    if (newSet === null) {
      throw new Error("Fake cloud is missing a New assignment.");
    }
    return Promise.resolve(newSet);
  }

  ensureReviewAssignment(): Promise<CloudReviewAssignmentSet> {
    this.calls.push("review");
    const reviewSet = this.snapshot.reviewAssignment;
    if (reviewSet === null) {
      throw new Error("Fake cloud is missing a Review assignment.");
    }
    return Promise.resolve(reviewSet);
  }

  getDailySnapshot(): Promise<CloudDailyLearningSnapshot> {
    this.calls.push("snapshot");
    return Promise.resolve(this.snapshot);
  }

  pushEvents(): Promise<PushEventOutcome[]> {
    throw new Error("Not used by the day cache test.");
  }

  pullChanges(): Promise<CloudPullPage> {
    throw new Error("Not used by the day cache test.");
  }

  reconcileCard(): Promise<ReconciledReviewState> {
    throw new Error("Not used by the day cache test.");
  }

  dispose(): void {}
}

describe("cloud assignment cache integration", () => {
  it("ensures New before Review and persists one stable account-scoped day", async () => {
    activeDatabase = new LearningDatabase(`wordeasy-cloud-cache-${crypto.randomUUID()}`);
    await openLearningDatabase(activeDatabase);
    const cloud = new FakeCloudLearningRepository();
    const cache = new AccountCloudDayCache(
      "user-a",
      activeDatabase,
      cloud,
      () => new Date("2026-08-26T08:00:00.000Z")
    );

    await cache.refresh("research_english", "2026-08-26");
    await cache.refresh("research_english", "2026-08-26");

    expect(cloud.calls).toEqual(["new", "review", "snapshot", "new", "review", "snapshot"]);
    const assignments = await activeDatabase.cached_daily_assignments.toArray();
    expect(assignments).toHaveLength(10);
    expect(assignments.map((assignment) => assignment.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9
    ]);
    expect(await activeDatabase.cached_cards.count()).toBe(10);
    expect(await activeDatabase.cached_daily_review_assignments.count()).toBe(0);
    expect(
      await activeDatabase.daily_summary.get(["user-a", "research_english", "2026-08-26"])
    ).toMatchObject({ newCompleted: 0, newTotal: 10, reviewCompleted: 0, reviewTotal: 0 });
  });

  it("parses a ready 必备医学英语 snapshot with empty collocations and empty usage_note and caches newTotal 10", async () => {
    const snapshot = parseDailyLearningSnapshot(readyEssentialDailySnapshotPayload());
    expect(snapshot.cards).toHaveLength(10);
    expect(snapshot.cards.every((card) => card.usageNote === "")).toBe(true);
    expect(snapshot.cards.every((card) => card.collocations.length === 0)).toBe(true);

    activeDatabase = new LearningDatabase(`wordeasy-cloud-cache-${crypto.randomUUID()}`);
    await openLearningDatabase(activeDatabase);
    const cloud = new FakeCloudLearningRepository(snapshot);
    const cache = new AccountCloudDayCache(
      "user-a",
      activeDatabase,
      cloud,
      () => new Date("2026-09-09T08:00:00.000Z")
    );

    await cache.refresh("essential_medical", "2026-09-09");

    const cards = await activeDatabase.cached_cards.toArray();
    expect(cards).toHaveLength(10);
    expect(cards.every((card) => card.module === "essential_medical")).toBe(true);
    expect(cards.every((card) => card.category === "core")).toBe(true);
    expect(cards.every((card) => card.usageNote === "")).toBe(true);
    expect(cards.every((card) => card.collocations.length === 0)).toBe(true);
    expect(
      await activeDatabase.daily_summary.get(["user-a", "essential_medical", "2026-09-09"])
    ).toMatchObject({ newCompleted: 0, newTotal: 10, reviewCompleted: 0, reviewTotal: 0 });
  });

  it("clears a conflicting local New set and retries so today’s summary is replaced", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    activeDatabase = new LearningDatabase(`wordeasy-cloud-cache-${crypto.randomUUID()}`);
    await openLearningDatabase(activeDatabase);
    await activeDatabase.cached_daily_assignments.put({
      userId: "user-a",
      module: "essential_medical",
      studyDate: "2026-09-09",
      cardId: "stale-local-card",
      wordSenseId: "stale-sense",
      category: "core",
      position: 0,
      completedAt: null,
      createdAt: "2026-09-09T00:00:00.000Z"
    });
    await activeDatabase.cached_assignment_sets.put({
      userId: "user-a",
      module: "essential_medical",
      studyDate: "2026-09-09",
      queue: "new",
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: "core",
        required: 10,
        available: 0,
        message: "Not enough core cards."
      },
      createdAt: "2026-09-09T00:00:00.000Z"
    });
    await activeDatabase.daily_summary.put({
      userId: "user-a",
      module: "essential_medical",
      studyDate: "2026-09-09",
      newCompleted: 0,
      newTotal: 0,
      reviewCompleted: 0,
      reviewTotal: 0,
      totalLearned: 4,
      streak: 2,
      pendingSyncCount: 0,
      updatedAt: "2026-09-09T00:00:00.000Z"
    });

    const cloud = new FakeCloudLearningRepository(snapshotFor(readyEssentialAssignments()));
    const cache = new AccountCloudDayCache(
      "user-a",
      activeDatabase,
      cloud,
      () => new Date("2026-09-09T08:00:00.000Z")
    );

    await cache.refresh("essential_medical", "2026-09-09");

    expect(cloud.calls).toEqual(["new", "review", "snapshot"]);
    const assignments = await activeDatabase.cached_daily_assignments.toArray();
    expect(assignments.map((assignment) => assignment.cardId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `essential-${String(index)}`)
    );
    expect(
      await activeDatabase.cached_daily_assignments.get([
        "user-a",
        "essential_medical",
        "2026-09-09",
        "stale-local-card"
      ])
    ).toBeUndefined();
    expect(
      await activeDatabase.daily_summary.get(["user-a", "essential_medical", "2026-09-09"])
    ).toMatchObject({
      newCompleted: 0,
      newTotal: 10,
      reviewCompleted: 0,
      reviewTotal: 0,
      totalLearned: 4,
      streak: 2
    });
    expect(warn).toHaveBeenCalledWith(
      "Local day cache for essential_medical on 2026-09-09 conflicts with cloud (Stable cloud New assignment conflicts with the local cached set.); clearing and retrying once."
    );
    warn.mockRestore();
  });
});
