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
  it("keeps the OS timezone and pulls a remote theme, then pushes an offline theme change", async () => {
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
        timezone: "Asia/Shanghai",
        theme: "dark"
      })
      .mockResolvedValueOnce({
        user_id: "account-a",
        timezone: "Asia/Shanghai",
        theme: "light"
      });
    const gateway = new AccountCloudSettingsGateway(
      database,
      "account-a",
      { call },
      {
        resolveTimezone: () => "Asia/Shanghai"
      }
    );

    await expect(gateway.syncRemote()).resolves.toEqual({
      timezone: "Asia/Shanghai",
      theme: "dark"
    });
    expect(call).toHaveBeenNthCalledWith(1, "ensure_account_preferences", {
      p_timezone: "Asia/Shanghai",
      p_theme: "system"
    });
    expect(call).toHaveBeenNthCalledWith(2, "set_account_preferences", {
      p_timezone: "Asia/Shanghai",
      p_theme: "dark"
    });
    expect(await gateway.getTimezone()).toBe("Asia/Shanghai");
    expect(await gateway.getTheme()).toBe("dark");

    await gateway.setTheme("light");
    expect(
      await database.sync_metadata.get(["account-a", "pending-account-preferences-v1"])
    ).toBeDefined();

    await expect(gateway.syncRemote()).resolves.toEqual({
      timezone: "Asia/Shanghai",
      theme: "light"
    });
    expect(call).toHaveBeenNthCalledWith(3, "set_account_preferences", {
      p_timezone: "Asia/Shanghai",
      p_theme: "light"
    });
    expect(
      await database.sync_metadata.get(["account-a", "pending-account-preferences-v1"])
    ).toBeUndefined();
  });

  it("writes the OS timezone through when it differs from the stored profile", async () => {
    database = new LearningDatabase(`account-settings-os-${crypto.randomUUID()}`);
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

    const call = vi.fn<CloudRpcClient["call"]>().mockResolvedValue({
      user_id: "account-a",
      timezone: "America/New_York",
      theme: "system"
    });
    const gateway = new AccountCloudSettingsGateway(
      database,
      "account-a",
      { call },
      {
        resolveTimezone: () => "America/New_York"
      }
    );

    await expect(gateway.syncRemote()).resolves.toEqual({
      timezone: "America/New_York",
      theme: "system"
    });
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("set_account_preferences", {
      p_timezone: "America/New_York",
      p_theme: "system"
    });
    expect(await gateway.getTimezone()).toBe("America/New_York");
    expect((await database.local_profile.get("account-a"))?.timezone).toBe("America/New_York");
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
    const gateway = new AccountCloudSettingsGateway(
      database,
      "account-a",
      { call },
      {
        resolveTimezone: () => "Asia/Shanghai"
      }
    );

    await expect(gateway.syncRemote()).rejects.toThrow("escaped their account scope");
    expect(await gateway.getTimezone()).toBe("Asia/Shanghai");
    expect(await gateway.getTheme()).toBe("system");
  });
});
