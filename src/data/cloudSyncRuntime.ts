import type { LearningDatabase } from "../db/learningDatabase";
import { FsrsSchedulerAdapter } from "../scheduler/fsrsScheduler";
import { AccountSyncGateway } from "../sync/accountSyncGateway";
import { CloudSyncCoordinator } from "../sync/syncCoordinator";
import { DexieAccountSyncStore } from "../sync/dexieSyncStore";
import type { AccountCloudSettingsGateway } from "./cloud/accountPreferences";
import { AccountCloudDayCache } from "./cloud/cloudDayCache";
import type { CloudRpcClient } from "./cloud/rpcClient";
import { SupabaseCloudRepository } from "./cloud/supabaseCloudRepository";

export interface AccountCloudSyncRuntimeOptions {
  database: LearningDatabase;
  userId: string;
  rpc: CloudRpcClient;
  settings: AccountCloudSettingsGateway;
}

export function createAccountCloudSyncGateway({
  database,
  userId,
  rpc,
  settings
}: AccountCloudSyncRuntimeOptions): AccountSyncGateway {
  const scheduler = new FsrsSchedulerAdapter();
  const cloud = new SupabaseCloudRepository(userId, rpc);
  const local = new DexieAccountSyncStore(database, userId);
  const dayCache = new AccountCloudDayCache(userId, database, cloud);
  const coordinator = new CloudSyncCoordinator(userId, local, cloud, scheduler);
  return new AccountSyncGateway(userId, local, coordinator, dayCache, settings);
}
