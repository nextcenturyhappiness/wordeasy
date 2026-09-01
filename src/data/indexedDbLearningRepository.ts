import type {
  ContextCardView,
  HomeSnapshot,
  LearningRepository,
  LexiconSearchHit,
  ModuleSlug,
  ModuleSummary,
  RateCardInput,
  RateCardResult,
  ReviewScheduler,
  StudyQueueSnapshot,
  TodaySnapshot
} from "../application/contracts";
import { searchLocalLexicon } from "../domain/lexiconSearch";
import { calculateStreak, studyDateFor, systemIanaTimezone } from "../domain/time";
import type { LearningDatabase } from "../db/learningDatabase";
import { openLearningDatabase } from "../db/learningDatabase";
import type {
  CachedCardRow,
  CachedDailyAssignmentRow,
  CachedDailyReviewAssignmentRow,
  DailySummaryRow,
  LocalReviewEventRow,
  SyncMetadataRow
} from "../db/records";

interface DeviceSequenceMetadata {
  deviceId: string;
  nextSequence: number;
}

export interface PendingSyncCountPort {
  setPendingCount(pendingCount: number): void;
}

export interface IndexedDbBootstrapContext {
  database: LearningDatabase;
  userId: string;
  studyDate: string;
  timezone: string;
  initializedAt: string;
}

export interface IndexedDbLearningRepositoryOptions {
  database: LearningDatabase;
  userId: string;
  email: string;
  timezone?: string;
  resolveTimezone?: () => string;
  deviceId: string;
  scheduler: ReviewScheduler | (() => Promise<ReviewScheduler>);
  syncState: PendingSyncCountPort;
  dailyBootstrap?: (context: IndexedDbBootstrapContext) => Promise<void>;
  deferredBootstrap?: (context: IndexedDbBootstrapContext) => Promise<void>;
  now?: () => Date;
  eventIdFactory?: () => string;
}

function defaultEventIdFactory(): string {
  return globalThis.crypto.randomUUID();
}

function asDeviceMetadata(
  row: SyncMetadataRow | undefined,
  fallbackDeviceId: string
): DeviceSequenceMetadata {
  if (row === undefined) {
    return { deviceId: fallbackDeviceId, nextSequence: 0 };
  }
  const value = row.value;
  if (
    typeof value !== "object" ||
    value === null ||
    !("deviceId" in value) ||
    !("nextSequence" in value) ||
    typeof value.deviceId !== "string" ||
    typeof value.nextSequence !== "number" ||
    !Number.isSafeInteger(value.nextSequence) ||
    value.nextSequence < 0
  ) {
    throw new Error("Invalid local device sequence metadata.");
  }
  return { deviceId: value.deviceId, nextSequence: value.nextSequence };
}

function toContextCardView(row: CachedCardRow): ContextCardView {
  return {
    cardId: row.cardId,
    wordSenseId: row.wordSenseId,
    module: row.module,
    category: row.category,
    lemma: row.lemma,
    displayForm: row.displayForm,
    partOfSpeech: row.partOfSpeech,
    ipa: row.ipa,
    contextSentence: row.contextSentence,
    targetText: row.targetText,
    meaningEn: row.meaningEn,
    meaningZh: row.meaningZh,
    usageNote: row.usageNote,
    plainEnglishParaphrase: row.plainEnglishParaphrase,
    sentenceTranslationZh: row.sentenceTranslationZh,
    collocations: [...row.collocations],
    source: {
      type: row.sourceType,
      title: row.sourceTitle,
      url: row.sourceUrl,
      doi: row.doi,
      pmid: row.pmid
    }
  };
}

function toModuleSummary(row: DailySummaryRow): ModuleSummary {
  return {
    module: row.module,
    new: { completed: row.newCompleted, total: row.newTotal },
    review: { completed: row.reviewCompleted, total: row.reviewTotal },
    wordsLearned: row.totalLearned
  };
}

function validateRepeatedAction(existing: LocalReviewEventRow, input: RateCardInput): void {
  if (
    existing.cardId !== input.cardId ||
    existing.module !== input.module ||
    existing.queue !== input.queue ||
    existing.studyDate !== input.studyDate ||
    existing.rating !== input.rating
  ) {
    throw new Error("A presentation action cannot be reused for a different rating.");
  }
}

