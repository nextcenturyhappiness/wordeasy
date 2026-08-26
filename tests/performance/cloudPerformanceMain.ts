import { studyDateFor } from "../../src/domain/time";
import { LearningDatabase, openLearningDatabase } from "../../src/db/learningDatabase";

const userId = "00000000-0000-4000-8000-000000000901";
const email = "performance-cloud@example.invalid";
const timezone = "UTC";

function base64Url(value: unknown): string {
  return btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function seedSession(now: Date): void {
  const expiresAt = Math.floor(now.getTime() / 1000) + 86_400;
  const accessToken = `${base64Url({ alg: "none", typ: "JWT" })}.${base64Url({
    sub: userId,
    email,
    role: "authenticated",
    exp: expiresAt
  })}.fixture`;
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: now.toISOString()
  };

  localStorage.setItem(
    "article-english:auth-session:v1",
    JSON.stringify({ status: "authenticated", userId, email })
  );
  localStorage.setItem(
    "sb-wordeasy-performance-auth-token",
    JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 86_400,
      expires_at: expiresAt,
      refresh_token: "performance-fixture-refresh-token",
      user
    })
  );
}

async function seedCachedHome(now: Date): Promise<void> {
  const database = new LearningDatabase(`article-english:cloud:${userId}`);
  await openLearningDatabase(database);
  const updatedAt = now.toISOString();
  const studyDate = studyDateFor(now, timezone);
  await database.transaction(
    "rw",
    database.local_profile,
    database.local_settings,
    database.daily_summary,
    async () => {
      await database.local_profile.put({
        userId,
        email,
        timezone,
        createdAt: updatedAt,
        updatedAt
      });
      await database.local_settings.bulkPut([
        { userId, key: "theme", value: "system", updatedAt },
        { userId, key: "timezone", value: timezone, updatedAt }
      ]);
      await database.daily_summary.bulkPut(
        (["research_english", "medical_english"] as const).map((module) => ({
          userId,
          module,
          studyDate,
          newCompleted: module === "research_english" ? 2 : 1,
          newTotal: 10,
          reviewCompleted: 0,
          reviewTotal: 0,
          totalLearned: module === "research_english" ? 2 : 1,
          streak: 1,
          pendingSyncCount: 0,
          updatedAt
        }))
      );
    }
  );
  database.close();
}

const now = new Date();
seedSession(now);
await seedCachedHome(now);
await import("../../src/main");
