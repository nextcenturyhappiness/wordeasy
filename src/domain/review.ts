import type { DomainModuleSlug, DomainQueueKind, DomainReviewRating } from "./learning";

export type LocalSyncStatus = "pending" | "syncing" | "synced" | "failed";

export interface LocalReviewEvent {
  readonly eventId: string;
  readonly presentationActionId: string;
  readonly userId: string;
  readonly cardId: string;
  readonly wordSenseId: string;
  readonly module: DomainModuleSlug;
  readonly queue: DomainQueueKind;
  readonly studyDate: string;
  readonly rating: DomainReviewRating;
  readonly reviewedAt: string;
  readonly timezone: string;
  readonly deviceId: string;
  readonly deviceSequence: number;
  readonly baseRevision: number;
  readonly schedulerBefore: Record<string, unknown>;
  readonly schedulerAfter: Record<string, unknown>;
  readonly schedulerImplementationVersion: string;
  readonly syncStatus: LocalSyncStatus;
  readonly createdAt: string;
}

export interface LocalReviewState {
  userId: string;
  cardId: string;
  module: DomainModuleSlug;
  schedulerState: Record<string, unknown>;
  dueAt: string | null;
  lastReviewedAt: string;
  revision: number;
  schedulerImplementationVersion: string;
  updatedAt: string;
}
