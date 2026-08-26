import type {
  ContentShortageRecord,
  DomainModuleSlug,
  DomainQueueKind,
  NormalizedContextCard
} from "../domain/learning";
import type { LocalReviewEvent, LocalReviewState, LocalSyncStatus } from "../domain/review";

export interface CachedCardRow {
  userId: string;
  cardId: string;
  wordId: string;
  wordSenseId: string;
  contextId: string;
  module: DomainModuleSlug;
  category: string;
  lemma: string;
  displayForm: string;
  partOfSpeech: string;
  ipa: string;
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
  cachedAt: string;
}

export interface CachedDailyAssignmentRow {
  userId: string;
  module: DomainModuleSlug;
  studyDate: string;
  cardId: string;
  wordSenseId: string;
  category: string;
  position: number;
  completedAt: string | null;
  createdAt: string;
}

export interface CachedDailyReviewAssignmentRow {
  userId: string;
  module: DomainModuleSlug;
  studyDate: string;
  cardId: string;
  position: number;
  completedAt: string | null;
  createdAt: string;
}

export interface CachedAssignmentSetRow {
  userId: string;
  module: DomainModuleSlug;
  studyDate: string;
  queue: DomainQueueKind;
  status: "ready" | "shortage";
  shortage: ContentShortageRecord | null;
  createdAt: string;
}

export type LocalReviewEventRow = LocalReviewEvent;
export type LocalReviewStateRow = LocalReviewState;

export interface SyncOutboxRow {
  userId: string;
  eventId: string;
  cardId: string;
  module: DomainModuleSlug;
  status: LocalSyncStatus;
  attemptCount: number;
  nextAttemptAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncMetadataRow {
  userId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface DailySummaryRow {
  userId: string;
  module: DomainModuleSlug;
  studyDate: string;
  newCompleted: number;
  newTotal: number;
  reviewCompleted: number;
  reviewTotal: number;
  totalLearned: number;
  streak: number;
  pendingSyncCount: number;
  updatedAt: string;
}

export interface LocalProfileRow {
  userId: string;
  email: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSettingsRow {
  userId: string;
  key: "theme" | "timezone";
  value: string;
  updatedAt: string;
}

export interface LearnedWordSenseRow {
  userId: string;
  module: DomainModuleSlug;
  wordSenseId: string;
  firstCardId: string;
  firstEventId: string;
  firstLearnedAt: string;
}

export interface StudyDayRow {
  userId: string;
  studyDate: string;
  firstEventId: string;
  firstStudiedAt: string;
}

export function cachedCardFromNormalized(
  userId: string,
  value: NormalizedContextCard,
  cachedAt: string
): CachedCardRow {
  return {
    userId,
    cardId: value.card.id,
    wordId: value.word.id,
    wordSenseId: value.sense.id,
    contextId: value.context.id,
    module: value.sense.module,
    category: value.sense.category,
    lemma: value.word.lemma,
    displayForm: value.word.displayForm,
    partOfSpeech: value.word.partOfSpeech,
    ipa: value.word.ipa,
    meaningEn: value.sense.meaningEn,
    meaningZh: value.sense.meaningZh,
    usageNote: value.sense.usageNote,
    contextSentence: value.context.contextSentence,
    targetText: value.context.targetText,
    plainEnglishParaphrase: value.context.plainEnglishParaphrase,
    sentenceTranslationZh: value.context.sentenceTranslationZh,
    collocations: [...value.context.collocations],
    sourceType: value.context.source.type,
    sourceTitle: value.context.source.title,
    sourceUrl: value.context.source.url,
    doi: value.context.source.doi,
    pmid: value.context.source.pmid,
    cachedAt
  };
}
