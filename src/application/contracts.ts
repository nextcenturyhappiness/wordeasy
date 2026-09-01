export type ModuleSlug = "research_english" | "medical_english";
export type ModuleRouteParam = "research" | "medical";
export type QueueKind = "new" | "review";
export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ThemePreference = "system" | "light" | "dark";

export interface CardSourceView {
  type: "original_example" | "verified_source";
  title: string | null;
  url: string | null;
  doi: string | null;
  pmid: string | null;
}

export interface ContextCardView {
  cardId: string;
  wordSenseId: string;
  module: ModuleSlug;
  category: string;
  lemma: string;
  displayForm: string;
  partOfSpeech: string;
  ipa: string;
  contextSentence: string;
  targetText: string;
  meaningEn: string;
  meaningZh: string;
  usageNote: string;
  plainEnglishParaphrase: string;
  sentenceTranslationZh: string;
  collocations: string[];
  source: CardSourceView;
}

export interface Progress {
  completed: number;
  total: number;
}

export interface ModuleSummary {
  module: ModuleSlug;
  new: Progress;
  review: Progress;
  wordsLearned: number;
}

export interface HomeSnapshot {
  userId: string;
  studyDate: string;
  timezone: string;
  streak: number;
  modules: Record<ModuleSlug, ModuleSummary>;
  pendingSyncCount: number;
  cachedAt: string;
}

export interface ContentShortage {
  code: "content_shortage";
  category: string | null;
  required: number;
  available: number;
  message: string;
}

export interface TodaySnapshot {
  module: ModuleSlug;
  studyDate: string;
  new: Progress;
  review: Progress;
  contentShortage: ContentShortage | null;
}

export interface StudyQueueSnapshot {
  module: ModuleSlug;
  queue: QueueKind;
  studyDate: string;
  cards: ContextCardView[];
}

export type SyncState =
  | { status: "local-only"; pendingCount: number }
  | { status: "synced"; pendingCount: 0 }
  | { status: "syncing"; pendingCount: number }
  | { status: "offline"; pendingCount: number }
  | { status: "pending"; pendingCount: number }
  | { status: "failed"; pendingCount: number; message: string };

export interface LexiconSearchHit {
  cardId: string;
  module: ModuleSlug;
  lemma: string;
  meaningEn: string;
  meaningZh: string;
  contextSentence: string;
  learned: boolean;
}

export interface LearningQueries {
  getCachedHome(): Promise<HomeSnapshot | null>;
  getToday(module: ModuleSlug): Promise<TodaySnapshot>;
  getStudyQueue(module: ModuleSlug, queue: QueueKind): Promise<StudyQueueSnapshot>;
  peekNextSessionCard(module: ModuleSlug, queue: QueueKind): Promise<ContextCardView | null>;
  searchLocalCards(query: string): Promise<LexiconSearchHit[]>;
  prefetchToday(module: ModuleSlug): Promise<void>;
}

export interface RateCardInput {
  presentationActionId: string;
  cardId: string;
  module: ModuleSlug;
  queue: QueueKind;
  studyDate: string;
  rating: ReviewRating;
  reviewedAt: string;
}

export interface RateCardResult {
  eventId: string;
  summary: ModuleSummary;
  nextCardId: string | null;
  syncStatus: "pending";
}

export interface LearningCommands {
  rateCard(input: RateCardInput): Promise<RateCardResult>;
}

export interface LearningRepository extends LearningQueries, LearningCommands {
  initialize(): Promise<void>;
}

export interface SessionView {
  status: "anonymous" | "authenticated" | "expired";
  userId: string | null;
  email: string | null;
}

export interface AuthGateway {
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<SessionView>;
  resendOtp(email: string): Promise<void>;
  restoreLocal(): Promise<SessionView>;
  validateRemote(): Promise<SessionView>;
  subscribe(listener: (session: SessionView) => void): () => void;
  signOut(): Promise<void>;
}

export interface SchedulerCard {
  state: Record<string, unknown>;
  dueAt: string | null;
  revision: number;
}

export interface RatingPreview {
  intervals: Record<ReviewRating, string>;
}

export interface ReviewResult {
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  dueAt: string;
}

export interface ReviewScheduler {
  readonly implementationVersion: string;
  preview(card: SchedulerCard, now: Date): RatingPreview;
  rate(card: SchedulerCard, rating: ReviewRating, now: Date): ReviewResult;
}

export interface SettingsGateway {
  getTheme(): Promise<ThemePreference>;
  setTheme(theme: ThemePreference): Promise<void>;
  getTimezone(): Promise<string>;
  setTimezone(timezone: string): Promise<void>;
}

export interface SyncGateway {
  getState(): SyncState;
  sync(): Promise<SyncState>;
  subscribe(listener: (state: SyncState) => void): () => void;
}
