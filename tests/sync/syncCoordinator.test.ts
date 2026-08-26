import { describe, expect, it, vi } from "vitest";

import type { ReviewScheduler } from "../../src/application/contracts";
import type {
  CloudPullPage,
  CloudPushEvent,
  CloudSyncTransport,
  PullCursor,
  PushEventOutcome,
  ReconciledReviewState
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
  readonly #events: CloudPushEvent[];
  readonly pendingConflictCardIds = new Set<string>();
  pendingCount: number;
  claimCalls = 0;
  releaseCalls = 0;
  mergeCalls = 0;
  disposed = false;

  constructor(userId: string, batch: CloudPushEvent[]) {
    this.userId = userId;
    this.#events = [...batch];
    this.pendingCount = batch.length;
  }

  claimPushBatch(_now: Date, limit: number): Promise<CloudPushEvent[]> {
    this.claimCalls += 1;
    return Promise.resolve(this.#events.slice(0, limit));
  }

  applyPushOutcomes(outcomes: PushEventOutcome[]): Promise<void> {
    const completedIds = new Set(outcomes.map((outcome) => outcome.eventId));
    for (let index = this.#events.length - 1; index >= 0; index -= 1) {
      const event = this.#events[index];
      if (event !== undefined && completedIds.has(event.eventId)) {
        this.#events.splice(index, 1);
      }
    }
    this.pendingCount =
      this.#events.length + outcomes.filter((outcome) => outcome.status === "rejected").length;
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

  getPendingConflictCardIds(): Promise<string[]> {
    return Promise.resolve([...this.pendingConflictCardIds]);
  }

  mergePullPage(): Promise<void> {
    this.mergeCalls += 1;
    return Promise.resolve();
  }

  applyReconciledState(state: ReconciledReviewState): Promise<boolean> {
    this.pendingConflictCardIds.delete(state.cardId);
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
  readonly pushBatchSizes: number[] = [];
  pullCalls = 0;
  reconcileCalls = 0;
  disposed = false;
  pushGate: Promise<void> | null = null;
  outcomes: PushEventOutcome[] = [];
  page = emptyPage();

  constructor(readonly userId: string) {}

  async pushEvents(events: CloudPushEvent[]): Promise<PushEventOutcome[]> {
    this.pushCalls += 1;
    this.pushBatchSizes.push(events.length);
    if (this.pushGate !== null) {
      await this.pushGate;
    }
    return this.outcomes.length === 0
      ? events.map((event) => applied(event.eventId, event.cardId))
      : this.outcomes;
  }

  pullChanges(): Promise<CloudPullPage> {
    this.pullCalls += 1;
    return Promise.resolve(this.page);
  }

  reconcileCard(cardId: string): Promise<ReconciledReviewState> {
    this.reconcileCalls += 1;
    return Promise.resolve({
      cardId,
      module: "research_english",
      schedulerState: { trusted: true },
      dueAt: "2026-08-27T08:00:00.000Z",
      lastReviewedAt: "2026-08-26T08:00:00.000Z",
      revision: 1,
      schedulerImplementationVersion: "scheduler-v1",
      expectedRevision: 0,
      eventSetHash: "event-hash"
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
    expect(cloud.reconcileCalls).toBe(1);
  });

  it("drains more than one push batch in a single bounded sync run", async () => {
    const events = Array.from({ length: 125 }, (_, index) =>
      pushEvent(`event-${String(index).padStart(3, "0")}`, `card-${String(index)}`)
    );
    const local = new FakeLocalStore("user-a", events);
    const cloud = new FakeCloudTransport("user-a");
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler, {
      pushBatchSize: 100,
      maxPushBatches: 3
    });

    await expect(coordinator.sync()).resolves.toEqual({ status: "synced", pendingCount: 0 });
    expect(cloud.pushBatchSizes).toEqual([100, 25]);
    expect(local.claimCalls).toBe(2);
  });

  it("resumes a persisted unresolved conflict even when the event cursor has no new page", async () => {
    const local = new FakeLocalStore("user-a", []);
    local.pendingConflictCardIds.add("card-crash");
    const cloud = new FakeCloudTransport("user-a");
    const coordinator = new CloudSyncCoordinator("user-a", local, cloud, scheduler);

    await expect(coordinator.sync()).resolves.toEqual({ status: "synced", pendingCount: 0 });
    expect(cloud.pullCalls).toBe(1);
    expect(cloud.reconcileCalls).toBe(1);
    expect(local.pendingConflictCardIds.size).toBe(0);
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
