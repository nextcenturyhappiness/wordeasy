import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountCloudSettingsGateway } from "../../src/data/cloud/accountPreferences";
import type { CloudRpcClient } from "../../src/data/cloud/rpcClient";
import { IndexedDbLearningRepository } from "../../src/data/indexedDbLearningRepository";
import { LearningDatabase } from "../../src/db/learningDatabase";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import { LocalSyncStateStore } from "../../src/sync/localSyncState";

let database: LearningDatabase | null = null;

afterEach(async () => {
  if (database !== null) {
    database.close();
    await database.delete();
    database = null;
  }
});

describe("account cloud settings", () => {
  it("pulls an existing account preference, then pushes an offline local change", async () => {
    database = new LearningDatabase(`account-settings-${crypto.randomUUID()}`);
    const repository = new IndexedDbLearningRepository({
      database,
      userId: "account-a",
      email: "learner@example.com",
      timezone: "Asia/Shanghai",
      deviceId: "device-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore(),
      now: () => new Date("2026-08-26T08:00:00.000Z")
    });
    await repository.initialize();

    const call = vi
      .fn<CloudRpcClient["call"]>()
      .mockResolvedValueOnce({
        user_id: "account-a",
        timezone: "America/New_York",
        theme: "dark"
      })
      .mockResolvedValueOnce({
        user_id: "account-a",
        timezone: "America/New_York",
        theme: "light"
      });
    const gateway = new AccountCloudSettingsGateway(database, "account-a", { call });

    await expect(gateway.syncRemote()).resolves.toEqual({
      timezone: "America/New_York",
      theme: "dark"
    });
    expect(call).toHaveBeenNthCalledWith(1, "ensure_account_preferences", {
      p_timezone: "Asia/Shanghai",
      p_theme: "system"
    });
    expect(await gateway.getTimezone()).toBe("America/New_York");
    expect(await gateway.getTheme()).toBe("dark");

    await gateway.setTheme("light");
    expect(
      await database.sync_metadata.get(["account-a", "pending-account-preferences-v1"])
    ).toBeDefined();

    await expect(gateway.syncRemote()).resolves.toEqual({
      timezone: "America/New_York",
      theme: "light"
    });
    expect(call).toHaveBeenNthCalledWith(2, "set_account_preferences", {
      p_timezone: "America/New_York",
      p_theme: "light"
    });
    expect(
      await database.sync_metadata.get(["account-a", "pending-account-preferences-v1"])
    ).toBeUndefined();
  });

  it("rejects a preference response from a different authenticated account", async () => {
    database = new LearningDatabase(`account-settings-scope-${crypto.randomUUID()}`);
    const repository = new IndexedDbLearningRepository({
      database,
      userId: "account-a",
      email: "learner@example.com",
      timezone: "Asia/Shanghai",
      deviceId: "device-a",
      scheduler: new FsrsSchedulerAdapter(),
      syncState: new LocalSyncStateStore()
    });
    await repository.initialize();
    const call = vi.fn<CloudRpcClient["call"]>().mockResolvedValue({
      user_id: "account-b",
      timezone: "UTC",
      theme: "dark"
    });
    const gateway = new AccountCloudSettingsGateway(database, "account-a", { call });

    await expect(gateway.syncRemote()).rejects.toThrow("escaped their account scope");
    expect(await gateway.getTimezone()).toBe("Asia/Shanghai");
    expect(await gateway.getTheme()).toBe("system");
  });
});
