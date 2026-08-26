import type { ReviewScheduler } from "../application/contracts";
import type { LearningDatabase } from "../db/learningDatabase";
import { DemoContentCatalog } from "./demo/demoContentCatalog";
import { DEMO_CARDS } from "./demo/demoCards";
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
  scheduler: ReviewScheduler;
  syncState: PendingSyncCountPort;
  now?: () => Date;
  eventIdFactory?: () => string;
}

export class DemoLearningRepository extends IndexedDbLearningRepository {
  constructor(options: DemoLearningRepositoryOptions) {
    super({
      ...options,
      bootstrap: async ({ database, userId, studyDate, initializedAt }) => {
        const catalog = new DemoContentCatalog(database, userId, DEMO_CARDS);
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
