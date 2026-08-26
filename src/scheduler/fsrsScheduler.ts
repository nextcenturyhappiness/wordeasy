import { Rating, createEmptyCard, fsrs, type Card, type Grade } from "ts-fsrs";

import type {
  RatingPreview,
  ReviewRating,
  ReviewResult,
  ReviewScheduler,
  SchedulerCard
} from "../application/contracts";

export const FSRS_IMPLEMENTATION_VERSION = "ts-fsrs@5.4.1/default-v1";
const SERIALIZATION_FORMAT = "wordeasy-fsrs-card-v1";

interface CardWithLegacyElapsedDays {
  elapsed_days: number;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Invalid persisted FSRS ${field}.`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`Invalid persisted FSRS ${field}.`);
  }
  return value;
}

function serializeCard(card: Card): Record<string, unknown> {
  const { elapsed_days: elapsedDays } = card as unknown as CardWithLegacyElapsedDays;
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

function deserializeCard(state: Record<string, unknown>, now: Date): Card {
  if (Object.keys(state).length === 0) {
    return createEmptyCard(now);
  }
  if (state.format !== SERIALIZATION_FORMAT) {
    throw new Error("Unsupported persisted FSRS state format.");
  }

  const lastReview = state.lastReview;
  if (lastReview !== null && typeof lastReview !== "string") {
    throw new Error("Invalid persisted FSRS lastReview.");
  }

  return {
    due: new Date(requireString(state.due, "due")),
    stability: requireNumber(state.stability, "stability"),
    difficulty: requireNumber(state.difficulty, "difficulty"),
    elapsed_days: requireNumber(state.elapsedDays, "elapsedDays"),
    scheduled_days: requireNumber(state.scheduledDays, "scheduledDays"),
    learning_steps: requireNumber(state.learningSteps, "learningSteps"),
    reps: requireNumber(state.reps, "reps"),
    lapses: requireNumber(state.lapses, "lapses"),
    state: requireNumber(state.state, "state"),
    ...(lastReview === null ? {} : { last_review: new Date(lastReview) })
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

export class FsrsSchedulerAdapter implements ReviewScheduler {
  readonly implementationVersion = FSRS_IMPLEMENTATION_VERSION;
  readonly #scheduler = fsrs({ enable_fuzz: false });

  preview(card: SchedulerCard, now: Date): RatingPreview {
    const preview = this.#scheduler.repeat(deserializeCard(card.state, now), now);
    return {
      intervals: {
        again: preview[Rating.Again].card.due.toISOString(),
        hard: preview[Rating.Hard].card.due.toISOString(),
        good: preview[Rating.Good].card.due.toISOString(),
        easy: preview[Rating.Easy].card.due.toISOString()
      }
    };
  }

  rate(card: SchedulerCard, rating: ReviewRating, now: Date): ReviewResult {
    const before = deserializeCard(card.state, now);
    const result = this.#scheduler.next(before, now, toGrade(rating));
    return {
      stateBefore: serializeCard(before),
      stateAfter: serializeCard(result.card),
      dueAt: result.card.due.toISOString()
    };
  }
}
