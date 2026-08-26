import { describe, expect, it, vi } from "vitest";

import type { SyncState } from "../../src/application/contracts";
import type {
  CloudPullPage,
  PushEventOutcome,
  ReconciledReviewState
} from "../../src/data/cloud/types";
import {
  AccountSyncGateway,
  type AccountDayCachePort,
  type AccountSettingsSyncPort,
  type AccountSyncCoordinatorPort
} from "../../src/sync/accountSyncGateway";
import { INITIAL_PULL_CURSOR, type AccountLocalSyncStore } from "../../src/sync/contracts";

function localStore(pendingCount = 0): AccountLocalSyncStore {
  return {
    userId: "account-a",
    claimPushBatch: vi.fn().mockResolvedValue([]),
    applyPushOutcomes: vi
      .fn<(outcomes: PushEventOutcome[], now: Date) => Promise<void>>()
      .mockResolvedValue(undefined),
    markPushFailure: vi.fn().mockResolvedValue(undefined),
    releasePushClaims: vi.fn().mockResolvedValue(undefined),
    getPullCursor: vi.fn().mockResolvedValue(INITIAL_PULL_CURSOR),
    getPendingConflictCardIds: vi.fn().mockResolvedValue([]),
    mergePullPage: vi.fn<(page: CloudPullPage) => Promise<void>>().mockResolvedValue(undefined),
    applyReconciledState: vi
      .fn<(state: ReconciledReviewState, now: Date) => Promise<boolean>>()
      .mockResolvedValue(true),
    getPendingCount: vi.fn().mockResolvedValue(pendingCount),
    dispose: vi.fn()
  };
}

describe("account sync gateway", () => {
  it("reports offline without making a cloud request", async () => {
    const coordinatorSync = vi.fn().mockResolvedValue({ status: "synced", pendingCount: 0 });
    const coordinator: AccountSyncCoordinatorPort = {
      userId: "account-a",
      sync: coordinatorSync,
      dispose: vi.fn().mockResolvedValue(undefined)
    };
    const refreshDay = vi.fn().mockResolvedValue(undefined);
    const dayCache: AccountDayCachePort = {
      userId: "account-a",
      refresh: refreshDay
    };
    const syncSettings = vi
      .fn<AccountSettingsSyncPort["syncRemote"]>()
      .mockResolvedValue({ timezone: "Asia/Shanghai", theme: "system" });
    const settings: AccountSettingsSyncPort = {
      userId: "account-a",
      syncRemote: syncSettings
    };
    const gateway = new AccountSyncGateway(
      "account-a",
      localStore(3),
      coordinator,
      dayCache,
      settings,
      { isOnline: () => false }
    );

    await expect(gateway.sync()).resolves.toEqual({ status: "offline", pendingCount: 3 });
    expect(syncSettings).not.toHaveBeenCalled();
    expect(refreshDay).not.toHaveBeenCalled();
    expect(coordinatorSync).not.toHaveBeenCalled();
  });

  it("coalesces triggers and completes push/reconcile before freezing day caches", async () => {
    let releaseSettings: (() => void) | undefined;
    const settingsReady = new Promise<void>((resolve) => {
      releaseSettings = resolve;
    });
    const syncSettings = vi.fn<AccountSettingsSyncPort["syncRemote"]>(async () => {
      await settingsReady;
      return { timezone: "Asia/Shanghai", theme: "system" };
    });
    const settings: AccountSettingsSyncPort = {
      userId: "account-a",
      syncRemote: syncSettings
    };
    const calls: string[] = [];
    const refreshDay = vi.fn<AccountDayCachePort["refresh"]>((module, studyDate) => {
      calls.push(`${module}:${studyDate}`);
      return Promise.resolve(undefined);
    });
    const dayCache: AccountDayCachePort = {
      userId: "account-a",
      refresh: refreshDay
    };
    const synced: SyncState = { status: "synced", pendingCount: 0 };
    let syncPhase = 0;
    const coordinatorSync = vi.fn<AccountSyncCoordinatorPort["sync"]>(() => {
      syncPhase += 1;
      calls.push(syncPhase === 1 ? "push-reconcile" : "final-pull-merge");
      return Promise.resolve(synced);
    });
    const coordinator: AccountSyncCoordinatorPort = {
      userId: "account-a",
      sync: coordinatorSync,
      dispose: vi.fn().mockResolvedValue(undefined)
    };
    const gateway = new AccountSyncGateway(
      "account-a",
      localStore(),
      coordinator,
      dayCache,
      settings,
      {
        isOnline: () => true,
        now: () => new Date("2026-08-26T08:00:00.000Z")
      }
    );

    const startup = gateway.sync();
    const focus = gateway.sync();
    expect(startup).toBe(focus);
    releaseSettings?.();

    await expect(startup).resolves.toEqual(synced);
    expect(syncSettings).toHaveBeenCalledTimes(1);
    expect(refreshDay).toHaveBeenCalledTimes(2);
    expect(calls[0]).toBe("push-reconcile");
    expect(calls.slice(1, 3).sort()).toEqual([
      "medical_english:2026-08-26",
      "research_english:2026-08-26"
    ]);
    expect(calls.at(-1)).toBe("final-pull-merge");
    expect(coordinatorSync).toHaveBeenCalledTimes(2);
  });

  it("does not freeze assignments until the bounded push drain is complete", async () => {
    const coordinatorSync = vi
      .fn<AccountSyncCoordinatorPort["sync"]>()
      .mockResolvedValue({ status: "pending", pendingCount: 1 });
    const refreshDay = vi.fn().mockResolvedValue(undefined);
    const syncSettings = vi
      .fn<AccountSettingsSyncPort["syncRemote"]>()
      .mockResolvedValue({ timezone: "Asia/Shanghai", theme: "system" });
    const gateway = new AccountSyncGateway(
      "account-a",
      localStore(1),
      {
        userId: "account-a",
        sync: coordinatorSync,
        dispose: vi.fn().mockResolvedValue(undefined)
      },
      { userId: "account-a", refresh: refreshDay },
      { userId: "account-a", syncRemote: syncSettings },
      { isOnline: () => true }
    );

    await expect(gateway.sync()).resolves.toEqual({ status: "pending", pendingCount: 1 });
    expect(coordinatorSync).toHaveBeenCalledTimes(1);
    expect(syncSettings).not.toHaveBeenCalled();
    expect(refreshDay).not.toHaveBeenCalled();
  });
});
