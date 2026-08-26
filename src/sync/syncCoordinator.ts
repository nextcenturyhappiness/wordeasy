import type { ReviewScheduler, SyncGateway, SyncState } from "../application/contracts";
import type { CloudSyncTransport } from "../data/cloud/types";
import type { AccountLocalSyncStore, SyncCoordinatorOptions, SyncRunEvidence } from "./contracts";
import { reconcileReviewEvents } from "./reconciler";
import { BrowserAccountSyncRunLock } from "./syncRunLock";

class SyncDisposedError extends Error {
  constructor() {
    super("Account-scoped sync coordinator was disposed.");
    this.name = "SyncDisposedError";
  }
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown sync failure";
}

export class CloudSyncCoordinator implements SyncGateway {
  readonly userId: string;
  readonly #listeners = new Set<(state: SyncState) => void>();
  readonly #pushBatchSize: number;
  readonly #pullPageSize: number;
  readonly #maxPullPages: number;
  readonly #now: () => Date;
  readonly #lock;
  readonly #onLocalDataChanged: () => void | Promise<void>;
  #state: SyncState = { status: "synced", pendingCount: 0 };
  #activeRun: Promise<SyncState> | null = null;
  #disposed = false;
  #adaptersDisposed = false;

  constructor(
    userId: string,
    private readonly local: AccountLocalSyncStore,
    private readonly cloud: CloudSyncTransport,
    private readonly scheduler: ReviewScheduler,
    options: SyncCoordinatorOptions = {}
  ) {
    if (userId.trim().length === 0 || local.userId !== userId || cloud.userId !== userId) {
      throw new Error("Sync coordinator dependencies must share one explicit account scope.");
    }
    this.userId = userId;
    this.#pushBatchSize = options.pushBatchSize ?? 100;
    this.#pullPageSize = options.pullPageSize ?? 200;
    this.#maxPullPages = options.maxPullPages ?? 20;
    this.#now = options.now ?? (() => new Date());
    this.#lock = options.lock ?? new BrowserAccountSyncRunLock();
    this.#onLocalDataChanged = options.onLocalDataChanged ?? (() => undefined);
  }

  getState(): SyncState {
    return this.#state;
  }

  sync(): Promise<SyncState> {
    if (this.#disposed) {
      return Promise.reject(new SyncDisposedError());
    }
    if (this.#activeRun !== null) {
      return this.#activeRun;
    }
    this.#activeRun = this.#run().finally(() => {
      this.#activeRun = null;
      if (this.#disposed) {
        this.#disposeAdapters();
      }
    });
    return this.#activeRun;
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    if (this.#disposed) {
      throw new SyncDisposedError();
    }
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    this.#disposed = true;
    this.#listeners.clear();
    if (this.#activeRun === null) {
      this.#disposeAdapters();
    }
  }

  async #run(): Promise<SyncState> {
    const locked = await this.#lock.runExclusive(this.userId, async () => this.#runLocked());
    if (!locked.acquired) {
      const pendingCount = await this.local.getPendingCount();
      return this.#setState(
        pendingCount === 0
          ? { status: "synced", pendingCount: 0 }
          : { status: "pending", pendingCount }
      );
    }
    return locked.value.state;
  }

  async #runLocked(): Promise<SyncRunEvidence> {
    const claimedEventIds = new Set<string>();
    const pushedEventIds: string[] = [];
    const conflictedCardIds = new Set<string>();
    let pullPages = 0;

    try {
      this.#assertActive();
      const pendingBefore = await this.local.getPendingCount();
      this.#setState({ status: "syncing", pendingCount: pendingBefore });

      const pushBatch = await this.local.claimPushBatch(this.#now(), this.#pushBatchSize);
      for (const event of pushBatch) {
        claimedEventIds.add(event.eventId);
      }
      this.#assertActive();

      if (pushBatch.length > 0) {
        const outcomes = await this.cloud.pushEvents(pushBatch);
        this.#assertActive();
        const pushedIds = new Set(pushBatch.map((event) => event.eventId));
        const outcomeIds = new Set(outcomes.map((outcome) => outcome.eventId));
        if (
          outcomes.length !== pushBatch.length ||
          outcomeIds.size !== outcomes.length ||
          [...outcomeIds].some((eventId) => !pushedIds.has(eventId))
        ) {
          throw new Error("Cloud push returned an incomplete or foreign outcome set.");
        }
        await this.local.applyPushOutcomes(outcomes, this.#now());
        for (const outcome of outcomes) {
          claimedEventIds.delete(outcome.eventId);
          if (outcome.status !== "rejected") {
            pushedEventIds.push(outcome.eventId);
          }
          if (outcome.status === "conflict" && outcome.cardId !== null) {
            conflictedCardIds.add(outcome.cardId);
          }
        }
      }

      let cursor = await this.local.getPullCursor();
      let hasMore = true;
      while (hasMore) {
        this.#assertActive();
        if (pullPages >= this.#maxPullPages) {
          throw new Error("Cloud pull exceeded the bounded page limit.");
        }
        const page = await this.cloud.pullChanges(cursor, this.#pullPageSize);
        this.#assertActive();
        await this.local.mergePullPage(page);
        for (const cardId of page.conflictedCardIds) {
          conflictedCardIds.add(cardId);
        }
        cursor = page.nextCursor;
        hasMore = page.hasMore;
        pullPages += 1;
      }

      for (const cardId of [...conflictedCardIds].sort()) {
        await this.#reconcileCard(cardId);
      }

      this.#assertActive();
      await this.#onLocalDataChanged();
      const pendingCount = await this.local.getPendingCount();
      const state = this.#setState(
        pendingCount === 0
          ? { status: "synced", pendingCount: 0 }
          : { status: "pending", pendingCount }
      );
      return { state, pushedEventIds, conflictedCardIds: [...conflictedCardIds], pullPages };
    } catch (error: unknown) {
      const remainingClaims = [...claimedEventIds];
      if (remainingClaims.length > 0) {
        if (this.#disposed) {
          await this.local.releasePushClaims(remainingClaims, this.#now());
        } else {
          await this.local.markPushFailure(remainingClaims, safeErrorMessage(error), this.#now());
        }
      }
      if (this.#disposed) {
        throw new SyncDisposedError();
      }
      const pendingCount = await this.local.getPendingCount();
      const state = this.#setState({
        status: "failed",
        pendingCount,
        message: safeErrorMessage(error)
      });
      return { state, pushedEventIds, conflictedCardIds: [...conflictedCardIds], pullPages };
    }
  }

  async #reconcileCard(cardId: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      this.#assertActive();
      const bundle = await this.cloud.getReconciliationBundle(cardId);
      const reconciled = reconcileReviewEvents(bundle, this.scheduler);
      const commit = await this.cloud.commitReconciliation(reconciled);
      if (commit.status === "committed") {
        await this.local.applyReconciledState(
          { ...reconciled, revision: commit.revision, eventSetHash: commit.eventSetHash },
          this.#now()
        );
        return;
      }
    }
    throw new Error(`Reconciliation for card ${cardId} remained stale after retry.`);
  }

  #setState(state: SyncState): SyncState {
    this.#state = state;
    for (const listener of this.#listeners) {
      listener(state);
    }
    return state;
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new SyncDisposedError();
    }
  }

  #disposeAdapters(): void {
    if (!this.#adaptersDisposed) {
      this.#adaptersDisposed = true;
      this.local.dispose();
      this.cloud.dispose();
    }
  }
}

export { SyncDisposedError };
