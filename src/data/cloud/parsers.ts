import type { ModuleSlug, ReviewRating, SchedulerCard } from "../../application/contracts";
import type {
  CloudContextCard,
  CloudDailyLearningSnapshot,
  CloudNewAssignment,
  CloudNewAssignmentSet,
  CloudPullPage,
  CloudReviewAssignment,
  CloudReviewAssignmentSet,
  PullCursor,
  PushEventOutcome,
  ReconciledReviewState,
  ReconciliationBundle,
  ReconciliationCommitResult,
  ReconciliationEvent,
  RemoteReviewEvent,
  RemoteReviewState
} from "./types";

export class CloudPayloadError extends Error {
  constructor(path: string, expectation: string) {
    super(`Invalid cloud payload at ${path}: expected ${expectation}.`);
    this.name = "CloudPayloadError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CloudPayloadError(path, "object");
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new CloudPayloadError(path, "array");
  }
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CloudPayloadError(path, "non-empty string");
  }
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : string(value, path);
}

function integer(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new CloudPayloadError(path, "safe integer");
  }
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new CloudPayloadError(path, "boolean");
  }
  return value;
}

function isoString(value: unknown, path: string): string {
  const parsed = string(value, path);
  if (Number.isNaN(Date.parse(parsed))) {
    throw new CloudPayloadError(path, "ISO date-time string");
  }
  return parsed;
}

function moduleSlug(value: unknown, path: string): ModuleSlug {
  if (value !== "research_english" && value !== "medical_english") {
    throw new CloudPayloadError(path, "known module slug");
  }
  return value;
}

function rating(value: unknown, path: string): ReviewRating {
  if (value !== "again" && value !== "hard" && value !== "good" && value !== "easy") {
    throw new CloudPayloadError(path, "review rating");
  }
  return value;
}

function schedulerState(value: unknown, path: string): Record<string, unknown> {
  return record(value, path);
}

function newAssignment(value: unknown, path: string): CloudNewAssignment {
  const item = record(value, path);
  return {
    cardId: string(item.card_id, `${path}.card_id`),
    category: string(item.category, `${path}.category`),
    position: integer(item.position, `${path}.position`)
  };
}

export function parseNewAssignmentSet(value: unknown): CloudNewAssignmentSet {
  const item = record(value, "assignment");
  const status = string(item.status, "assignment.status");
  const module = moduleSlug(item.module, "assignment.module");
  const assignments = array(item.assignments, "assignment.assignments").map((assignment, index) =>
    newAssignment(assignment, `assignment.assignments[${String(index)}]`)
  );
  const common = {
    setId: string(item.set_id, "assignment.set_id"),
    module,
    studyDate: string(item.study_date, "assignment.study_date"),
    timezone: string(item.timezone, "assignment.timezone")
  };

  if (status === "shortage") {
    if (assignments.length !== 0) {
      throw new CloudPayloadError("assignment.assignments", "empty shortage assignment");
    }
    const shortage = record(item.shortage, "assignment.shortage");
    return {
      ...common,
      status: "shortage",
      shortage: {
        code: "content_shortage",
        category: nullableString(shortage.category, "assignment.shortage.category"),
        required: integer(shortage.required, "assignment.shortage.required"),
        available: integer(shortage.available, "assignment.shortage.available"),
        message: string(shortage.message, "assignment.shortage.message")
      },
      assignments: []
    };
  }

  if (status !== "ready") {
    throw new CloudPayloadError("assignment.status", "ready or shortage");
  }
  if (item.shortage !== null || assignments.length !== 10) {
    throw new CloudPayloadError("assignment", "ready all-or-nothing set of 10 cards");
  }
  if (module === "research_english") {
    const counts = new Map<string, number>();
    for (const assignment of assignments) {
      counts.set(assignment.category, (counts.get(assignment.category) ?? 0) + 1);
    }
    if (
      counts.get("general_research") !== 5 ||
      counts.get("statistics_methodology") !== 2 ||
      counts.get("bioinformatics") !== 3 ||
      counts.size !== 3
    ) {
      throw new CloudPayloadError("assignment.assignments", "Research 5+2+3 quota");
    }
  }
  return { ...common, status: "ready", shortage: null, assignments };
}

