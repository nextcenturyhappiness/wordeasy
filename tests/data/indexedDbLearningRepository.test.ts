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

    expect(await database.local_profile.get("cloud-account-a")).toMatchObject({
      userId: "cloud-account-a",
      timezone: "Asia/Shanghai"
    });
    expect(await database.cached_cards.count()).toBe(0);
    expect(await database.cached_daily_assignments.count()).toBe(0);
    expect(await database.sync_outbox.count()).toBe(0);
    expect(await repository.getCachedHome()).toBeNull();
  });
});
