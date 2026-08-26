import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { AccountCloudDayCache } from "../../src/data/cloud/cloudDayCache";
import type {
  CloudContextCard,
  CloudDailyLearningSnapshot,
  CloudLearningRepository,
  CloudNewAssignmentSet,
  CloudPullPage,
  CloudReviewAssignmentSet,
  PushEventOutcome,
  ReconciliationBundle,
  ReconciliationCommitResult
} from "../../src/data/cloud/types";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";

let activeDatabase: LearningDatabase | null = null;

afterEach(async () => {
  if (activeDatabase !== null) {
    const name = activeDatabase.name;
    activeDatabase.close();
    await Dexie.delete(name);
    activeDatabase = null;
  }
});

function cloudCard(index: number, category: string): CloudContextCard {
  const suffix = String(index);
  return {
    cardId: `card-${suffix}`,
    wordId: `word-${suffix}`,
    wordSenseId: `sense-${suffix}`,
    contextId: `context-${suffix}`,
    module: "research_english",
    category,
    lemma: `lemma-${suffix}`,
    displayForm: `lemma-${suffix}`,
    ipa: "/test/",
    partOfSpeech: "noun",
    meaningEn: "A contextual meaning.",
    meaningZh: "语境释义",
    usageNote: "Used in research writing.",
    contextSentence: `The lemma-${suffix} appears in context.`,
    targetText: `lemma-${suffix}`,
    plainEnglishParaphrase: "A plain paraphrase.",
    sentenceTranslationZh: "完整句子翻译。",
    collocations: ["test collocation"],
    sourceType: "original_example",
    sourceTitle: null,
    sourceUrl: null,
    doi: null,
    pmid: null
  };
}

function readyAssignments(): CloudNewAssignmentSet {
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

const REVIEW_SET: CloudReviewAssignmentSet = {
  status: "ready",
  setId: "review-set-a",
  module: "research_english",
  studyDate: "2026-08-26",
  timezone: "Asia/Shanghai",
  cutoffAt: "2026-08-26T16:00:00.000Z",
  assignments: []
};

class FakeCloudLearningRepository implements CloudLearningRepository {
  readonly userId = "user-a";
  readonly newSet = readyAssignments();
  readonly snapshot: CloudDailyLearningSnapshot = {
    newAssignment: this.newSet,
    reviewAssignment: REVIEW_SET,
    cards: this.newSet.assignments.map((assignment, index) => cloudCard(index, assignment.category))
  };
  readonly calls: string[] = [];

  ensureNewAssignment(): Promise<CloudNewAssignmentSet> {
    this.calls.push("new");
    return Promise.resolve(this.newSet);
  }

  ensureReviewAssignment(): Promise<CloudReviewAssignmentSet> {
    this.calls.push("review");
    return Promise.resolve(REVIEW_SET);
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

  getReconciliationBundle(): Promise<ReconciliationBundle> {
    throw new Error("Not used by the day cache test.");
  }

  commitReconciliation(): Promise<ReconciliationCommitResult> {
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
});
