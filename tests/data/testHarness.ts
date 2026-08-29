import Dexie from "dexie";

import { DEMO_CARDS } from "../../src/data/demo/demoCards";
import { DemoLearningRepository } from "../../src/data/demoLearningRepository";
import { LearningDatabase } from "../../src/db/learningDatabase";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";

export const FIXED_NOW = new Date("2026-08-26T08:00:00.000Z");

export interface RepositoryHarness {
  databaseName: string;
  database: LearningDatabase;
  repository: DemoLearningRepository;
  syncState: LocalSyncStateStore;
  userId: string;
}

export async function createRepositoryHarness(options?: {
  databaseName?: string;
  userId?: string;
  email?: string;
  timezone?: string;
  now?: Date;
  deviceId?: string;
}): Promise<RepositoryHarness> {
  const databaseName = options?.databaseName ?? `wordeasy-test-${crypto.randomUUID()}`;
  const userId = options?.userId ?? "test-user-a";
  const database = new LearningDatabase(databaseName);
  const syncState = new LocalSyncStateStore();
  let eventSequence = 0;
  const repository = new DemoLearningRepository({
    database,
    userId,
    email: options?.email ?? `${userId}@example.invalid`,
    timezone: options?.timezone ?? "Asia/Shanghai",
    deviceId: options?.deviceId ?? `device-${userId}`,
    scheduler: new FsrsSchedulerAdapter(),
    syncState,
    cards: DEMO_CARDS,
    now: () => new Date(options?.now ?? FIXED_NOW),
    eventIdFactory: () => {
      eventSequence += 1;
      return `10000000-0000-4000-8000-${eventSequence.toString().padStart(12, "0")}`;
    }
  });
  await repository.initialize();
  return { databaseName, database, repository, syncState, userId };
}

export async function deleteRepositoryHarness(harness: RepositoryHarness): Promise<void> {
  harness.database.close();
  await Dexie.delete(harness.databaseName);
}