export class IndexedDbLearningRepository implements LearningRepository {
  readonly #database: LearningDatabase;
  readonly #userId: string;
  readonly #email: string;
  readonly #resolveTimezone: () => string;
  readonly #deviceId: string;
  readonly #schedulerLoader: () => Promise<ReviewScheduler>;
  readonly #syncState: PendingSyncCountPort;
  readonly #dailyBootstrap: ((context: IndexedDbBootstrapContext) => Promise<void>) | undefined;
  readonly #deferredBootstrap: ((context: IndexedDbBootstrapContext) => Promise<void>) | undefined;
  readonly #now: () => Date;
  readonly #eventIdFactory: () => string;
  #initialization: Promise<void> | null = null;
  readonly #dailyBootstraps = new Map<string, Promise<void>>();
  readonly #deferredBootstraps = new Map<string, Promise<void>>();
  #scheduler: Promise<ReviewScheduler> | null = null;

  constructor(options: IndexedDbLearningRepositoryOptions) {
    this.#database = options.database;
    this.#userId = options.userId;
    this.#email = options.email;
    this.#resolveTimezone =
      options.resolveTimezone ?? (() => options.timezone ?? systemIanaTimezone());
    this.#deviceId = options.deviceId;
    this.#schedulerLoader =
      typeof options.scheduler === "function"
        ? options.scheduler
        : () => Promise.resolve(options.scheduler as ReviewScheduler);
    this.#syncState = options.syncState;
    this.#dailyBootstrap = options.dailyBootstrap;
    this.#deferredBootstrap = options.deferredBootstrap;
    this.#now = options.now ?? (() => new Date());
    this.#eventIdFactory = options.eventIdFactory ?? defaultEventIdFactory;
  }

