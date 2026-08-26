import type { SyncGateway, SyncState } from "../application/contracts";

export class LocalSyncStateStore implements SyncGateway {
  #state: SyncState = { status: "synced", pendingCount: 0 };
  readonly #listeners = new Set<(state: SyncState) => void>();

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
    this.#state =
      pendingCount === 0
        ? { status: "synced", pendingCount: 0 }
        : { status: "pending", pendingCount };
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }
}
