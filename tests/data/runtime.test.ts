import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RuntimeConfigurationError, createLearningRuntime } from "../../src/data/runtime";
import { LearningDatabase } from "../../src/db/learningDatabase";

const databaseNames: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe("createLearningRuntime", () => {
  it("requires explicit demo mode and returns only application ports", async () => {
    const databaseName = `wordeasy-runtime-${crypto.randomUUID()}`;
    databaseNames.push(databaseName);
    const runtime = await createLearningRuntime({
      mode: "demo",
      userId: "runtime-user",
      timezone: "Asia/Shanghai",
      databaseName,
      now: () => new Date("2026-08-26T08:00:00.000Z")
    });

    expect(runtime.mode).toBe("demo");
    expect((await runtime.auth.restoreLocal()).userId).toBe("runtime-user");
    expect(await runtime.learning.getCachedHome()).toMatchObject({
      userId: "runtime-user",
      studyDate: "2026-08-26"
    });
    expect("database" in runtime).toBe(false);
    await runtime.dispose();
  });

  it("never silently falls back to demo for cloud mode", async () => {
    await expect(createLearningRuntime({ mode: "cloud" })).rejects.toBeInstanceOf(
      RuntimeConfigurationError
    );
  });

  it("creates an explicit preview runtime in a separate local namespace", async () => {
    vi.stubEnv("MODE", "preview");
    vi.stubEnv("VITE_APP_MODE", "preview");
    const databaseName = `wordeasy-preview-runtime-${crypto.randomUUID()}`;
    databaseNames.push(databaseName);
    const runtime = await createLearningRuntime({
      mode: "preview",
      timezone: "Asia/Shanghai",
      databaseName,
      now: () => new Date("2026-08-27T08:00:00.000Z")
    });

    expect(runtime.mode).toBe("preview");
    expect((await runtime.auth.restoreLocal()).userId).toBe("preview-user");
    expect(await runtime.learning.getCachedHome()).toMatchObject({
      userId: "preview-user",
      studyDate: "2026-08-27"
    });
    await runtime.dispose();
  });

  it("refuses preview runtime outside the explicit preview build configuration", async () => {
    await expect(createLearningRuntime({ mode: "preview" })).rejects.toThrow(
      "matching preview Vite mode and app mode"
    );
  });

  it("refuses a preview app mode carried by a non-preview Vite build", async () => {
    vi.stubEnv("VITE_APP_MODE", "preview");
    await expect(createLearningRuntime({ mode: "preview" })).rejects.toThrow(
      "matching preview Vite mode and app mode"
    );
  });

  it.each(["standalone", "desktop"] as const)(
    "creates the formal %s runtime without putting the catalog on the Home path",
    async (mode) => {
      vi.stubEnv("MODE", mode);
      vi.stubEnv("VITE_APP_MODE", mode);
      const databaseName = `wordeasy-${mode}-runtime-${crypto.randomUUID()}`;
      databaseNames.push(databaseName);
      const runtime = await createLearningRuntime({
        mode,
        timezone: "Asia/Shanghai",
        databaseName,
        now: () => new Date("2026-08-28T08:00:00.000Z")
      });

      expect(runtime.mode).toBe(mode);
      expect((await runtime.auth.restoreLocal()).userId).toBe("local-user");
      expect(await runtime.learning.getCachedHome()).toMatchObject({
        userId: "local-user",
        studyDate: "2026-08-28",
        modules: {
          research_english: { new: { completed: 0, total: 10 } },
          medical_english: { new: { completed: 0, total: 10 } }
        }
      });
      const inspectionDatabase = new LearningDatabase(databaseName);
      expect(await inspectionDatabase.cached_cards.count()).toBe(0);

      expect((await runtime.learning.getStudyQueue("research_english", "new")).cards).toHaveLength(
        10
      );
      expect(await inspectionDatabase.cached_cards.count()).toBe(60);
      inspectionDatabase.close();
      await runtime.dispose();
    }
  );

  it.each(["standalone", "desktop"] as const)(
    "refuses the %s runtime outside its matching build mode",
    async (mode) => {
      await expect(createLearningRuntime({ mode })).rejects.toThrow(
        mode === "standalone"
          ? "matching standalone Vite mode and app mode"
          : "matching desktop Vite mode and app mode"
      );
    }
  );
});