function reviewAssignment(value: unknown, path: string): CloudReviewAssignment {
  const item = record(value, path);
  return {
    cardId: string(item.card_id, `${path}.card_id`),
    position: integer(item.position, `${path}.position`),
    dueAtSnapshot: isoString(item.due_at_snapshot, `${path}.due_at_snapshot`)
  };
}

export function parseReviewAssignmentSet(value: unknown): CloudReviewAssignmentSet {
  const item = record(value, "review_assignment");
  if (item.status !== "ready") {
    throw new CloudPayloadError("review_assignment.status", "ready");
  }
  return {
    status: "ready",
    setId: string(item.set_id, "review_assignment.set_id"),
    module: moduleSlug(item.module, "review_assignment.module"),
    studyDate: string(item.study_date, "review_assignment.study_date"),
    timezone: string(item.timezone, "review_assignment.timezone"),
    cutoffAt: isoString(item.cutoff_at, "review_assignment.cutoff_at"),
    assignments: array(item.assignments, "review_assignment.assignments").map((assignment, index) =>
      reviewAssignment(assignment, `review_assignment.assignments[${String(index)}]`)
    )
  };
}

function contextCard(value: unknown, path: string): CloudContextCard {
  const item = record(value, path);
  const sourceType = item.source_type;
  if (sourceType !== "original_example" && sourceType !== "verified_source") {
    throw new CloudPayloadError(`${path}.source_type`, "known source type");
  }
  return {
    cardId: string(item.card_id, `${path}.card_id`),
    wordId: string(item.word_id, `${path}.word_id`),
    wordSenseId: string(item.word_sense_id, `${path}.word_sense_id`),
    contextId: string(item.context_id, `${path}.context_id`),
    module: moduleSlug(item.module, `${path}.module`),
    category: string(item.category, `${path}.category`),
    lemma: string(item.lemma, `${path}.lemma`),
    displayForm: string(item.display_form, `${path}.display_form`),
    ipa: string(item.ipa, `${path}.ipa`),
    partOfSpeech: string(item.part_of_speech, `${path}.part_of_speech`),
    meaningEn: string(item.meaning_en, `${path}.meaning_en`),
    meaningZh: string(item.meaning_zh, `${path}.meaning_zh`),
    usageNote: string(item.usage_note, `${path}.usage_note`),
    contextSentence: string(item.context_sentence, `${path}.context_sentence`),
    targetText: string(item.target_text, `${path}.target_text`),
    plainEnglishParaphrase: string(
      item.plain_english_paraphrase,
      `${path}.plain_english_paraphrase`
    ),
    sentenceTranslationZh: string(item.sentence_translation_zh, `${path}.sentence_translation_zh`),
    collocations: array(item.collocations, `${path}.collocations`).map((entry, index) =>
      string(entry, `${path}.collocations[${String(index)}]`)
    ),
    sourceType,
    sourceTitle: nullableString(item.source_title, `${path}.source_title`),
    sourceUrl: nullableString(item.source_url, `${path}.source_url`),
    doi: nullableString(item.doi, `${path}.doi`),
    pmid: nullableString(item.pmid, `${path}.pmid`)
  };
}

export function parseDailyLearningSnapshot(value: unknown): CloudDailyLearningSnapshot {
  const item = record(value, "daily_snapshot");
  return {
    newAssignment: item.new_assignment === null ? null : parseNewAssignmentSet(item.new_assignment),
    reviewAssignment:
      item.review_assignment === null ? null : parseReviewAssignmentSet(item.review_assignment),
    cards: array(item.cards, "daily_snapshot.cards").map((card, index) =>
      contextCard(card, `daily_snapshot.cards[${String(index)}]`)
    )
  };
}

export function parsePushOutcomes(value: unknown): PushEventOutcome[] {
  return array(value, "push_outcomes").map((outcome, index) => {
    const path = `push_outcomes[${String(index)}]`;
    const item = record(outcome, path);
    const status = item.status;
    if (
      status !== "applied" &&
      status !== "duplicate" &&
      status !== "conflict" &&
      status !== "rejected"
    ) {
      throw new CloudPayloadError(`${path}.status`, "push outcome status");
    }
    return {
      eventId: string(item.event_id, `${path}.event_id`),
      cardId: nullableString(item.card_id ?? null, `${path}.card_id`),
      status,
      applicationStatus: nullableString(
        item.application_status ?? null,
        `${path}.application_status`
      ),
      canonicalRevision:
        item.canonical_revision === null || item.canonical_revision === undefined
          ? null
          : integer(item.canonical_revision, `${path}.canonical_revision`),
      reason: nullableString(item.reason ?? null, `${path}.reason`),
      clockAnomaly:
        item.clock_anomaly === undefined
          ? false
          : boolean(item.clock_anomaly, `${path}.clock_anomaly`)
    };
  });
}

