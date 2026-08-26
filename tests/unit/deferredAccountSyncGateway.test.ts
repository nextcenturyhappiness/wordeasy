import { describe, expect, it, vi } from "vitest";

import type { SyncState } from "../../src/application/contracts";
import { DeferredAccountSyncGateway } from "../../src/data/cloudRuntime";

describe("DeferredAccountSyncGateway", () => {
  it("keeps the startup state local and loads the full sync runtime only on sync", async () => {
    let loads = 0;
    let delegateState: SyncState = { status: "synced", pendingCount: 0 };
    const listeners = new Set<(state: SyncState) => void>();
    const dispose = vi.fn(() => Promise.resolve());
    const gateway = new DeferredAccountSyncGateway(() => {
      loads += 1;
      return Promise.resolve({
        getState: () => delegateState,
        setPendingCount: (pendingCount: number) => {
          delegateState =
            pendingCount === 0
              ? { status: "synced", pendingCount: 0 }
              : { status: "pending", pendingCount };
          for (const listener of listeners) {
            listener(delegateState);
          }
        },
        subscribe: (listener: (state: SyncState) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        sync: () => {
          delegateState = { status: "synced", pendingCount: 0 };
          for (const listener of listeners) {
            listener(delegateState);
          }
          return Promise.resolve(delegateState);
        },
        dispose
      });
    });

    gateway.setPendingCount(3);
    expect(gateway.getState()).toEqual({ status: "pending", pendingCount: 3 });
    expect(loads).toBe(0);

    const observed: SyncState[] = [];
    gateway.subscribe((state) => observed.push(state));
    await expect(gateway.sync()).resolves.toEqual({ status: "synced", pendingCount: 0 });
    expect(loads).toBe(1);
    expect(observed.at(-1)).toEqual({ status: "synced", pendingCount: 0 });

    await gateway.sync();
    expect(loads).toBe(1);
    await gateway.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it("surfaces a deferred chunk failure without losing the pending count", async () => {
    const gateway = new DeferredAccountSyncGateway(() =>
      Promise.reject(new Error("sync chunk unavailable"))
    );
    gateway.setPendingCount(2);

    await expect(gateway.sync()).resolves.toEqual({
      status: "failed",
      pendingCount: 2,
      message: "sync chunk unavailable"
    });
  });
});
