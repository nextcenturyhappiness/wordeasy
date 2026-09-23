import type { ReviewScheduler } from "../application/contracts";
import type { NormalizedContextCard } from "../domain/learning";
import type { LearningDatabase } from "../db/learningDatabase";
import {
  IndexedDbLearningRepository,
  type IndexedDbBootstrapContext,
  type PendingSyncCountPort
} from "./indexedDbLearningRepository";
import { LocalAssignmentService } from "./localAssignmentService";
import {
  assertCompleteFullCatalog,
  cachedFullCatalogIsComplete,
  FULL_CATALOG_SIZE,
  FULL_CATALOG_VERSION
} from "./local/fullCatalog";
import { migrateEssentialProgressIntoMedical } from "./local/migrateEssentialProgress";

const PERSONAL_SURFACE_MODULES = ["research_english", "medical_english"] as const;
const PERSONAL_ACTIVE_NEW_POOL: Record<(typeof PERSONAL_SURFACE_MODULES)[number], number> = {
  research_english: FULL_CATALOG_SIZE.research_english,
  medical_english: FULL_CATALOG_SIZE.medical_english
};
const PERSONAL_DAILY_QUOTA = 10;
const PERSONAL_CATALOG_VERSION_KEY = "personal-catalog-version";
const REVIEW_QUEUE_MIGRATION_KEY = "personal-review-queues-v1";

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
  return cachedFullCatalogIsComplete(database, userId, PERSONAL_CATALOG_VERSION_KEY);
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

      for (const module of PERSONAL_SURFACE_MODULES) {
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
    await assignments.ensureMergedMedicalNew(context.studyDate, context.initializedAt);
  } else {
    await assignments.ensureProvisionalNewSummary(
      "research_english",
      context.studyDate,
      PERSONAL_ACTIVE_NEW_POOL.research_english,
      PERSONAL_DAILY_QUOTA,
      context.initializedAt
    );
    await assignments.ensureProvisionalNewSummary(
      "medical_english",
      context.studyDate,
      PERSONAL_ACTIVE_NEW_POOL.medical_english,
      PERSONAL_DAILY_QUOTA,
      context.initializedAt
    );
  }
  for (const module of PERSONAL_SURFACE_MODULES) {
    await assignments.ensureDueReviewSet(
      module,
      context.studyDate,
      context.timezone,
      context.initializedAt
    );
  }
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
      fuzzyLexiconSearch: true,
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
          assertCompleteFullCatalog(cards);
          await migrateEssentialProgressIntoMedical({
            database: context.database,
            userId: context.userId,
            studyDate: context.studyDate,
            nextCards: cards,
            updatedAt: context.initializedAt
          });
          const { DemoContentCatalog } = await import("./demo/demoContentCatalog");
          await new DemoContentCatalog(context.database, context.userId, cards).replace(
            context.initializedAt
          );
          await context.database.sync_metadata.put({
            userId: context.userId,
            key: PERSONAL_CATALOG_VERSION_KEY,
            value: FULL_CATALOG_VERSION,
            updatedAt: context.initializedAt
          });
          complete = true;
        }
        await prepareDailyAssignments(context, complete);
      }
    });
  }
}
