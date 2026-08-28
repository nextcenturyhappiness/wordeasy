import Dexie from "dexie";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RuntimeConfigurationError, createLearningRuntime } from "../../src/data/runtime";

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
});