  #studyTimezone(): string {
    return this.#resolveTimezone();
  }

  #studyDate(): string {
    return studyDateFor(this.#now(), this.#studyTimezone());
  }

  #bootstrapContext(initializedAt: string): IndexedDbBootstrapContext {
    return {
      database: this.#database,
      userId: this.#userId,
      studyDate: this.#studyDate(),
      timezone: this.#studyTimezone(),
      initializedAt
    };
  }

  initialize(): Promise<void> {
    this.#initialization ??= this.#initializeOnce();
    return this.#initialization;
  }

  async #initializeOnce(): Promise<void> {
    if (!this.#database.isOpen()) {
      await openLearningDatabase(this.#database);
    }
    const initializedAt = this.#now().toISOString();
    const studyTimezone = this.#studyTimezone();
    await this.#database.transaction(
      "rw",
      [this.#database.local_profile, this.#database.local_settings, this.#database.sync_metadata],
      async () => {
        const existingProfile = await this.#database.local_profile.get(this.#userId);
        if (existingProfile === undefined) {
          await this.#database.local_profile.add({
            userId: this.#userId,
            email: this.#email,
            timezone: studyTimezone,
            createdAt: initializedAt,
            updatedAt: initializedAt
          });
        } else if (existingProfile.timezone !== studyTimezone) {
          await this.#database.local_profile.put({
            ...existingProfile,
            timezone: studyTimezone,
            updatedAt: initializedAt
          });
        }
        if ((await this.#database.local_settings.get([this.#userId, "theme"])) === undefined) {
          await this.#database.local_settings.add({
            userId: this.#userId,
            key: "theme",
            value: "system",
            updatedAt: initializedAt
          });
        }
        const timezoneSetting = await this.#database.local_settings.get([this.#userId, "timezone"]);
        if (timezoneSetting === undefined) {
          await this.#database.local_settings.add({
            userId: this.#userId,
            key: "timezone",
            value: studyTimezone,
            updatedAt: initializedAt
          });
        } else if (timezoneSetting.value !== studyTimezone) {
          await this.#database.local_settings.put({
            ...timezoneSetting,
            value: studyTimezone,
            updatedAt: initializedAt
          });
        }
        const metadataKey: [string, string] = [this.#userId, "device-sequence"];
        if ((await this.#database.sync_metadata.get(metadataKey)) === undefined) {
          await this.#database.sync_metadata.add({
            userId: this.#userId,
            key: "device-sequence",
            value: { deviceId: this.#deviceId, nextSequence: 0 },
            updatedAt: initializedAt
          });
        }
      }
    );

    const studyDate = this.#studyDate();
    const context = this.#bootstrapContext(initializedAt);
    if (this.#dailyBootstrap === undefined) {
      await this.#refreshSummaryMaterializations(studyDate, initializedAt);
    } else {
      await this.#ensureDailyBootstrap(context);
    }
    this.#syncState.setPendingCount(await this.#pendingOutboxCount());
  }

  async #refreshSummaryMaterializations(studyDate: string, updatedAt: string): Promise<void> {
    await this.#database.transaction(
      "rw",
      [
        this.#database.daily_summary,
        this.#database.learned_word_senses,
        this.#database.study_days,
        this.#database.sync_outbox
      ],
      async () => {
        const studiedDates = (
          await this.#database.study_days.where("userId").equals(this.#userId).toArray()
        ).map((day) => day.studyDate);
        const streak = calculateStreak(studiedDates, studyDate);
        for (const module of ["research_english", "medical_english"] as const) {
          const summary = await this.#database.daily_summary.get([this.#userId, module, studyDate]);
          if (summary === undefined) {
            continue;
          }
          const totalLearned = await this.#database.learned_word_senses
            .where("[userId+module]")
            .equals([this.#userId, module])
            .count();
          const pendingSyncCount = await this.#pendingOutboxCount(module);
          await this.#database.daily_summary.put({
            ...summary,
            totalLearned,
            streak,
            pendingSyncCount,
            updatedAt
          });
        }
      }
    );
  }

  async getCachedHome(): Promise<HomeSnapshot | null> {
    await this.initialize();
    const profile = await this.#database.local_profile.get(this.#userId);
    if (profile === undefined) {
      return null;
    }
    const studyDate = this.#studyDate();
    const timezone = this.#studyTimezone();
    await this.#ensureDailyBootstrap(this.#bootstrapContext(this.#now().toISOString()));
    const [research, medical] = await Promise.all([
      this.#database.daily_summary.get([this.#userId, "research_english", studyDate]),
      this.#database.daily_summary.get([this.#userId, "medical_english", studyDate])
    ]);
    if (research === undefined || medical === undefined) {
      return null;
    }
    return {
      userId: this.#userId,
      studyDate,
      timezone,
      streak: Math.max(research.streak, medical.streak),
      modules: {
        research_english: toModuleSummary(research),
        medical_english: toModuleSummary(medical)
      },
      pendingSyncCount: research.pendingSyncCount + medical.pendingSyncCount,
      cachedAt: research.updatedAt > medical.updatedAt ? research.updatedAt : medical.updatedAt
    };
  }

  async getToday(module: ModuleSlug): Promise<TodaySnapshot> {
    await this.#ensureDeferredBootstrap();
    const studyDate = this.#studyDate();
    const summary = await this.#database.daily_summary.get([this.#userId, module, studyDate]);
    const assignmentSet = await this.#database.cached_assignment_sets.get([
      this.#userId,
      module,
      studyDate,
      "new"
    ]);
    return {
      module,
      studyDate,
      new: {
        completed: summary?.newCompleted ?? 0,
        total: summary?.newTotal ?? 0
      },
      review: {
        completed: summary?.reviewCompleted ?? 0,
        total: summary?.reviewTotal ?? 0
      },
      contentShortage: assignmentSet?.status === "shortage" ? assignmentSet.shortage : null
    };
  }

  async getStudyQueue(module: ModuleSlug, queue: "new" | "review"): Promise<StudyQueueSnapshot> {
    await this.#ensureDeferredBootstrap();
    const studyDate = this.#studyDate();
    const assignments =
      queue === "new"
        ? await this.#database.cached_daily_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, module, studyDate])
            .sortBy("position")
        : await this.#database.cached_daily_review_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, module, studyDate])
            .sortBy("position");
    const incompleteAssignments = assignments.filter(
      (assignment) => assignment.completedAt === null
    );
    const cards = await Promise.all(
      incompleteAssignments.map((assignment) =>
        this.#database.cached_cards.get([this.#userId, assignment.cardId])
      )
    );
    const resolvedCards = cards.map((card, index) => {
      if (card === undefined) {
        throw new Error(
          `Assigned card ${incompleteAssignments[index]?.cardId ?? "unknown"} is not cached.`
        );
      }
      return toContextCardView(card);
    });
    return { module, queue, studyDate, cards: resolvedCards };
  }

  async prefetchToday(module: ModuleSlug): Promise<void> {
    await Promise.all([this.getStudyQueue(module, "new"), this.getStudyQueue(module, "review")]);
  }

  async peekNextSessionCard(
    module: ModuleSlug,
    queue: "new" | "review"
  ): Promise<ContextCardView | null> {
    await this.initialize();
    const profile = await this.#database.local_profile.get(this.#userId);
    if (profile === undefined) {
      return null;
    }
    const studyDate = this.#studyDate();
    const assignments =
      queue === "new"
        ? await this.#database.cached_daily_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, module, studyDate])
            .sortBy("position")
        : await this.#database.cached_daily_review_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, module, studyDate])
            .sortBy("position");
    const nextAssignment = assignments.find((assignment) => assignment.completedAt === null);
    if (nextAssignment === undefined) {
      return null;
    }
    const card = await this.#database.cached_cards.get([this.#userId, nextAssignment.cardId]);
    return card === undefined ? null : toContextCardView(card);
  }

  async searchLocalCards(query: string): Promise<LexiconSearchHit[]> {
    if (query.trim().length === 0) {
      return [];
    }
    await this.#ensureDeferredBootstrap();
    const [cards, researchLearned, medicalLearned] = await Promise.all([
      this.#database.cached_cards.where("userId").equals(this.#userId).toArray(),
      this.#database.learned_word_senses
        .where("[userId+module]")
        .equals([this.#userId, "research_english"])
        .toArray(),
      this.#database.learned_word_senses
        .where("[userId+module]")
        .equals([this.#userId, "medical_english"])
        .toArray()
    ]);
    return searchLocalLexicon(
      cards,
      new Set([...researchLearned, ...medicalLearned].map((row) => row.wordSenseId)),
      query
    );
  }

  async rateCard(input: RateCardInput): Promise<RateCardResult> {
    await this.#ensureDeferredBootstrap();
    if (input.presentationActionId.trim().length === 0) {
      throw new Error("presentationActionId is required.");
    }
    const reviewedAt = new Date(input.reviewedAt);
    if (Number.isNaN(reviewedAt.getTime())) {
      throw new Error("reviewedAt must be an ISO-compatible timestamp.");
    }
    const createdAt = this.#now().toISOString();
    const scheduler = await this.#loadScheduler();

    const result = await this.#database.transaction(
      "rw",
      [
        this.#database.cached_cards,
        this.#database.cached_daily_assignments,
        this.#database.cached_daily_review_assignments,
        this.#database.local_review_events,
        this.#database.local_review_states,
        this.#database.sync_outbox,
        this.#database.sync_metadata,
        this.#database.daily_summary,
        this.#database.learned_word_senses,
        this.#database.study_days
      ],
      async () => {
        const existing = await this.#database.local_review_events
          .where("[userId+presentationActionId]")
          .equals([this.#userId, input.presentationActionId])
          .first();
        if (existing !== undefined) {
          validateRepeatedAction(existing, input);
          const summary = await this.#requireSummary(input.module, input.studyDate);
          return {
            eventId: existing.eventId,
            summary: toModuleSummary(summary),
            nextCardId: await this.#nextIncompleteCard(input),
            syncStatus: "pending" as const
          };
        }

        const assignment = await this.#requireAssignment(input);
        const card = await this.#database.cached_cards.get([this.#userId, input.cardId]);
        if (card === undefined || card.module !== input.module) {
          throw new Error(`Card ${input.cardId} is unavailable for ${input.module}.`);
        }
        const priorState = await this.#database.local_review_states.get([
          this.#userId,
          input.cardId
        ]);
        const baseRevision = priorState?.revision ?? 0;
        const scheduled = scheduler.rate(
          {
            state: priorState?.schedulerState ?? {},
            dueAt: priorState?.dueAt ?? null,
            revision: baseRevision
          },
          input.rating,
          reviewedAt
        );
        const metadataKey: [string, string] = [this.#userId, "device-sequence"];
        const metadataRow = await this.#database.sync_metadata.get(metadataKey);
        const metadata = asDeviceMetadata(metadataRow, this.#deviceId);
        const deviceSequence = metadata.nextSequence + 1;
        const eventId = this.#eventIdFactory();
        const event: LocalReviewEventRow = {
          eventId,
          presentationActionId: input.presentationActionId,
          userId: this.#userId,
          cardId: input.cardId,
          wordSenseId: card.wordSenseId,
          module: input.module,
          queue: input.queue,
          studyDate: input.studyDate,
          rating: input.rating,
          reviewedAt: reviewedAt.toISOString(),
          timezone: this.#studyTimezone(),
          deviceId: metadata.deviceId,
          deviceSequence,
          baseRevision,
          schedulerBefore: scheduled.stateBefore,
          schedulerAfter: scheduled.stateAfter,
          schedulerImplementationVersion: scheduler.implementationVersion,
          syncStatus: "pending",
          createdAt
        };
        await this.#database.local_review_events.add(event);
        await this.#database.local_review_states.put({
          userId: this.#userId,
          cardId: input.cardId,
          module: input.module,
          schedulerState: scheduled.stateAfter,
          dueAt: scheduled.dueAt,
          lastReviewedAt: reviewedAt.toISOString(),
          revision: baseRevision + 1,
          schedulerImplementationVersion: scheduler.implementationVersion,
          updatedAt: createdAt
        });

        const summary = await this.#requireSummary(input.module, input.studyDate);
        let completionWasNew = false;
        if (assignment.completedAt === null) {
          completionWasNew = true;
          assignment.completedAt = reviewedAt.toISOString();
          if (input.queue === "new") {
            if (!("wordSenseId" in assignment)) {
              throw new Error("A new queue item must reference a new-card assignment.");
            }
            await this.#database.cached_daily_assignments.put(assignment);
            summary.newCompleted += 1;
          } else {
            if ("wordSenseId" in assignment) {
              throw new Error("A review queue item must reference a review assignment.");
            }
            await this.#database.cached_daily_review_assignments.put(assignment);
            summary.reviewCompleted += 1;
          }
        }

        if (input.queue === "new" && completionWasNew) {
          const learnedKey: [string, ModuleSlug, string] = [
            this.#userId,
            input.module,
            card.wordSenseId
          ];
          if ((await this.#database.learned_word_senses.get(learnedKey)) === undefined) {
            await this.#database.learned_word_senses.add({
              userId: this.#userId,
              module: input.module,
              wordSenseId: card.wordSenseId,
              firstCardId: input.cardId,
              firstEventId: eventId,
              firstLearnedAt: reviewedAt.toISOString()
            });
            summary.totalLearned += 1;
          }
        }

        const studyDayKey: [string, string] = [this.#userId, input.studyDate];
        if ((await this.#database.study_days.get(studyDayKey)) === undefined) {
          await this.#database.study_days.add({
            userId: this.#userId,
            studyDate: input.studyDate,
            firstEventId: eventId,
            firstStudiedAt: reviewedAt.toISOString()
          });
        }
        const studiedDates = (
          await this.#database.study_days.where("userId").equals(this.#userId).toArray()
        ).map((day) => day.studyDate);
        summary.streak = calculateStreak(studiedDates, input.studyDate);
        summary.pendingSyncCount += 1;
        summary.updatedAt = createdAt;
        await this.#database.daily_summary.put(summary);
        await this.#database.sync_outbox.add({
          userId: this.#userId,
          eventId,
          cardId: input.cardId,
          module: input.module,
          status: "pending",
          attemptCount: 0,
          nextAttemptAt: createdAt,
          lastError: null,
          createdAt,
          updatedAt: createdAt
        });
        await this.#database.sync_metadata.put({
          userId: this.#userId,
          key: "device-sequence",
          value: { deviceId: metadata.deviceId, nextSequence: deviceSequence },
          updatedAt: createdAt
        });

        return {
          eventId,
          summary: toModuleSummary(summary),
          nextCardId: await this.#nextIncompleteCard(input),
          syncStatus: "pending" as const
        };
      }
    );
    this.#syncState.setPendingCount(await this.#pendingOutboxCount());
    return result;
  }

  #loadScheduler(): Promise<ReviewScheduler> {
    this.#scheduler ??= this.#schedulerLoader();
    return this.#scheduler;
  }

  async #ensureDailyBootstrap(context: IndexedDbBootstrapContext): Promise<void> {
    if (this.#dailyBootstrap === undefined) {
      return;
    }
    let bootstrap = this.#dailyBootstraps.get(context.studyDate);
    if (bootstrap === undefined) {
      bootstrap = (async () => {
        await this.#dailyBootstrap?.(context);
        await this.#refreshSummaryMaterializations(context.studyDate, context.initializedAt);
      })();
      this.#dailyBootstraps.set(context.studyDate, bootstrap);
    }
    try {
      await bootstrap;
    } catch (error: unknown) {
      if (this.#dailyBootstraps.get(context.studyDate) === bootstrap) {
        this.#dailyBootstraps.delete(context.studyDate);
      }
      throw error;
    }
  }

  async #ensureDeferredBootstrap(): Promise<void> {
    if (this.#deferredBootstrap === undefined) {
      return;
    }
    await this.initialize();
    const context = this.#bootstrapContext(this.#now().toISOString());
    const studyDate = context.studyDate;
    await this.#ensureDailyBootstrap(context);
    let bootstrap = this.#deferredBootstraps.get(studyDate);
    if (bootstrap === undefined) {
      const initializedAt = this.#now().toISOString();
      bootstrap = (async () => {
        await this.#deferredBootstrap?.(this.#bootstrapContext(initializedAt));
        await this.#refreshSummaryMaterializations(studyDate, initializedAt);
      })();
      this.#deferredBootstraps.set(studyDate, bootstrap);
    }
    try {
      await bootstrap;
    } catch (error: unknown) {
      if (this.#deferredBootstraps.get(studyDate) === bootstrap) {
        this.#deferredBootstraps.delete(studyDate);
      }
      throw error;
    }
  }

  async #requireSummary(module: ModuleSlug, studyDate: string): Promise<DailySummaryRow> {
    const summary = await this.#database.daily_summary.get([this.#userId, module, studyDate]);
    if (summary === undefined) {
      throw new Error(`No daily summary exists for ${module} on ${studyDate}.`);
    }
    return summary;
  }

  async #requireAssignment(
    input: RateCardInput
  ): Promise<CachedDailyAssignmentRow | CachedDailyReviewAssignmentRow> {
    const key: [string, ModuleSlug, string, string] = [
      this.#userId,
      input.module,
      input.studyDate,
      input.cardId
    ];
    const assignment =
      input.queue === "new"
        ? await this.#database.cached_daily_assignments.get(key)
        : await this.#database.cached_daily_review_assignments.get(key);
    if (assignment === undefined) {
      throw new Error(`Card ${input.cardId} is not in the stable ${input.queue} assignment.`);
    }
    return assignment;
  }

  async #nextIncompleteCard(input: RateCardInput): Promise<string | null> {
    const assignments =
      input.queue === "new"
        ? await this.#database.cached_daily_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, input.module, input.studyDate])
            .sortBy("position")
        : await this.#database.cached_daily_review_assignments
            .where("[userId+module+studyDate]")
            .equals([this.#userId, input.module, input.studyDate])
            .sortBy("position");
    return assignments.find((assignment) => assignment.completedAt === null)?.cardId ?? null;
  }

  async #pendingOutboxCount(module?: ModuleSlug): Promise<number> {
    const statuses = ["pending", "syncing", "failed"] as const;
    const counts = await Promise.all(
      statuses.map((status) =>
        module === undefined
          ? this.#database.sync_outbox
              .where("[userId+status]")
              .equals([this.#userId, status])
              .count()
          : this.#database.sync_outbox
              .where("[userId+module+status]")
              .equals([this.#userId, module, status])
              .count()
      )
    );
    return counts.reduce((total, count) => total + count, 0);
  }
}
