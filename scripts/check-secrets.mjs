import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

const root = process.cwd();
const frontendProductionTargets = [
  "src",
  "public",
  "dist",
  "index.html",
  "vite.config.ts",
  ".env.example",
  ".env.standalone",
  ".env.desktop",
  "src-tauri"
];
const additionalSourceTargets = ["supabase/functions"];
const textExtensions = new Set([
  "",
  ".css",
  ".html",
  ".js",
  ".json",
  ".mjs",
  ".rs",
  ".svg",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".webmanifest"
]);
const forbiddenInProduction = [
  { label: "Supabase service role identifier", pattern: /service_role/iu },
  { label: "Supabase service role environment variable", pattern: /SUPABASE_SERVICE_ROLE_KEY/u }
];
const credentialPatterns = [
  { label: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]+/u },
  {
    label: "JWT-like credential",
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/u
  }
];

async function collect(path) {
  try {
    const entries = await readdir(path, { withFileTypes: true });
    const nested = await Promise.all(
      entries
        .filter(
          (entry) =>
            entry.name !== "node_modules" && entry.name !== "target" && entry.name !== "gen"
        )
        .map((entry) => {
          const child = join(path, entry.name);
          return entry.isDirectory() ? collect(child) : Promise.resolve([child]);
        })
    );
    return nested.flat();
  } catch (error) {
    if (error?.code === "ENOTDIR") {
      return [path];
    }
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

const productionFiles = (
  await Promise.all(frontendProductionTargets.map((target) => collect(join(root, target))))
).flat();
const additionalSourceFiles = (
  await Promise.all(additionalSourceTargets.map((target) => collect(join(root, target))))
).flat();
const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean)
  .map((path) => join(root, path));
const extraFiles = (
  await Promise.all(
    process.argv.slice(2).map((path) => collect(isAbsolute(path) ? path : resolve(root, path)))
  )
).flat();
const files = [
  ...new Set([...trackedFiles, ...productionFiles, ...additionalSourceFiles, ...extraFiles])
];
const productionFileSet = new Set([...productionFiles, ...extraFiles]);
const findings = [];

for (const path of files) {
  if (!textExtensions.has(extname(path))) {
    continue;
  }
  const contents = await readFile(path, "utf8");
  for (const rule of credentialPatterns) {
    if (rule.pattern.test(contents)) {
      findings.push(`${relative(root, path)}: ${rule.label}`);
    }
  }
  if (productionFileSet.has(path)) {
    for (const rule of forbiddenInProduction) {
      if (rule.pattern.test(contents)) {
        findings.push(`${relative(root, path)}: ${rule.label}`);
      }
    }
  }
}

if (findings.length > 0) {
  throw new Error(`Secret scan failed:\n${findings.join("\n")}`);
}

console.log(
  `Secret scan passed across ${trackedFiles.length} Git-tracked, ${productionFiles.length} frontend production, and ${additionalSourceFiles.length} additional server-source files.`
);
