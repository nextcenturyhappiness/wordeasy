import type { ReviewScheduler } from "../application/contracts";
import type { NormalizedContextCard } from "../domain/learning";
import type { LearningDatabase } from "../db/learningDatabase";
import {
  IndexedDbLearningRepository,
  type PendingSyncCountPort
} from "./indexedDbLearningRepository";
import { LocalAssignmentService } from "./localAssignmentService";

export interface DemoLearningRepositoryOptions {
  database: LearningDatabase;
  userId: string;
  email: string;
  timezone: string;
  deviceId: string;
  scheduler: ReviewScheduler | (() => Promise<ReviewScheduler>);
  syncState: PendingSyncCountPort;
  now?: () => Date;
  eventIdFactory?: () => string;
  cards: NormalizedContextCard[];
}

export class DemoLearningRepository extends IndexedDbLearningRepository {
  constructor(options: DemoLearningRepositoryOptions) {
    super({
      ...options,
      dailyBootstrap: async ({ database, userId, studyDate, initializedAt }) => {
        const { DemoContentCatalog } = await import("./demo/demoContentCatalog");
        const catalog = new DemoContentCatalog(database, userId, options.cards);
        await catalog.seed(initializedAt);
        const assignments = new LocalAssignmentService(database, userId);
        await assignments.ensureResearchNew(studyDate, initializedAt);
        await assignments.ensureMedicalNew(studyDate, initializedAt);
        await assignments.ensureEmptyReviewSet("research_english", studyDate, initializedAt);
        await assignments.ensureEmptyReviewSet("medical_english", studyDate, initializedAt);
      }
    });
  }
}
