import type { ReviewScheduler } from "../application/contracts";
import type { NormalizedContextCard } from "../domain/learning";
import type { LearningDatabase } from "../db/learningDatabase";
import {
  IndexedDbLearningRepository,
  type IndexedDbBootstrapContext,
  type PendingSyncCountPort
} from "./indexedDbLearningRepository";
import { LocalAssignmentService } from "./localAssignmentService";

const PERSONAL_CATALOG_SIZE = 60;
const PERSONAL_DAILY_QUOTA = 10;
const PERSONAL_CATALOG_VERSION = "canonical-120-v1";
const PERSONAL_CATALOG_VERSION_KEY = "personal-catalog-version";
const REVIEW_QUEUE_MIGRATION_KEY = "personal-review-queues-v1";
const MODULES = ["research_english", "medical_english"] as const;

export interface PersonalLearningRepositoryOptions {
  database: LearningDatabase;
  userId: string;
  email: string;
  timezone: string;
  deviceId: string;
  scheduler: ReviewScheduler | (() => Promise<ReviewScheduler>);
  syncState: PendingSyncCountPort;
  loadCards: () => Promise<NormalizedContextCard[]>;
  now?: () => Date;
  eventIdFactory?: () => string;
}

async function cachedCatalogIsComplete(
  database: LearningDatabase,
  userId: string
): Promise<boolean> {
  const [version, ...counts] = await Promise.all([
    database.sync_metadata.get([userId, PERSONAL_CATALOG_VERSION_KEY]),
    ...MODULES.map((module) =>
      database.cached_cards.where("[userId+module]").equals([userId, module]).count()
    )
  ]);
  return (
    version?.value === PERSONAL_CATALOG_VERSION &&
    counts.every((count) => count === PERSONAL_CATALOG_SIZE)
  );
}

function assertCompleteCatalog(cards: NormalizedContextCard[]): void {
  if (new Set(cards.map((card) => card.card.id)).size !== cards.length) {
    throw new Error("The personal catalog contains duplicate card IDs.");
  }
  for (const module of MODULES) {
    const moduleCards = cards.filter((card) => card.sense.module === module);
    if (moduleCards.length !== PERSONAL_CATALOG_SIZE) {
      throw new Error(
        `The personal ${module} catalog must contain exactly ${String(PERSONAL_CATALOG_SIZE)} cards.`
      );
    }
    if (new Set(moduleCards.map((card) => card.card.id)).size !== PERSONAL_CATALOG_SIZE) {
      throw new Error(`The personal ${module} catalog contains duplicate card IDs.`);
    }
  }
}

async function migrateLegacyEmptyReviewSets({
  database,
  userId,
  studyDate,
  initializedAt
}: IndexedDbBootstrapContext): Promise<void> {
  await database.transaction(
    "rw",
    database.cached_assignment_sets,
    database.cached_daily_review_assignments,
    database.sync_metadata,
    async () => {
      const migrationKey: [string, string] = [userId, REVIEW_QUEUE_MIGRATION_KEY];
      if ((await database.sync_metadata.get(migrationKey)) !== undefined) {
        return;
      }

      for (const module of MODULES) {
        const reviewAssignments = await database.cached_daily_review_assignments
          .where("[userId+module+studyDate]")
          .equals([userId, module, studyDate])
          .count();
        if (reviewAssignments === 0) {
          await database.cached_assignment_sets.delete([userId, module, studyDate, "review"]);
        }
      }
      await database.sync_metadata.put({
        userId,
        key: REVIEW_QUEUE_MIGRATION_KEY,
        value: { migratedAt: initializedAt },
        updatedAt: initializedAt
      });
    }
  );
}

async function prepareDailyAssignments(
  context: IndexedDbBootstrapContext,
  catalogIsComplete: boolean
): Promise<void> {
  const assignments = new LocalAssignmentService(context.database, context.userId);
  if (catalogIsComplete) {
    await assignments.ensureResearchNew(context.studyDate, context.initializedAt);
    await assignments.ensureMedicalNew(context.studyDate, context.initializedAt);
  } else {
    await assignments.ensureProvisionalNewSummary(
      "research_english",
      context.studyDate,
      PERSONAL_CATALOG_SIZE,
      PERSONAL_DAILY_QUOTA,
      context.initializedAt
    );
    await assignments.ensureProvisionalNewSummary(
      "medical_english",
      context.studyDate,
      PERSONAL_CATALOG_SIZE,
      PERSONAL_DAILY_QUOTA,
      context.initializedAt
    );
  }
  await assignments.ensureDueReviewSet(
    "research_english",
    context.studyDate,
    context.timezone,
    context.initializedAt
  );
  await assignments.ensureDueReviewSet(
    "medical_english",
    context.studyDate,
    context.timezone,
    context.initializedAt
  );
}

export class PersonalLearningRepository extends IndexedDbLearningRepository {
  constructor(options: PersonalLearningRepositoryOptions) {
    let cardsPromise: Promise<NormalizedContextCard[]> | null = null;
    const loadCards = (): Promise<NormalizedContextCard[]> => {
      if (cardsPromise === null) {
        const pending = options.loadCards();
        cardsPromise = pending;
        void pending.catch(() => {
          if (cardsPromise === pending) {
            cardsPromise = null;
          }
        });
      }
      return cardsPromise;
    };

    super({
      ...options,
      dailyBootstrap: async (context) => {
        await migrateLegacyEmptyReviewSets(context);
        await prepareDailyAssignments(
          context,
          await cachedCatalogIsComplete(context.database, context.userId)
        );
      },
      deferredBootstrap: async (context) => {
        let complete = await cachedCatalogIsComplete(context.database, context.userId);
        if (!complete) {
          const cards = await loadCards();
          assertCompleteCatalog(cards);
          const { DemoContentCatalog } = await import("./demo/demoContentCatalog");
          await new DemoContentCatalog(context.database, context.userId, cards).replace(
            context.initializedAt
          );
          await context.database.sync_metadata.put({
            userId: context.userId,
            key: PERSONAL_CATALOG_VERSION_KEY,
            value: PERSONAL_CATALOG_VERSION,
            updatedAt: context.initializedAt
          });
          complete = true;
        }
        await prepareDailyAssignments(context, complete);
      }
    });
  }
}
