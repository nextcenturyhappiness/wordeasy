import { describe, expect, it, vi } from "vitest";

import type { ReviewScheduler } from "../../src/application/contracts";
import type {
  CloudPullPage,
  CloudPushEvent,
  CloudSyncTransport,
  PullCursor,
  PushEventOutcome,
  ReconciledReviewState,
  ReconciliationBundle,
  ReconciliationCommitResult
} from "../../src/data/cloud/types";
import { INITIAL_PULL_CURSOR, type AccountLocalSyncStore } from "../../src/sync/contracts";
import { CloudSyncCoordinator, SyncDisposedError } from "../../src/sync/syncCoordinator";

function pushEvent(eventId: string, cardId = "card-a"): CloudPushEvent {
  return {
    eventId,
    presentationActionId: `action-${eventId}`,
    userId: "user-a",
    cardId,
    wordSenseId: `sense-${cardId}`,
    module: "research_english",
    queue: "new",
    studyDate: "2026-08-26",
    rating: "good",
    reviewedAt: "2026-08-26T08:00:00.000Z",
    timezone: "Asia/Shanghai",
    deviceId: "device-a",
    deviceSequence: 1,
    baseRevision: 0,
    schedulerBefore: {},
    schedulerAfter: { due: "2026-08-27T08:00:00.000Z" },
    schedulerImplementationVersion: "scheduler-v1",
    syncStatus: "pending",
    createdAt: "2026-08-26T08:00:00.000Z",
    dueAt: "2026-08-27T08:00:00.000Z"
  };
}

function emptyPage(cursor: PullCursor = INITIAL_PULL_CURSOR): CloudPullPage {
  return {
    events: [],
    states: [],
    conflictedCardIds: [],
    nextCursor: cursor,
    hasMore: false
  };
}

class FakeLocalStore implements AccountLocalSyncStore {
  readonly userId: string;
  readonly batch: CloudPushEvent[];
  pendingCount: number;
  claimCalls = 0;
  releaseCalls = 0;
  mergeCalls = 0;
  disposed = false;

  constructor(userId: string, batch: CloudPushEvent[]) {
    this.userId = userId;
    this.batch = batch;
    this.pendingCount = batch.length;
  }

  claimPushBatch(): Promise<CloudPushEvent[]> {
    this.claimCalls += 1;
    return Promise.resolve(this.batch);
  }

  applyPushOutcomes(outcomes: PushEventOutcome[]): Promise<void> {
    this.pendingCount = outcomes.filter((outcome) => outcome.status === "rejected").length;
    return Promise.resolve();
  }

  markPushFailure(): Promise<void> {
    return Promise.resolve();
  }

  releasePushClaims(): Promise<void> {
    this.releaseCalls += 1;
    return Promise.resolve();
  }

  getPullCursor(): Promise<PullCursor> {
    return Promise.resolve(INITIAL_PULL_CURSOR);
  }

  mergePullPage(): Promise<void> {
    this.mergeCalls += 1;
    return Promise.resolve();
  }

  applyReconciledState(): Promise<boolean> {
    return Promise.resolve(true);
  }

  getPendingCount(): Promise<number> {
    return Promise.resolve(this.pendingCount);
  }

  dispose(): void {
    this.disposed = true;
  }
}

class FakeCloudTransport implements CloudSyncTransport {
  pushCalls = 0;
  pullCalls = 0;
  bundleCalls = 0;
  commitCalls = 0;
  disposed = false;
  pushGate: Promise<void> | null = null;
  outcomes: PushEventOutcome[] = [];
  page = emptyPage();

  constructor(readonly userId: string) {}

  async pushEvents(): Promise<PushEventOutcome[]> {
    this.pushCalls += 1;
    if (this.pushGate !== null) {
      await this.pushGate;
    }
    return this.outcomes;
  }

  pullChanges(): Promise<CloudPullPage> {
    this.pullCalls += 1;
    return Promise.resolve(this.page);
  }

  getReconciliationBundle(cardId: string): Promise<ReconciliationBundle> {
    this.bundleCalls += 1;
    return Promise.resolve({
      cardId,
      module: "research_english",
      baseline: { state: {}, dueAt: null, revision: 0 },
      events: [
        {
          eventId: "event-a",
          cardId,
          module: "research_english",
          rating: "good",
          reviewedAt: "2026-08-26T08:00:00.000Z",
          orderingAt: "2026-08-26T08:00:00.000Z",
          clockAnomaly: false,
          deviceId: "device-a",
          deviceSequence: 1,
          baseRevision: 0
        }
      ],
      expectedRevision: 0,
      eventSetHash: "event-hash"
    });
  }

