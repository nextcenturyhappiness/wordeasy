import type { SyncState } from "../application/contracts";
import type {
  CloudPullPage,
  CloudPushEvent,
  PullCursor,
  PushEventOutcome,
  ReconciledReviewState
} from "../data/cloud/types";

export const INITIAL_PULL_CURSOR: PullCursor = {
  receivedAt: "1970-01-01T00:00:00.000Z",
  eventId: "00000000-0000-0000-0000-000000000000"
};

export interface AccountLocalSyncStore {
  readonly userId: string;
  claimPushBatch(now: Date, limit: number): Promise<CloudPushEvent[]>;
  applyPushOutcomes(outcomes: PushEventOutcome[], now: Date): Promise<void>;
  markPushFailure(eventIds: string[], message: string, now: Date): Promise<void>;
  releasePushClaims(eventIds: string[], now: Date): Promise<void>;
  getPullCursor(): Promise<PullCursor>;
  mergePullPage(page: CloudPullPage): Promise<void>;
  applyReconciledState(state: ReconciledReviewState, now: Date): Promise<boolean>;
  getPendingCount(): Promise<number>;
  dispose(): void;
}

export interface SyncRunLock {
  runExclusive<T>(
    accountKey: string,
    task: () => Promise<T>
  ): Promise<{ acquired: true; value: T } | { acquired: false }>;
}

export interface SyncCoordinatorOptions {
  pushBatchSize?: number;
  pullPageSize?: number;
  maxPullPages?: number;
  now?: () => Date;
  lock?: SyncRunLock;
  onLocalDataChanged?: () => void | Promise<void>;
}

export interface SyncRunEvidence {
  state: SyncState;
  pushedEventIds: string[];
  conflictedCardIds: string[];
  pullPages: number;
}
