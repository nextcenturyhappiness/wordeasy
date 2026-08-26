import { Rating, createEmptyCard, fsrs, type Card, type Grade } from "npm:ts-fsrs@5.4.1";

export const FSRS_IMPLEMENTATION_VERSION = "ts-fsrs@5.4.1/default-v1";
const SERIALIZATION_FORMAT = "wordeasy-fsrs-card-v1";

export type ReviewRating = "again" | "hard" | "good" | "easy";

export interface ReconciliationEvent {
  eventId: string;
  cardId: string;
  module: "research_english" | "medical_english";
  rating: ReviewRating;
  orderingAt: string;
  deviceId: string;
  deviceSequence: number;
}

export interface ReconciliationBundle {
  cardId: string;
  module: "research_english" | "medical_english";
  events: ReconciliationEvent[];
  expectedRevision: number;
  eventSetHash: string;
}

export interface TrustedSchedulerState {
  schedulerState: Record<string, unknown>;
  dueAt: string;
  lastReviewedAt: string;
  revision: number;
}

interface LegacyCardShape {
  elapsed_days: number;
}

function serializeCard(card: Card): Record<string, unknown> {
  const { elapsed_days: elapsedDays } = card as unknown as LegacyCardShape;
  return {
    format: SERIALIZATION_FORMAT,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review?.toISOString() ?? null
  };
}

function toGrade(rating: ReviewRating): Grade {
  switch (rating) {
    case "again":
      return Rating.Again;
    case "hard":
      return Rating.Hard;
    case "good":
      return Rating.Good;
    case "easy":
      return Rating.Easy;
  }
}

function compareEvents(left: ReconciliationEvent, right: ReconciliationEvent): number {
  return (
    left.orderingAt.localeCompare(right.orderingAt) ||
    left.deviceId.localeCompare(right.deviceId) ||
    left.deviceSequence - right.deviceSequence ||
    left.eventId.localeCompare(right.eventId)
  );
}

export function replayFsrs(bundle: ReconciliationBundle): TrustedSchedulerState {
  if (bundle.events.length === 0) {
    throw new Error("Cannot reconcile an empty event set.");
  }

  const scheduler = fsrs({ enable_fuzz: false });
  let card: Card | null = null;
  let lastReviewedAt = "";
  const eventIds = new Set<string>();

  for (const event of [...bundle.events].sort(compareEvents)) {
    if (event.cardId !== bundle.cardId || event.module !== bundle.module) {
      throw new Error("Reconciliation bundle escaped its card or module scope.");
    }
    if (eventIds.has(event.eventId)) {
      throw new Error("Reconciliation bundle repeated an event ID.");
    }
    eventIds.add(event.eventId);
    const orderingAt = new Date(event.orderingAt);
    if (Number.isNaN(orderingAt.getTime())) {
      throw new Error("Reconciliation event has an invalid ordering time.");
    }
    const priorCard: Card = card ?? createEmptyCard(orderingAt);
    card = scheduler.next(priorCard, orderingAt, toGrade(event.rating)).card;
    lastReviewedAt = orderingAt.toISOString();
  }

  if (card === null) {
    throw new Error("Reconciliation did not produce an FSRS card.");
  }

  return {
    schedulerState: serializeCard(card),
    dueAt: card.due.toISOString(),
    lastReviewedAt,
    revision: bundle.events.length
  };
}
