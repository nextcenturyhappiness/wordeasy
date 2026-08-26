import type { ModuleSlug, SyncGateway, SyncState } from "../application/contracts";
import type { AccountPreferences } from "../data/cloud/accountPreferences";
import { studyDateFor } from "../domain/time";
import type { AccountLocalSyncStore } from "./contracts";

const LEARNING_MODULES: readonly ModuleSlug[] = ["research_english", "medical_english"];

export interface AccountSyncGatewayOptions {
  now?: () => Date;
  isOnline?: () => boolean;
}

export interface AccountSyncCoordinatorPort {
  readonly userId: string;
  sync(): Promise<SyncState>;
  dispose(): Promise<void>;
}

export interface AccountDayCachePort {
  readonly userId: string;
  refresh(module: ModuleSlug, studyDate: string): Promise<unknown>;
}

export interface AccountSettingsSyncPort {
  readonly userId: string;
  syncRemote(): Promise<AccountPreferences>;
}

export class AccountSyncGateway implements SyncGateway {
  readonly #listeners = new Set<(state: SyncState) => void>();
  readonly #now: () => Date;
  readonly #isOnline: () => boolean;
  #state: SyncState = { status: "synced", pendingCount: 0 };
  #activeRun: Promise<SyncState> | null = null;
  #disposed = false;

  constructor(
    readonly userId: string,
    private readonly local: AccountLocalSyncStore,
    private readonly coordinator: AccountSyncCoordinatorPort,
    private readonly dayCache: AccountDayCachePort,
    private readonly settings: AccountSettingsSyncPort,
    options: AccountSyncGatewayOptions = {}
  ) {
    if (
      userId.trim().length === 0 ||
      local.userId !== userId ||
      coordinator.userId !== userId ||
      dayCache.userId !== userId ||
      settings.userId !== userId
    ) {
      throw new Error("Account sync dependencies must share one explicit account scope.");
    }
    this.#now = options.now ?? (() => new Date());
    this.#isOnline =
      options.isOnline ?? (() => (typeof navigator === "undefined" ? true : navigator.onLine));
  }

  getState(): SyncState {
    return this.#state;
  }

  setPendingCount(pendingCount: number): void {
    if (this.#disposed) {
      return;
    }
    this.#setState(
      pendingCount === 0
        ? { status: "synced", pendingCount: 0 }
        : { status: "pending", pendingCount }
    );
  }

  sync(): Promise<SyncState> {
    if (this.#disposed) {
      return Promise.reject(new Error("Account sync gateway was disposed."));
    }
    if (this.#activeRun !== null) {
      return this.#activeRun;
    }
    this.#activeRun = this.#run().finally(() => {
      this.#activeRun = null;
    });
    return this.#activeRun;
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    if (this.#disposed) {
      throw new Error("Account sync gateway was disposed.");
    }
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  async dispose(): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;
    this.#listeners.clear();
    await this.coordinator.dispose();
    await this.#activeRun?.catch(() => undefined);
  }

  async #run(): Promise<SyncState> {
    const pendingCount = await this.local.getPendingCount();
    if (!this.#isOnline()) {
      return this.#setState({ status: "offline", pendingCount });
    }

    this.#setState({ status: "syncing", pendingCount });
    try {
      const beforeAssignments = await this.coordinator.sync();
      if (beforeAssignments.status !== "synced") {
        return this.#setState(beforeAssignments);
      }
      const preferences = await this.settings.syncRemote();
      const studyDate = studyDateFor(this.#now(), preferences.timezone);
      await Promise.all(LEARNING_MODULES.map((module) => this.dayCache.refresh(module, studyDate)));
      const afterAssignments = await this.coordinator.sync();
      return this.#setState(afterAssignments);
    } catch (error: unknown) {
      if (this.#disposed) {
        throw error;
      }
      const latestPendingCount = await this.local.getPendingCount();
      return this.#setState({
        status: "failed",
        pendingCount: latestPendingCount,
        message: error instanceof Error ? error.message : "Cloud sync failed."
      });
    }
  }

  #setState(state: SyncState): SyncState {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
    return state;
  }
}
