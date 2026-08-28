import type { SyncGateway, SyncState } from "../application/contracts";

export class LocalSyncStateStore implements SyncGateway {
  #state: SyncState;
  readonly #listeners = new Set<(state: SyncState) => void>();

  constructor(private readonly localOnly = false) {
    this.#state = localOnly
      ? { status: "local-only", pendingCount: 0 }
      : { status: "synced", pendingCount: 0 };
  }

  getState(): SyncState {
    return this.#state;
  }

  sync(): Promise<SyncState> {
    return Promise.resolve(this.#state);
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  setPendingCount(pendingCount: number): void {
    this.#state = this.localOnly
      ? { status: "local-only", pendingCount }
      : pendingCount === 0
        ? { status: "synced", pendingCount: 0 }
        : { status: "pending", pendingCount };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
