import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  LEARNING_SCHEMA_V1,
  LEARNING_SCHEMA_V2,
  LearningDatabase,
  openLearningDatabase
} from "../../src/db/learningDatabase";
import { LocalDatabaseMigrationError } from "../../src/db/errors";
import type {
  DailySummaryRow,
  LocalProfileRow,
  LocalReviewEventRow,
  SyncOutboxRow
} from "../../src/db/records";

const databaseNames: string[] = [];

function uniqueDatabaseName(label: string): string {
  const name = `wordeasy-${label}-${crypto.randomUUID()}`;
  databaseNames.push(name);
  return name;
}

afterEach(async () => {
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe("LearningDatabase schema migration", () => {
  it("contains every required local-first table with an explicit version", async () => {
    const database = new LearningDatabase(uniqueDatabaseName("schema"));
    await openLearningDatabase(database);

    expect(database.verno).toBe(3);
    expect(database.tables.map((table) => table.name).sort()).toEqual(
      [
        "cached_assignment_sets",
        "cached_cards",
        "cached_daily_assignments",
        "cached_daily_review_assignments",
        "daily_summary",
        "learned_word_senses",
        "local_profile",
        "local_review_events",
        "local_review_states",
        "local_settings",
        "study_days",
        "sync_metadata",
        "sync_outbox"
      ].sort()
    );
    database.close();
  });

  it("upgrades version-one data without clearing it", async () => {
    const databaseName = uniqueDatabaseName("migration-preserves");
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores(LEARNING_SCHEMA_V1);
    await legacy.open();
    const legacySummary: DailySummaryRow = {
      userId: "migration-user",
      module: "research_english",
      studyDate: "2026-08-26",
      newCompleted: 4,
      newTotal: 10,
      reviewCompleted: 0,
      reviewTotal: 0,
      totalLearned: 4,
      streak: 1,
      pendingSyncCount: 4,
      updatedAt: "2026-08-26T08:00:00.000Z"
    };
    await legacy.table<DailySummaryRow>("daily_summary").add(legacySummary);
    legacy.close();

    const upgraded = new LearningDatabase(databaseName);
    await openLearningDatabase(upgraded);

    expect(
      await upgraded.daily_summary.get(["migration-user", "research_english", "2026-08-26"])
    ).toEqual(legacySummary);
    expect(await upgraded.learned_word_senses.count()).toBe(0);
    upgraded.close();
  });

  it("backfills card-scoped outbox indexes while upgrading version-two data", async () => {
    const databaseName = uniqueDatabaseName("migration-outbox-card");
    const legacy = new Dexie(databaseName);
    legacy.version(2).stores(LEARNING_SCHEMA_V2);
    await legacy.open();
    const event: LocalReviewEventRow = {
      eventId: "20000000-0000-4000-8000-000000000099",
      presentationActionId: "migration-outbox-action",
      userId: "migration-user",
      cardId: "migration-card",
      wordSenseId: "migration-sense",
      module: "research_english",
      queue: "review",
      studyDate: "2026-08-26",
      rating: "good",
      reviewedAt: "2026-08-26T08:00:00.000Z",
      timezone: "Asia/Shanghai",
      deviceId: "migration-device",
      deviceSequence: 1,
      baseRevision: 0,
      schedulerBefore: {},
      schedulerAfter: { due: "2026-08-27T08:00:00.000Z" },
      schedulerImplementationVersion: "ts-fsrs@5.4.1/default-v1",
      syncStatus: "pending",
      createdAt: "2026-08-26T08:00:00.000Z"
    };
    const legacyOutbox: Omit<SyncOutboxRow, "cardId"> = {
      userId: event.userId,
      eventId: event.eventId,
      module: event.module,
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: event.createdAt,
      lastError: null,
      createdAt: event.createdAt,
      updatedAt: event.createdAt
    };
    await legacy.table<LocalReviewEventRow>("local_review_events").add(event);
    await legacy.table<Omit<SyncOutboxRow, "cardId">>("sync_outbox").add(legacyOutbox);
    legacy.close();

    const upgraded = new LearningDatabase(databaseName);
    await openLearningDatabase(upgraded);

    expect(await upgraded.sync_outbox.get([event.userId, event.eventId])).toMatchObject({
      cardId: event.cardId
    });
    expect(upgraded.sync_outbox.schema.indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        "[userId+cardId+status]",
        "[userId+module+status]",
        "[userId+status+updatedAt]",
        "[userId+status+nextAttemptAt+createdAt+eventId]"
      ])
    );
    upgraded.close();
  });

  it("aborts an outbox migration that cannot prove its immutable event link", async () => {
    const databaseName = uniqueDatabaseName("migration-outbox-orphan");
    const legacy = new Dexie(databaseName);
    legacy.version(2).stores(LEARNING_SCHEMA_V2);
    await legacy.open();
    const orphan: Omit<SyncOutboxRow, "cardId"> = {
      userId: "migration-user",
      eventId: "20000000-0000-4000-8000-000000000098",
      module: "research_english",
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: "2026-08-26T08:00:00.000Z",
      lastError: null,
      createdAt: "2026-08-26T08:00:00.000Z",
      updatedAt: "2026-08-26T08:00:00.000Z"
    };
    await legacy.table<Omit<SyncOutboxRow, "cardId">>("sync_outbox").add(orphan);
    legacy.close();

    const failedUpgrade = new LearningDatabase(databaseName);
    await expect(openLearningDatabase(failedUpgrade)).rejects.toBeInstanceOf(
      LocalDatabaseMigrationError
    );
    failedUpgrade.close();

    const verifier = new Dexie(databaseName);
    verifier.version(2).stores(LEARNING_SCHEMA_V2);
    await verifier.open();
    expect(
      await verifier
        .table<Omit<SyncOutboxRow, "cardId">>("sync_outbox")
        .get([orphan.userId, orphan.eventId])
    ).toEqual(orphan);
    verifier.close();
  });

  it("surfaces a failed account-scope migration and leaves legacy data intact", async () => {
    const databaseName = uniqueDatabaseName("migration-failure");
    const legacy = new Dexie(databaseName);
    legacy.version(1).stores(LEARNING_SCHEMA_V1);
    await legacy.open();
    const invalidProfile: LocalProfileRow = {
      userId: " ",
      email: "legacy@example.invalid",
      timezone: "UTC",
      createdAt: "2026-08-26T08:00:00.000Z",
      updatedAt: "2026-08-26T08:00:00.000Z"
    };
    await legacy.table<LocalProfileRow>("local_profile").add(invalidProfile);
    legacy.close();

    const failedUpgrade = new LearningDatabase(databaseName);
    await expect(openLearningDatabase(failedUpgrade)).rejects.toBeInstanceOf(
      LocalDatabaseMigrationError
    );
    failedUpgrade.close();

    const verifier = new Dexie(databaseName);
    verifier.version(1).stores(LEARNING_SCHEMA_V1);
    await verifier.open();
    expect(await verifier.table<LocalProfileRow>("local_profile").get(" ")).toEqual(invalidProfile);
    verifier.close();
  });
});
