import type { ReviewScheduler, SchedulerCard } from "../application/contracts";
import type {
  ReconciledReviewState,
  ReconciliationBundle,
  ReconciliationEvent
} from "../data/cloud/types";

function compareEvents(left: ReconciliationEvent, right: ReconciliationEvent): number {
  return (
    left.orderingAt.localeCompare(right.orderingAt) ||
    left.deviceId.localeCompare(right.deviceId) ||
    left.deviceSequence - right.deviceSequence ||
    left.eventId.localeCompare(right.eventId)
  );
}

export function sortReconciliationEvents(events: ReconciliationEvent[]): ReconciliationEvent[] {
  return [...events].sort(compareEvents);
}

export function reconcileReviewEvents(
  bundle: ReconciliationBundle,
  scheduler: ReviewScheduler
): ReconciledReviewState {
  if (bundle.events.length === 0) {
    throw new Error(`Cannot reconcile card ${bundle.cardId} without events.`);
  }
  const eventIds = new Set<string>();
  let schedulerCard: SchedulerCard = {
    state: { ...bundle.baseline.state },
    dueAt: bundle.baseline.dueAt,
    revision: bundle.baseline.revision
  };
  let lastReviewedAt = "";

  for (const event of sortReconciliationEvents(bundle.events)) {
    if (event.cardId !== bundle.cardId || event.module !== bundle.module) {
      throw new Error("Reconciliation bundle mixes card or module scopes.");
    }
    if (eventIds.has(event.eventId)) {
      throw new Error(`Reconciliation bundle repeats event ${event.eventId}.`);
    }
    eventIds.add(event.eventId);
    const orderingTime = new Date(event.orderingAt);
    if (Number.isNaN(orderingTime.getTime())) {
      throw new Error(`Reconciliation event ${event.eventId} has an invalid ordering time.`);
    }
    const result = scheduler.rate(schedulerCard, event.rating, orderingTime);
    schedulerCard = {
      state: result.stateAfter,
      dueAt: result.dueAt,
      revision: schedulerCard.revision + 1
    };
    lastReviewedAt = event.orderingAt;
  }

  if (schedulerCard.dueAt === null) {
    throw new Error(`Reconciliation for card ${bundle.cardId} did not produce a due date.`);
  }

  return {
    cardId: bundle.cardId,
    module: bundle.module,
    schedulerState: schedulerCard.state,
    dueAt: schedulerCard.dueAt,
    lastReviewedAt,
    revision: schedulerCard.revision,
    schedulerImplementationVersion: scheduler.implementationVersion,
    expectedRevision: bundle.expectedRevision,
    eventSetHash: bundle.eventSetHash
  };
}