function remoteReviewEvent(value: unknown, path: string): RemoteReviewEvent {
  const item = record(value, path);
  const queue = item.queue_kind;
  if (queue !== "new" && queue !== "review") {
    throw new CloudPayloadError(`${path}.queue_kind`, "queue kind");
  }
  return {
    eventId: string(item.event_id, `${path}.event_id`),
    cardId: string(item.card_id, `${path}.card_id`),
    wordSenseId: string(item.word_sense_id, `${path}.word_sense_id`),
    module: moduleSlug(item.module, `${path}.module`),
    presentationActionId: string(item.presentation_action_id, `${path}.presentation_action_id`),
    queue,
    studyDate: string(item.study_date, `${path}.study_date`),
    timezone: string(item.timezone, `${path}.timezone`),
    rating: rating(item.rating, `${path}.rating`),
    reviewedAt: isoString(item.reviewed_at, `${path}.reviewed_at`),
    receivedAt: isoString(item.received_at, `${path}.received_at`),
    orderingAt: isoString(item.ordering_at, `${path}.ordering_at`),
    clockAnomaly: boolean(item.clock_anomaly, `${path}.clock_anomaly`),
    deviceId: string(item.device_id, `${path}.device_id`),
    deviceSequence: integer(item.device_sequence, `${path}.device_sequence`),
    baseRevision: integer(item.base_revision, `${path}.base_revision`),
    schedulerBefore: schedulerState(item.scheduler_before, `${path}.scheduler_before`),
    schedulerAfter: schedulerState(item.scheduler_after, `${path}.scheduler_after`),
    dueAt: isoString(item.due_at, `${path}.due_at`),
    schedulerImplementationVersion: string(
      item.scheduler_implementation_version,
      `${path}.scheduler_implementation_version`
    ),
    applicationStatus: string(item.application_status, `${path}.application_status`),
    canonicalRevision:
      item.canonical_revision === null
        ? null
        : integer(item.canonical_revision, `${path}.canonical_revision`),
    conflictReason: nullableString(item.conflict_reason, `${path}.conflict_reason`)
  };
}

function remoteReviewState(value: unknown, path: string): RemoteReviewState {
  const item = record(value, path);
  return {
    cardId: string(item.card_id, `${path}.card_id`),
    module: moduleSlug(item.module, `${path}.module`),
    schedulerState: schedulerState(item.scheduler_state, `${path}.scheduler_state`),
    dueAt: item.due_at === null ? null : isoString(item.due_at, `${path}.due_at`),
    lastReviewedAt: isoString(item.last_reviewed_at, `${path}.last_reviewed_at`),
    revision: integer(item.revision, `${path}.revision`),
    schedulerImplementationVersion: string(
      item.scheduler_implementation_version,
      `${path}.scheduler_implementation_version`
    ),
    canonicalEventSetHash: nullableString(
      item.canonical_event_set_hash,
      `${path}.canonical_event_set_hash`
    ),
    updatedAt: isoString(item.updated_at, `${path}.updated_at`)
  };
}

function pullCursor(value: unknown, path: string): PullCursor {
  const item = record(value, path);
  return {
    receivedAt: isoString(item.received_at, `${path}.received_at`),
    eventId: string(item.event_id, `${path}.event_id`),
    stateSequence: integer(item.state_sequence, `${path}.state_sequence`),
    stateEpoch: string(item.state_epoch, `${path}.state_epoch`)
  };
}

