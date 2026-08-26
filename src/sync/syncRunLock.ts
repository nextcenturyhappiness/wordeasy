import type { SyncRunLock } from "./contracts";

const FALLBACK_ACTIVE_ACCOUNTS = new Set<string>();

export class BrowserAccountSyncRunLock implements SyncRunLock {
  async runExclusive<T>(
    accountKey: string,
    task: () => Promise<T>
  ): Promise<{ acquired: true; value: T } | { acquired: false }> {
    const lockManager = (globalThis as unknown as { navigator?: { locks?: LockManager } }).navigator
      ?.locks;
    if (lockManager !== undefined) {
      return lockManager.request(
        `wordeasy-sync:${accountKey}`,
        { ifAvailable: true, mode: "exclusive" },
        async (lock): Promise<{ acquired: true; value: T } | { acquired: false }> => {
          if (lock === null) {
            return { acquired: false };
          }
          return { acquired: true, value: await task() };
        }
      );
    }

    if (FALLBACK_ACTIVE_ACCOUNTS.has(accountKey)) {
      return { acquired: false };
    }
    FALLBACK_ACTIVE_ACCOUNTS.add(accountKey);
    try {
      return { acquired: true, value: await task() };
    } finally {
      FALLBACK_ACTIVE_ACCOUNTS.delete(accountKey);
    }
  }
}
