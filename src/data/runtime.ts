import type {
  AuthGateway,
  LearningRepository,
  SettingsGateway,
  SyncGateway
} from "../application/contracts";
import { DemoSessionAdapter } from "../auth/demoSession";
import { assertIanaTimezone } from "../domain/time";
import { LearningDatabase } from "../db/learningDatabase";
import { FsrsSchedulerAdapter } from "../scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../sync/localSyncState";
import { DemoLearningRepository } from "./demoLearningRepository";
import { DemoSettingsGateway } from "./demo/demoSettingsGateway";

export interface DemoRuntimeConfig {
  mode: "demo";
  userId?: string;
  email?: string;
  timezone?: string;
  now?: () => Date;
  databaseName?: string;
  deviceId?: string;
}

export interface CloudRuntimeConfig {
  mode: "cloud";
}

export type LearningRuntimeConfig = DemoRuntimeConfig | CloudRuntimeConfig;

export interface LearningRuntime {
  mode: "demo";
  auth: AuthGateway;
  learning: LearningRepository;
  settings: SettingsGateway;
  sync: SyncGateway;
  dispose(): Promise<void>;
}

export class RuntimeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConfigurationError";
  }
}

function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export async function createLearningRuntime(
  config: LearningRuntimeConfig
): Promise<LearningRuntime> {
  if (config.mode !== "demo") {
    throw new RuntimeConfigurationError(
      "Cloud runtime is unavailable in M1; production must not fall back to demo mode."
    );
  }

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
