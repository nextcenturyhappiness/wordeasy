import { afterEach, describe, expect, it } from "vitest";

import { IndexedDbLearningRepository } from "../../src/data/indexedDbLearningRepository";
import { LearningDatabase } from "../../src/db/learningDatabase";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";

let activeDatabase: LearningDatabase | null = null;

afterEach(async () => {
  if (activeDatabase !== null) {
    activeDatabase.close();
    await activeDatabase.delete();
    activeDatabase = null;
  }
});

describe("IndexedDbLearningRepository", () => {
  it("prepares an account-scoped local store without seeding demo content", async () => {
    const database = new LearningDatabase(`wordeasy-cloud-local-${crypto.randomUUID()}`);
    activeDatabase = database;
    let schedulerLoads = 0;
    const repository = new IndexedDbLearningRepository({
      database,
      userId: "cloud-account-a",
      email: "account-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "cloud-device-a",
      scheduler: () => {
        schedulerLoads += 1;
        return Promise.resolve(new FsrsSchedulerAdapter());
      },
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-26T08:00:00.000Z")
    });

    await repository.initialize();

    expect(await database.local_profile.get("cloud-account-a")).toMatchObject({
      userId: "cloud-account-a",
      timezone: "Asia/Shanghai"
    });
    expect(await database.cached_cards.count()).toBe(0);
    expect(await database.cached_daily_assignments.count()).toBe(0);
    expect(await database.sync_outbox.count()).toBe(0);
    expect(await repository.getCachedHome()).toBeNull();
    expect(schedulerLoads).toBe(0);
  });

  it("uses the injected system IANA zone for study dates even when the stored profile differs", async () => {
    const database = new LearningDatabase(`wordeasy-system-tz-${crypto.randomUUID()}`);
    activeDatabase = database;
    const seeded = new IndexedDbLearningRepository({
      database,
      userId: "cloud-account-a",
      email: "account-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "cloud-device-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-26T16:30:00.000Z")
    });
    await seeded.initialize();
    expect((await database.local_profile.get("cloud-account-a"))?.timezone).toBe("Asia/Shanghai");

    await database.cached_assignment_sets.add({
      userId: "cloud-account-a",
      module: "research_english",
      studyDate: "2026-08-26",
      queue: "new",
      status: "ready",
      shortage: null,
      createdAt: "2026-08-26T08:00:00.000Z"
    });
    await database.cached_daily_assignments.add({
      userId: "cloud-account-a",
      module: "research_english",
      studyDate: "2026-08-26",
      cardId: "card-keep",
      wordSenseId: "sense-keep",
      category: "general_research",
      position: 0,
      completedAt: null,
      createdAt: "2026-08-26T08:00:00.000Z"
    });
    await database.daily_summary.bulkAdd([
      {
        userId: "cloud-account-a",
        module: "research_english",
        studyDate: "2026-08-26",
        newCompleted: 0,
        newTotal: 1,
        reviewCompleted: 0,
        reviewTotal: 0,
        totalLearned: 0,
        streak: 0,
        pendingSyncCount: 0,
        updatedAt: "2026-08-26T08:00:00.000Z"
      },
      {
        userId: "cloud-account-a",
        module: "medical_english",
        studyDate: "2026-08-26",
        newCompleted: 0,
        newTotal: 0,
        reviewCompleted: 0,
        reviewTotal: 0,
        totalLearned: 0,
        streak: 0,
        pendingSyncCount: 0,
        updatedAt: "2026-08-26T08:00:00.000Z"
      },
      {
        userId: "cloud-account-a",
        module: "essential_medical",
        studyDate: "2026-08-26",
        newCompleted: 0,
        newTotal: 0,
        reviewCompleted: 0,
        reviewTotal: 0,
        totalLearned: 0,
        streak: 0,
        pendingSyncCount: 0,
        updatedAt: "2026-08-26T08:00:00.000Z"
      }
    ]);

    const repository = new IndexedDbLearningRepository({
      database,
      userId: "cloud-account-a",
      email: "account-a@example.invalid",
      resolveTimezone: () => "America/New_York",
      deviceId: "cloud-device-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-26T16:30:00.000Z")
    });
    await repository.initialize();

    expect((await database.local_profile.get("cloud-account-a"))?.timezone).toBe(
      "America/New_York"
    );
    expect(await repository.getCachedHome()).toMatchObject({
      studyDate: "2026-08-26",
      timezone: "America/New_York"
    });
    expect(
      await database.cached_daily_assignments
        .where("[userId+module+studyDate]")
        .equals(["cloud-account-a", "research_english", "2026-08-26"])
        .toArray()
    ).toEqual([
      expect.objectContaining({
        cardId: "card-keep",
        studyDate: "2026-08-26"
      })
    ]);
    expect(
      await database.cached_assignment_sets.get([
        "cloud-account-a",
        "research_english",
        "2026-08-26",
        "new"
      ])
    ).toMatchObject({ status: "ready" });
  });

  it("returns a usable Home when only some modules have today's daily_summary", async () => {
    const database = new LearningDatabase(`wordeasy-partial-home-${crypto.randomUUID()}`);
    activeDatabase = database;
    const repository = new IndexedDbLearningRepository({
      database,
      userId: "cloud-account-a",
      email: "account-a@example.invalid",
      timezone: "Asia/Shanghai",
      deviceId: "cloud-device-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-26T08:00:00.000Z")
    });
    await repository.initialize();

    await database.daily_summary.bulkAdd([
      {
        userId: "cloud-account-a",
        module: "research_english",
        studyDate: "2026-08-26",
        newCompleted: 2,
        newTotal: 10,
        reviewCompleted: 1,
        reviewTotal: 4,
        totalLearned: 40,
        streak: 5,
        pendingSyncCount: 1,
        updatedAt: "2026-08-26T08:00:00.000Z"
      },
      {
        userId: "cloud-account-a",
        module: "medical_english",
        studyDate: "2026-08-26",
        newCompleted: 0,
        newTotal: 10,
        reviewCompleted: 0,
        reviewTotal: 0,
        totalLearned: 12,
        streak: 3,
        pendingSyncCount: 0,
        updatedAt: "2026-08-26T08:05:00.000Z"
      }
    ]);

    await expect(repository.getCachedHome()).resolves.toMatchObject({
      userId: "cloud-account-a",
      studyDate: "2026-08-26",
      timezone: "Asia/Shanghai",
      streak: 5,
      pendingSyncCount: 1,
      cachedAt: "2026-08-26T08:05:00.000Z",
      modules: {
        research_english: {
          module: "research_english",
          new: { completed: 2, total: 10 },
          review: { completed: 1, total: 4 },
          wordsLearned: 40
        },
        medical_english: {
          module: "medical_english",
          new: { completed: 0, total: 10 },
          review: { completed: 0, total: 0 },
          wordsLearned: 12
        },
        essential_medical: {
          module: "essential_medical",
          new: { completed: 0, total: 0 },
          review: { completed: 0, total: 0 },
          wordsLearned: 0
        }
      }
    });
  });
});
