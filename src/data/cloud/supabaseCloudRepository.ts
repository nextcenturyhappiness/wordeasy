import type { ModuleSlug } from "../../application/contracts";
import {
  parseDailyLearningSnapshot,
  parseNewAssignmentSet,
  parsePullPage,
  parsePushOutcomes,
  parseReconciliationBundle,
  parseReconciliationCommit,
  parseReviewAssignmentSet
} from "./parsers";
import type { CloudRpcClient } from "./rpcClient";
import type {
  CloudDailyLearningSnapshot,
  CloudLearningRepository,
  CloudNewAssignmentSet,
  CloudPullPage,
  CloudPushEvent,
  CloudReviewAssignmentSet,
  PullCursor,
  PushEventOutcome,
  ReconciledReviewState,
  ReconciliationBundle,
  ReconciliationCommitResult
} from "./types";

export class DisposedCloudRepositoryError extends Error {
  constructor() {
    super("The account-scoped cloud repository has been disposed.");
    this.name = "DisposedCloudRepositoryError";
  }
}

function serializedPushEvent(event: CloudPushEvent): Record<string, unknown> {
  return {
    event_id: event.eventId,
    card_id: event.cardId,
    word_sense_id: event.wordSenseId,
    module: event.module,
    presentation_action_id: event.presentationActionId,
    queue_kind: event.queue,
    study_date: event.studyDate,
    timezone: event.timezone,
    rating: event.rating,
    reviewed_at: event.reviewedAt,
    device_id: event.deviceId,
    device_sequence: event.deviceSequence,
    base_revision: event.baseRevision,
    scheduler_before: event.schedulerBefore,
    scheduler_after: event.schedulerAfter,
    due_at: event.dueAt,
    scheduler_implementation_version: event.schedulerImplementationVersion
  };
}

export class SupabaseCloudRepository implements CloudLearningRepository {
  #disposed = false;

  constructor(
    readonly userId: string,
    private readonly rpc: CloudRpcClient
  ) {
    if (userId.trim().length === 0) {
      throw new Error("Cloud repository requires an authenticated account userId.");
    }
  }

  async ensureNewAssignment(module: ModuleSlug, studyDate: string): Promise<CloudNewAssignmentSet> {
    this.#assertActive();
    const payload = await this.rpc.call("ensure_daily_assignment", {
      p_module_slug: module,
      p_requested_study_date: studyDate
    });
    this.#assertActive();
    const result = parseNewAssignmentSet(payload);
    if (result.module !== module || result.studyDate !== studyDate) {
      throw new Error("Cloud assignment response escaped its requested module or study date.");
    }
    return result;
  }

  async ensureReviewAssignment(
    module: ModuleSlug,
    studyDate: string
  ): Promise<CloudReviewAssignmentSet> {
    this.#assertActive();
    const payload = await this.rpc.call("ensure_daily_review_assignment", {
      p_module_slug: module,
      p_requested_study_date: studyDate
    });
    this.#assertActive();
    const result = parseReviewAssignmentSet(payload);
    if (result.module !== module || result.studyDate !== studyDate) {
      throw new Error("Cloud Review assignment escaped its requested module or study date.");
    }
    return result;
  }

  async getDailySnapshot(
    module: ModuleSlug,
    studyDate: string
  ): Promise<CloudDailyLearningSnapshot> {
    this.#assertActive();
    const payload = await this.rpc.call("get_daily_learning_snapshot", {
      p_module_slug: module,
      p_study_date: studyDate
    });
    this.#assertActive();
    const result = parseDailyLearningSnapshot(payload);
    if (
      result.newAssignment !== null &&
      (result.newAssignment.module !== module || result.newAssignment.studyDate !== studyDate)
    ) {
      throw new Error("Cloud daily snapshot contains a mismatched New assignment.");
    }
    if (
      result.reviewAssignment !== null &&
      (result.reviewAssignment.module !== module || result.reviewAssignment.studyDate !== studyDate)
    ) {
      throw new Error("Cloud daily snapshot contains a mismatched Review assignment.");
    }
    return result;
  }

  async pushEvents(events: CloudPushEvent[]): Promise<PushEventOutcome[]> {
    this.#assertActive();
    if (events.some((event) => event.userId !== this.userId)) {
      throw new Error("Cannot push an event from a different account scope.");
    }
    if (events.length === 0) {
      return [];
    }
    const payload = await this.rpc.call("ingest_review_events", {
      p_events: events.map(serializedPushEvent)
    });
    this.#assertActive();
    const outcomes = parsePushOutcomes(payload);
    const requestedIds = new Set(events.map((event) => event.eventId));
    if (
      outcomes.length !== events.length ||
      outcomes.some((outcome) => !requestedIds.has(outcome.eventId))
    ) {
      throw new Error("Cloud event ingest returned an incomplete or foreign outcome set.");
    }
    return outcomes;
  }

  async pullChanges(cursor: PullCursor, limit: number): Promise<CloudPullPage> {
    this.#assertActive();
    const payload = await this.rpc.call("pull_learning_changes", {
      p_after_received_at: cursor.receivedAt,
      p_after_event_id: cursor.eventId,
      p_limit: limit
    });
    this.#assertActive();
    return parsePullPage(payload);
  }

  async getReconciliationBundle(cardId: string): Promise<ReconciliationBundle> {
    this.#assertActive();
    const payload = await this.rpc.call("get_reconciliation_bundle", {
      p_card_id: cardId
    });
    this.#assertActive();
    const result = parseReconciliationBundle(payload);
    if (result.cardId !== cardId) {
      throw new Error("Cloud reconciliation bundle returned a different card.");
    }
    return result;
  }

  async commitReconciliation(state: ReconciledReviewState): Promise<ReconciliationCommitResult> {
    this.#assertActive();
    const payload = await this.rpc.call("commit_reconciled_review_state", {
      p_card_id: state.cardId,
      p_expected_revision: state.expectedRevision,
      p_event_set_hash: state.eventSetHash,
      p_scheduler_state: state.schedulerState,
      p_due_at: state.dueAt,
      p_last_reviewed_at: state.lastReviewedAt,
      p_scheduler_implementation_version: state.schedulerImplementationVersion
    });
    this.#assertActive();
    return parseReconciliationCommit(payload);
  }

  dispose(): void {
    this.#disposed = true;
  }

  #assertActive(): void {
    if (this.#disposed) {
      throw new DisposedCloudRepositoryError();
    }
  }
}
