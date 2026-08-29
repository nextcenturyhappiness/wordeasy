import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function verifyBuildModeBoundary(projectRoot) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "wordeasy-mode-boundary-"));
  const viteEntry = join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  const mismatchCases = [
    {
      name: "preview runtime under production Vite mode",
      mode: "production",
      appMode: "preview"
    },
    {
      name: "cloud runtime under preview Vite mode",
      mode: "preview",
      appMode: "cloud"
    },
    {
      name: "standalone runtime under production Vite mode",
      mode: "production",
      appMode: "standalone"
    },
    {
      name: "cloud runtime under standalone Vite mode",
      mode: "standalone",
      appMode: "cloud"
    },
    {
      name: "desktop runtime under production Vite mode",
      mode: "production",
      appMode: "desktop"
    },
    {
      name: "cloud runtime under desktop Vite mode",
      mode: "desktop",
      appMode: "cloud"
    }
  ];

  try {
    for (const mismatch of mismatchCases) {
      const result = spawnSync(
        process.execPath,
        [
          viteEntry,
          "build",
          "--mode",
          mismatch.mode,
          "--outDir",
          join(temporaryRoot, mismatch.mode)
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: { ...process.env, VITE_APP_MODE: mismatch.appMode }
        }
      );
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      assert(result.status !== 0, `Mode guard allowed ${mismatch.name}.`);
      assert(
        output.includes("Vite mode/runtime mismatch"),
        `Mode guard rejected ${mismatch.name} without the expected diagnostic.`
      );
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}
