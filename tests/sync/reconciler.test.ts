import { describe, expect, it } from "vitest";

import type {
  ReviewRating,
  ReviewResult,
  ReviewScheduler,
  SchedulerCard
} from "../../src/application/contracts";
import type { ReconciliationBundle, ReconciliationEvent } from "../../src/data/cloud/types";
import { reconcileReviewEvents, sortReconciliationEvents } from "../../src/sync/reconciler";

class TraceScheduler implements ReviewScheduler {
  readonly implementationVersion = "test-scheduler-v1";

  preview(): never {
    throw new Error("Preview is not used while reconciling.");
  }

  rate(card: SchedulerCard, rating: ReviewRating, now: Date): ReviewResult {
    const prior = Array.isArray(card.state.trace)
      ? card.state.trace.filter((item): item is string => typeof item === "string")
      : [];
    const trace = [...prior, `${now.toISOString()}:${rating}`];
    return {
      stateBefore: card.state,
      stateAfter: { trace },
      dueAt: new Date(now.getTime() + 86_400_000).toISOString()
    };
  }
}

function event(overrides: Partial<ReconciliationEvent>): ReconciliationEvent {
  return {
    eventId: "00000000-0000-4000-8000-000000000001",
    cardId: "card-a",
    module: "research_english",
    rating: "good",
    reviewedAt: "2026-08-26T08:00:00.000Z",
    orderingAt: "2026-08-26T08:00:00.000Z",
    clockAnomaly: false,
    deviceId: "device-a",
    deviceSequence: 1,
    baseRevision: 0,
    ...overrides
  };
}

function bundle(events: ReconciliationEvent[]): ReconciliationBundle {
  return {
    cardId: "card-a",
    module: "research_english",
    baseline: { state: {}, dueAt: null, revision: 0 },
    events,
    expectedRevision: 1,
    eventSetHash: "server-event-set-hash"
  };
}

function requireEvent(events: ReconciliationEvent[], index: number): ReconciliationEvent {
  const value = events[index];
  if (value === undefined) {
    throw new Error(`Expected reconciliation event at index ${String(index)}.`);
  }
  return value;
}

describe("deterministic per-card reconciliation", () => {
  it("sorts by ordering time, device, sequence, then event ID", () => {
    const events = [
      event({ eventId: "event-d", deviceId: "device-b", deviceSequence: 1 }),
      event({ eventId: "event-c", deviceId: "device-a", deviceSequence: 2 }),
      event({ eventId: "event-b", deviceId: "device-a", deviceSequence: 1 }),
      event({ eventId: "event-a", deviceId: "device-a", deviceSequence: 1 })
    ];

    expect(sortReconciliationEvents(events).map((item) => item.eventId)).toEqual([
      "event-a",
      "event-b",
      "event-c",
      "event-d"
    ]);
  });

  it("produces one canonical state independent of arrival order", () => {
    const events = [
      event({
        eventId: "event-1",
        rating: "again",
        orderingAt: "2026-08-26T08:00:00.000Z"
      }),
      event({
        eventId: "event-2",
        rating: "hard",
        orderingAt: "2026-08-26T09:00:00.000Z",
        deviceId: "device-b"
      }),
      event({
        eventId: "event-3",
        rating: "easy",
        orderingAt: "2026-08-26T10:00:00.000Z",
        deviceSequence: 2
      })
    ];
    const scheduler = new TraceScheduler();

    const forward = reconcileReviewEvents(bundle(events), scheduler);
    const shuffled = reconcileReviewEvents(
      bundle([requireEvent(events, 2), requireEvent(events, 0), requireEvent(events, 1)]),
      scheduler
    );

    expect(shuffled).toEqual(forward);
    expect(forward.revision).toBe(3);
    expect(forward.schedulerState.trace).toEqual([
      "2026-08-26T08:00:00.000Z:again",
      "2026-08-26T09:00:00.000Z:hard",
      "2026-08-26T10:00:00.000Z:easy"
    ]);
    expect(forward.eventSetHash).toBe("server-event-set-hash");
  });

  it("uses the server-protected ordering time for an anomalous client clock", () => {
    const result = reconcileReviewEvents(
      bundle([
        event({
          eventId: "future-clock",
          rating: "easy",
          reviewedAt: "2036-08-26T08:00:00.000Z",
          orderingAt: "2026-08-26T08:01:00.000Z",
          clockAnomaly: true
        }),
        event({
          eventId: "normal-clock",
          rating: "good",
          reviewedAt: "2026-08-26T08:02:00.000Z",
          orderingAt: "2026-08-26T08:02:00.000Z"
        })
      ]),
      new TraceScheduler()
    );

    expect(result.schedulerState.trace).toEqual([
      "2026-08-26T08:01:00.000Z:easy",
      "2026-08-26T08:02:00.000Z:good"
    ]);
  });

  it("rejects mixed-card or duplicate-event bundles", () => {
    expect(() =>
      reconcileReviewEvents(
        bundle([event({ eventId: "event-1" }), event({ eventId: "event-1" })]),
        new TraceScheduler()
      )
    ).toThrow("repeats event");
    expect(() =>
      reconcileReviewEvents(bundle([event({ cardId: "card-b" })]), new TraceScheduler())
    ).toThrow("mixes card or module scopes");
  });
});
