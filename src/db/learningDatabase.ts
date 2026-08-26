import Dexie, { type Table, type Transaction } from "dexie";

import { LocalDatabaseMigrationError } from "./errors";
import type {
  CachedAssignmentSetRow,
  CachedCardRow,
  CachedDailyAssignmentRow,
  CachedDailyReviewAssignmentRow,
  DailySummaryRow,
  LearnedWordSenseRow,
  LocalProfileRow,
  LocalReviewEventRow,
  LocalReviewStateRow,
  LocalSettingsRow,
  StudyDayRow,
  SyncMetadataRow,
  SyncOutboxRow
} from "./records";

export const LEARNING_DATABASE_VERSION = 2;

export const LEARNING_SCHEMA_V1 = {
  cached_cards: "[userId+cardId], userId, [userId+module], [userId+module+category]",
  cached_daily_assignments:
    "[userId+module+studyDate+cardId], userId, &[userId+module+studyDate+position], [userId+module+studyDate], [userId+module], [userId+cardId]",
  cached_daily_review_assignments:
    "[userId+module+studyDate+cardId], userId, &[userId+module+studyDate+position], [userId+module+studyDate], [userId+module], [userId+cardId]",
  cached_assignment_sets: "[userId+module+studyDate+queue], [userId+module+studyDate]",
  local_review_events:
    "[userId+eventId], userId, &[userId+presentationActionId], [userId+cardId+reviewedAt], [userId+module+studyDate], [userId+syncStatus]",
  local_review_states: "[userId+cardId], userId, [userId+module+dueAt]",
  sync_outbox:
    "[userId+eventId], userId, [userId+status+nextAttemptAt], [userId+module], [userId+status]",
  sync_metadata: "[userId+key]",
  daily_summary: "[userId+module+studyDate], userId",
  local_profile: "userId",
  local_settings: "[userId+key]"
} as const;

export const LEARNING_SCHEMA_V2 = {
  ...LEARNING_SCHEMA_V1,
  learned_word_senses: "[userId+module+wordSenseId], [userId+module]",
  study_days: "[userId+studyDate], userId"
} as const;

const VERSION_ONE_SCOPED_TABLES = Object.keys(LEARNING_SCHEMA_V1);

async function validateAccountScopes(transaction: Transaction): Promise<void> {
  for (const tableName of VERSION_ONE_SCOPED_TABLES) {
    const rows: unknown[] = await transaction.table(tableName).toArray();
    for (const row of rows) {
      if (
        typeof row !== "object" ||
        row === null ||
        !("userId" in row) ||
        typeof row.userId !== "string" ||
        row.userId.trim().length === 0
      ) {
        throw new Error(`Legacy row in ${tableName} has no account scope.`);
      }
    }
  }
}

export class LearningDatabase extends Dexie {
  cached_cards!: Table<CachedCardRow, [string, string]>;
  cached_daily_assignments!: Table<CachedDailyAssignmentRow, [string, string, string, string]>;
  cached_daily_review_assignments!: Table<
    CachedDailyReviewAssignmentRow,
    [string, string, string, string]
  >;
  cached_assignment_sets!: Table<CachedAssignmentSetRow, [string, string, string, string]>;
  local_review_events!: Table<LocalReviewEventRow, [string, string]>;
  local_review_states!: Table<LocalReviewStateRow, [string, string]>;
  sync_outbox!: Table<SyncOutboxRow, [string, string]>;
  sync_metadata!: Table<SyncMetadataRow, [string, string]>;
  daily_summary!: Table<DailySummaryRow, [string, string, string]>;
  local_profile!: Table<LocalProfileRow, string>;
  local_settings!: Table<LocalSettingsRow, [string, string]>;
  learned_word_senses!: Table<LearnedWordSenseRow, [string, string, string]>;
  study_days!: Table<StudyDayRow, [string, string]>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores(LEARNING_SCHEMA_V1);
    this.version(LEARNING_DATABASE_VERSION)
      .stores(LEARNING_SCHEMA_V2)
      .upgrade(validateAccountScopes);
  }
}

export async function openLearningDatabase(database: LearningDatabase): Promise<void> {
  try {
    await database.open();
  } catch (error: unknown) {
    throw new LocalDatabaseMigrationError(database.name, error);
  }
}
