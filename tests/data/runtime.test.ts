import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { RuntimeConfigurationError, createLearningRuntime } from "../../src/data/runtime";

const databaseNames: string[] = [];

afterEach(async () => {
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
});
