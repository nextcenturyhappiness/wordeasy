import { describe, expect, it } from "vitest";

import type { SchedulerCard } from "../../src/application/contracts";
import { FsrsSchedulerAdapter } from "../../src/scheduler/fsrsScheduler";
import {
  FSRS_IMPLEMENTATION_VERSION,
  replayFsrs,
  type ReconciliationBundle
} from "../../supabase/functions/_shared/fsrs";

const orderedEvents: ReconciliationBundle["events"] = [
  {
    eventId: "event-b",
    cardId: "card-a",
    module: "research_english",
    rating: "again",
    orderingAt: "2026-08-28T08:00:00.000Z",
    deviceId: "device-b",
    deviceSequence: 2
  },
  {
    eventId: "event-a",
    cardId: "card-a",
    module: "research_english",
    rating: "good",
    orderingAt: "2026-08-26T08:00:00.000Z",
    deviceId: "device-a",
    deviceSequence: 1
  },
  {
    eventId: "event-c",
    cardId: "card-a",
    module: "research_english",
    rating: "easy",
    orderingAt: "2026-08-29T08:00:00.000Z",
    deviceId: "device-a",
    deviceSequence: 3
  },
  {
    eventId: "event-d",
    cardId: "card-a",
    module: "research_english",
    rating: "hard",
    orderingAt: "2026-08-29T08:00:00.000Z",
    deviceId: "device-b",
    deviceSequence: 4
  }
];
const firstEvent = orderedEvents[0];
if (firstEvent === undefined) {
  throw new Error("Golden Edge replay fixture requires at least one event.");
}

function bundle(events: ReconciliationBundle["events"]): ReconciliationBundle {
  return {
    cardId: "card-a",
    module: "research_english",
    events,
    expectedRevision: 0,
    eventSetHash: "golden-event-set"
  };
}

describe("trusted Edge FSRS replay", () => {
  it("matches the browser adapter golden state for the same ordered event history", () => {
    const edge = replayFsrs(bundle(orderedEvents));
    const browser = new FsrsSchedulerAdapter();
    let card: SchedulerCard = { state: {}, dueAt: null, revision: 0 };

    for (const event of [...orderedEvents].sort(
      (left, right) =>
        left.orderingAt.localeCompare(right.orderingAt) ||
        left.deviceId.localeCompare(right.deviceId) ||
        left.deviceSequence - right.deviceSequence ||
        left.eventId.localeCompare(right.eventId)
    )) {
      const result = browser.rate(card, event.rating, new Date(event.orderingAt));
      card = {
        state: result.stateAfter,
        dueAt: result.dueAt,
        revision: card.revision + 1
      };
    }

    expect(FSRS_IMPLEMENTATION_VERSION).toBe(browser.implementationVersion);
    expect(edge.schedulerState).toEqual(card.state);
    expect(edge.dueAt).toBe(card.dueAt);
    expect(edge.lastReviewedAt).toBe("2026-08-29T08:00:00.000Z");
    expect(edge.revision).toBe(orderedEvents.length);
  });

  it("is deterministic for shuffled input and rejects mixed or duplicate evidence", () => {
    expect(replayFsrs(bundle(orderedEvents))).toEqual(
      replayFsrs(bundle([...orderedEvents].reverse()))
    );
    expect(() => replayFsrs(bundle([...orderedEvents, firstEvent]))).toThrow(
      "repeated an event ID"
    );
    expect(() =>
      replayFsrs(
        bundle([
          ...orderedEvents,
          {
            ...firstEvent,
            eventId: "event-foreign",
            cardId: "card-foreign"
          }
        ])
      )
    ).toThrow("escaped its card or module scope");
  });
});
