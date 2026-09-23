import type { LearningDatabase } from "../db/learningDatabase";

/** One-time upgrade from the old implicit `system` default (DEC-062). */
export const themeSystemMigrationMetadataKey = "theme-system-default-migrated-v1";

export function themeMigrationRemoteAdjusted(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "remoteAdjusted" in value &&
    value.remoteAdjusted === true
  );
}

/**
 * Rewrites a stored `system` theme to light.
 * Cloud may keep System only after this marker exists.
 * Desktop and standalone pass `allowSystemTheme: false` and always rewrite `system`.
 */
export async function migrateStoredSystemTheme(input: {
  database: LearningDatabase;
  userId: string;
  updatedAt: string;
  allowSystemTheme: boolean;
}): Promise<void> {
  const { database, userId, updatedAt, allowSystemTheme } = input;
  await database.transaction("rw", database.local_settings, database.sync_metadata, async () => {
    const themeKey: [string, string] = [userId, "theme"];
    const migrationKey: [string, string] = [userId, themeSystemMigrationMetadataKey];
    const theme = await database.local_settings.get(themeKey);
    const migration = await database.sync_metadata.get(migrationKey);
    if (theme?.value === "system" && (!allowSystemTheme || migration === undefined)) {
      await database.local_settings.put({
        userId,
        key: "theme",
        value: "light",
        updatedAt
      });
    }
    if (migration === undefined) {
      await database.sync_metadata.put({
        userId,
        key: themeSystemMigrationMetadataKey,
        value: { migratedAt: updatedAt },
        updatedAt
      });
    }
  });
}
