import { DemoSessionAdapter } from "../../auth/demoSession";
import { LearningDatabase } from "../../db/learningDatabase";
import type { NormalizedContextCard } from "../../domain/learning";
import { assertIanaTimezone, systemIanaTimezone } from "../../domain/time";
import { LocalSyncStateStore } from "../../sync/localSyncState";
import { DemoLearningRepository } from "../demoLearningRepository";
import { DemoSettingsGateway } from "../demo/demoSettingsGateway";
import { PersonalLearningRepository } from "../personalLearningRepository";
import type { LearningRuntime, LocalRuntimeConfig } from "../runtime";

interface LocalRuntimeIdentityBase {
  userId: string;
  email: string;
  namespace: string;
}

interface DemoRuntimeIdentity extends LocalRuntimeIdentityBase {
  kind: "demo";
  cards: NormalizedContextCard[];
}

interface PersonalRuntimeIdentity extends LocalRuntimeIdentityBase {
  kind: "personal";
  loadCards: () => Promise<NormalizedContextCard[]>;
}

type LocalRuntimeIdentity = DemoRuntimeIdentity | PersonalRuntimeIdentity;

export async function createLocalRuntime(
  config: LocalRuntimeConfig,
  identity: LocalRuntimeIdentity
): Promise<LearningRuntime> {
  const userId = config.userId ?? identity.userId;
  const email = config.email ?? identity.email;
  const resolveTimezone =
    config.timezone === undefined
      ? systemIanaTimezone
      : () => {
          assertIanaTimezone(config.timezone as string);
          return config.timezone as string;
        };
  const timezone = resolveTimezone();
  const databaseName = config.databaseName ?? `wordeasy:${identity.namespace}:${userId}`;
  const deviceId = config.deviceId ?? `${identity.namespace}-device:${userId}`;
  const database = new LearningDatabase(databaseName);
  const syncState = new LocalSyncStateStore(true);
  const repositoryOptions = {
    database,
    userId,
    email,
    timezone,
    resolveTimezone,
    deviceId,
    scheduler: async () => {
      const { FsrsSchedulerAdapter } = await import("../../scheduler/fsrsScheduler");
      return new FsrsSchedulerAdapter();
    },
    syncState,
    ...(config.now === undefined ? {} : { now: config.now })
  };
  const learning =
    identity.kind === "demo"
      ? new DemoLearningRepository({ ...repositoryOptions, cards: identity.cards })
      : new PersonalLearningRepository({
          ...repositoryOptions,
          loadCards: identity.loadCards
        });
  await learning.initialize();

  return {
    mode: config.mode,
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
