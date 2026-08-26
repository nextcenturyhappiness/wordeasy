import { DemoSessionAdapter } from "../auth/demoSession";
import { assertIanaTimezone } from "../domain/time";
import { LearningDatabase } from "../db/learningDatabase";
import { FsrsSchedulerAdapter } from "../scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../sync/localSyncState";
import { DemoLearningRepository } from "./demoLearningRepository";
import { DemoSettingsGateway } from "./demo/demoSettingsGateway";
import type { DemoRuntimeConfig, LearningRuntime } from "./runtime";

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function createDemoRuntime(config: DemoRuntimeConfig): Promise<LearningRuntime> {
  const userId = config.userId ?? "demo-user";
  const email = config.email ?? "demo@wordeasy.invalid";
  const timezone = config.timezone ?? browserTimezone();
  assertIanaTimezone(timezone);
  const databaseName = config.databaseName ?? `wordeasy:demo:${userId}`;
  const deviceId = config.deviceId ?? `demo-device:${userId}`;
  const database = new LearningDatabase(databaseName);
  const syncState = new LocalSyncStateStore();
  const learning = new DemoLearningRepository({
    database,
    userId,
    email,
    timezone,
    deviceId,
    scheduler: new FsrsSchedulerAdapter(),
    syncState,
    ...(config.now === undefined ? {} : { now: config.now })
  });
  await learning.initialize();

  return {
    mode: "demo",
    accountUserId: userId,
    auth: new DemoSessionAdapter(userId, email),
    learning,
    settings: new DemoSettingsGateway(database, userId),
    sync: syncState,
    dispose: () => {
      database.close();
      return Promise.resolve();
    }
  };
}