  commitReconciliation(state: ReconciledReviewState): Promise<ReconciliationCommitResult> {
    this.commitCalls += 1;
    return Promise.resolve({
      status: "committed",
      revision: state.revision,
      eventSetHash: state.eventSetHash
    });
  }

  dispose(): void {
    this.disposed = true;
  }
}

const scheduler: ReviewScheduler = {
  implementationVersion: "scheduler-v1",
  preview: () => ({ intervals: { again: "", hard: "", good: "", easy: "" } }),
  rate: (card, _rating, now) => ({
    stateBefore: card.state,
    stateAfter: { reviewed: now.toISOString() },
    dueAt: new Date(now.getTime() + 1000).toISOString()
  })
};

function applied(eventId: string, cardId = "card-a"): PushEventOutcome {
  return {
    eventId,
    cardId,
    status: "applied",
    applicationStatus: "applied",
    canonicalRevision: 1,
    reason: null,
    clockAnomaly: false
  };
}

describe("account-scoped sync coordinator", () => {
  it("rejects dependencies from a different account", () => {
    expect(
      () =>
        new CloudSyncCoordinator(
          "user-a",
          new FakeLocalStore("user-b", []),
          new FakeCloudTransport("user-a"),
          scheduler
        )
    ).toThrow("one explicit account scope");
  });

  it("coalesces simultaneous startup/focus/online triggers into one loop", async () => {
    let releasePush: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releasePush = resolve;
    });
    const local = new FakeLocalStore("user-a", [pushEvent("event-a")]);
    const cloud = new FakeCloudTransport("user-a");
    cloud.pushGate = gate;
    cloud.outcomes = [applied("event-a")];
    const changed = vi.fn();
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler, {
      onLocalDataChanged: changed
    });

    const startup = coordinator.sync();
    const focus = coordinator.sync();
    const online = coordinator.sync();
    await vi.waitFor(() => {
      expect(cloud.pushCalls).toBe(1);
    });
    if (releasePush !== undefined) {
      releasePush();
    }

    await expect(Promise.all([startup, focus, online])).resolves.toEqual([
      { status: "synced", pendingCount: 0 },
      { status: "synced", pendingCount: 0 },
      { status: "synced", pendingCount: 0 }
    ]);
    expect(local.claimCalls).toBe(1);
    expect(cloud.pullCalls).toBe(1);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("keeps a rejected event pending while acknowledging successful peers", async () => {
    const local = new FakeLocalStore("user-a", [pushEvent("event-a"), pushEvent("event-b")]);
    const cloud = new FakeCloudTransport("user-a");
    cloud.outcomes = [
      applied("event-a"),
      {
        eventId: "event-b",
        cardId: "card-a",
        status: "rejected",
        applicationStatus: null,
        canonicalRevision: null,
        reason: "invalid_event",
        clockAnomaly: false
      }
    ];
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler);

    await expect(coordinator.sync()).resolves.toEqual({ status: "pending", pendingCount: 1 });
    expect(local.pendingCount).toBe(1);
    expect(cloud.pushCalls).toBe(1);
  });

  it("reconciles only conflict cards before publishing local-data change", async () => {
    const local = new FakeLocalStore("user-a", [pushEvent("event-a", "card-a")]);
    const cloud = new FakeCloudTransport("user-a");
    cloud.outcomes = [
      {
        ...applied("event-a"),
        status: "conflict",
        applicationStatus: "pending_reconciliation",
        canonicalRevision: null,
        reason: "base_revision_mismatch"
      }
    ];
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler);

    await expect(coordinator.sync()).resolves.toEqual({ status: "synced", pendingCount: 0 });
    expect(cloud.bundleCalls).toBe(1);
    expect(cloud.commitCalls).toBe(1);
  });

  it("releases claimed outbox rows and disposes adapters when the account changes", async () => {
    let releasePush: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releasePush = resolve;
    });
    const local = new FakeLocalStore("user-a", [pushEvent("event-a")]);
    const cloud = new FakeCloudTransport("user-a");
    cloud.pushGate = gate;
    cloud.outcomes = [applied("event-a")];
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler);

    const running = coordinator.sync();
    await vi.waitFor(() => {
      expect(cloud.pushCalls).toBe(1);
    });
    const disposal = coordinator.dispose();
    if (releasePush !== undefined) {
      releasePush();
    }

    await expect(running).rejects.toBeInstanceOf(SyncDisposedError);
    await disposal;
    expect(local.releaseCalls).toBe(1);
    expect(local.disposed).toBe(true);
    expect(cloud.disposed).toBe(true);
    await expect(coordinator.sync()).rejects.toBeInstanceOf(SyncDisposedError);
  });
});
