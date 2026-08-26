/// <reference types="node" />

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, it } from "vitest";

const execute = promisify(execFile);
const projectRoot = process.cwd();
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});

async function fixture(contents: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "wordeasy-secret-scan-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "fixture.txt");
  await writeFile(path, contents, "utf8");
  return path;
}

describe("production secret scan", () => {
  it("accepts a harmless injected file", async () => {
    const path = await fixture("VITE_SUPABASE_PUBLISHABLE_KEY=\n");

    const result = await execute("node", ["scripts/check-secrets.mjs", path], {
      cwd: projectRoot
    });

    expect(result.stdout).toContain("Secret scan passed");
  });

  it("rejects an injected Supabase secret credential", async () => {
    const fakeSecret = ["sb", "secret", "deliberate-negative-test-0000000000000000"].join("_");
    const path = await fixture(fakeSecret);

    await expect(
      execute("node", ["scripts/check-secrets.mjs", path], { cwd: projectRoot })
    ).rejects.toThrow(/Supabase secret key/u);
  });
});