export function parsePullPage(value: unknown): CloudPullPage {
  const item = record(value, "pull_page");
  return {
    events: array(item.events, "pull_page.events").map((event, index) =>
      remoteReviewEvent(event, `pull_page.events[${String(index)}]`)
    ),
    states: array(item.states, "pull_page.states").map((state, index) =>
      remoteReviewState(state, `pull_page.states[${String(index)}]`)
    ),
    conflictedCardIds: array(item.conflicted_card_ids, "pull_page.conflicted_card_ids").map(
      (cardId, index) => string(cardId, `pull_page.conflicted_card_ids[${String(index)}]`)
    ),
    nextCursor: pullCursor(item.next_cursor, "pull_page.next_cursor"),
    hasMore: boolean(item.has_more, "pull_page.has_more")
  };
}

function reconciliationEvent(value: unknown, path: string): ReconciliationEvent {
  const item = record(value, path);
  return {
    eventId: string(item.event_id, `${path}.event_id`),
    cardId: string(item.card_id, `${path}.card_id`),
    module: moduleSlug(item.module, `${path}.module`),
    rating: rating(item.rating, `${path}.rating`),
    reviewedAt: isoString(item.reviewed_at, `${path}.reviewed_at`),
    orderingAt: isoString(item.ordering_at, `${path}.ordering_at`),
    clockAnomaly: boolean(item.clock_anomaly, `${path}.clock_anomaly`),
    deviceId: string(item.device_id, `${path}.device_id`),
    deviceSequence: integer(item.device_sequence, `${path}.device_sequence`),
    baseRevision: integer(item.base_revision, `${path}.base_revision`)
  };
}

function schedulerCard(value: unknown, path: string): SchedulerCard {
  const item = record(value, path);
  return {
    state: schedulerState(item.state, `${path}.state`),
    dueAt: item.due_at === null ? null : isoString(item.due_at, `${path}.due_at`),
    revision: integer(item.revision, `${path}.revision`)
  };
}

export function parseReconciliationBundle(value: unknown): ReconciliationBundle {
  const item = record(value, "reconciliation_bundle");
  return {
    cardId: string(item.card_id, "reconciliation_bundle.card_id"),
    module: moduleSlug(item.module, "reconciliation_bundle.module"),
    baseline: schedulerCard(item.baseline, "reconciliation_bundle.baseline"),
    events: array(item.events, "reconciliation_bundle.events").map((event, index) =>
      reconciliationEvent(event, `reconciliation_bundle.events[${String(index)}]`)
    ),
    expectedRevision: integer(item.expected_revision, "reconciliation_bundle.expected_revision"),
    eventSetHash: string(item.event_set_hash, "reconciliation_bundle.event_set_hash")
  };
}

export function parseReconciliationCommit(value: unknown): ReconciliationCommitResult {
  const item = record(value, "reconciliation_commit");
  if (item.status === "committed") {
    return {
      status: "committed",
      revision: integer(item.revision, "reconciliation_commit.revision"),
      eventSetHash: string(item.event_set_hash, "reconciliation_commit.event_set_hash")
    };
  }
  if (item.status === "stale") {
    return {
      status: "stale",
      currentRevision: integer(item.current_revision, "reconciliation_commit.current_revision"),
      eventSetHash: string(item.event_set_hash, "reconciliation_commit.event_set_hash")
    };
  }
  throw new CloudPayloadError("reconciliation_commit.status", "committed or stale");
}

export function parseTrustedReconciledState(value: unknown): ReconciledReviewState {
  const item = record(value, "trusted_reconciliation");
  if (item.status !== "committed") {
    throw new CloudPayloadError("trusted_reconciliation.status", "committed");
  }
  return {
    cardId: string(item.card_id, "trusted_reconciliation.card_id"),
    module: moduleSlug(item.module, "trusted_reconciliation.module"),
    schedulerState: schedulerState(item.scheduler_state, "trusted_reconciliation.scheduler_state"),
    dueAt: isoString(item.due_at, "trusted_reconciliation.due_at"),
    lastReviewedAt: isoString(item.last_reviewed_at, "trusted_reconciliation.last_reviewed_at"),
    revision: integer(item.revision, "trusted_reconciliation.revision"),
    schedulerImplementationVersion: string(
      item.scheduler_implementation_version,
      "trusted_reconciliation.scheduler_implementation_version"
    ),
    expectedRevision: integer(item.expected_revision, "trusted_reconciliation.expected_revision"),
    eventSetHash: string(item.event_set_hash, "trusted_reconciliation.event_set_hash")
  };
}
