import type {
  ContentShortage,
  ModuleSlug,
  ReviewRating,
  SchedulerCard
} from "../../application/contracts";
import type { LocalReviewEvent } from "../../domain/review";

export interface CloudNewAssignment {
  cardId: string;
  category: string;
  position: number;
}

export type CloudNewAssignmentSet =
  | {
      status: "ready";
      setId: string;
      module: ModuleSlug;
      studyDate: string;
      timezone: string;
      shortage: null;
      assignments: CloudNewAssignment[];
    }
  | {
      status: "shortage";
      setId: string;
      module: ModuleSlug;
      studyDate: string;
      timezone: string;
      shortage: ContentShortage;
      assignments: [];
    };

export interface CloudReviewAssignment {
  cardId: string;
  position: number;
  dueAtSnapshot: string;
}

export interface CloudReviewAssignmentSet {
  status: "ready";
  setId: string;
  module: ModuleSlug;
  studyDate: string;
  timezone: string;
  cutoffAt: string;
  assignments: CloudReviewAssignment[];
}

export interface CloudContextCard {
  cardId: string;
  wordId: string;
  wordSenseId: string;
  contextId: string;
  module: ModuleSlug;
  category: string;
  lemma: string;
  displayForm: string;
  ipa: string;
  partOfSpeech: string;
  meaningEn: string;
  meaningZh: string;
  usageNote: string;
  contextSentence: string;
  targetText: string;
  plainEnglishParaphrase: string;
  sentenceTranslationZh: string;
  collocations: string[];
  sourceType: "original_example" | "verified_source";
  sourceTitle: string | null;
  sourceUrl: string | null;
  doi: string | null;
  pmid: string | null;
}

export interface CloudDailyLearningSnapshot {
  newAssignment: CloudNewAssignmentSet | null;
  reviewAssignment: CloudReviewAssignmentSet | null;
  cards: CloudContextCard[];
}

export interface CloudPushEvent extends LocalReviewEvent {
  dueAt: string;
}

export type PushEventStatus = "applied" | "duplicate" | "conflict" | "rejected";

export interface PushEventOutcome {
  eventId: string;
  cardId: string | null;
  status: PushEventStatus;
  applicationStatus: string | null;
  canonicalRevision: number | null;
  reason: string | null;
  clockAnomaly: boolean;
}

export interface PullCursor {
  receivedAt: string;
  eventId: string;
  stateSequence: number;
  stateEpoch: string;
}

export interface RemoteReviewEvent {
  eventId: string;
  cardId: string;
  wordSenseId: string;
  module: ModuleSlug;
  presentationActionId: string;
  queue: "new" | "review";
  studyDate: string;
  timezone: string;
  rating: ReviewRating;
  reviewedAt: string;
  receivedAt: string;
  orderingAt: string;
  clockAnomaly: boolean;
  deviceId: string;
  deviceSequence: number;
  baseRevision: number;
  schedulerBefore: Record<string, unknown>;
  schedulerAfter: Record<string, unknown>;
  dueAt: string;
  schedulerImplementationVersion: string;
  applicationStatus: string;
  canonicalRevision: number | null;
  conflictReason: string | null;
}

export interface RemoteReviewState {
  cardId: string;
  module: ModuleSlug;
  schedulerState: Record<string, unknown>;
  dueAt: string | null;
  lastReviewedAt: string;
  revision: number;
  schedulerImplementationVersion: string;
  canonicalEventSetHash: string | null;
  updatedAt: string;
}

export interface CloudPullPage {
  events: RemoteReviewEvent[];
  states: RemoteReviewState[];
  conflictedCardIds: string[];
  nextCursor: PullCursor;
  hasMore: boolean;
}

export interface ReconciliationEvent {
  eventId: string;
  cardId: string;
  module: ModuleSlug;
  rating: ReviewRating;
  reviewedAt: string;
  orderingAt: string;
  clockAnomaly: boolean;
  deviceId: string;
  deviceSequence: number;
  baseRevision: number;
}

export interface ReconciliationBundle {
  cardId: string;
  module: ModuleSlug;
  baseline: SchedulerCard;
  events: ReconciliationEvent[];
  expectedRevision: number;
  eventSetHash: string;
}

export interface ReconciledReviewState {
  cardId: string;
  module: ModuleSlug;
  schedulerState: Record<string, unknown>;
  dueAt: string;
  lastReviewedAt: string;
  revision: number;
  schedulerImplementationVersion: string;
  expectedRevision: number;
  eventSetHash: string;
}

export type ReconciliationCommitResult =
  | { status: "committed"; revision: number; eventSetHash: string }
  | { status: "stale"; currentRevision: number; eventSetHash: string };

export interface CloudSyncTransport {
  readonly userId: string;
  pushEvents(events: CloudPushEvent[]): Promise<PushEventOutcome[]>;
  pullChanges(cursor: PullCursor, limit: number): Promise<CloudPullPage>;
  reconcileCard(cardId: string): Promise<ReconciledReviewState>;
  dispose(): void;
}

export interface CloudLearningRepository extends CloudSyncTransport {
  ensureNewAssignment(module: ModuleSlug, studyDate: string): Promise<CloudNewAssignmentSet>;
  ensureReviewAssignment(module: ModuleSlug, studyDate: string): Promise<CloudReviewAssignmentSet>;
  getDailySnapshot(module: ModuleSlug, studyDate: string): Promise<CloudDailyLearningSnapshot>;
}
