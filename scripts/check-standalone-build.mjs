import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname;
const output = join(root, "dist-standalone");
const limits = {
  initialJavaScript: 150 * 1024,
  homeJavaScript: 200 * 1024,
  initialCss: 30 * 1024,
  precache: 1.5 * 1024 * 1024
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collectFiles(path) : Promise.resolve([path]);
    })
  );
  return files.flat();
}

async function gzipSize(path) {
  return gzipSync(await readFile(path)).byteLength;
}

function formatBytes(value) {
  return `${(value / 1024).toFixed(2)} KiB`;
}

function assertBudget(label, actual, maximum) {
  assert(
    actual <= maximum,
    `${label} is ${formatBytes(actual)}; budget is ${formatBytes(maximum)}.`
  );
}

function javascriptAssetName(path) {
  return path
    .replace(/[?#].*$/u, "")
    .replace(/^.*\/assets\//u, "")
    .replace(/^\.\//u, "");
}

function staticJavaScriptImports(source) {
  const imports = source.matchAll(
    /\b(?:import|export)\s*(?!\s*\()[^;"']*?(?:from\s*)?["']([^"']+\.js(?:\?[^"']*)?)["']/gu
  );
  return [...imports].map((match) => javascriptAssetName(match[1]));
}

function staticReachableJavaScript(entryFiles, javascriptByName) {
  const reachable = new Set();
  const pending = [...entryFiles];

  while (pending.length > 0) {
    const name = pending.pop();
    if (name === undefined || reachable.has(name)) {
      continue;
    }
    const source = javascriptByName.get(name);
    assert(source !== undefined, `JavaScript dependency ${name} is missing from the build.`);
    reachable.add(name);
    for (const dependency of staticJavaScriptImports(source)) {
      if (!reachable.has(dependency)) {
        pending.push(dependency);
      }
    }
  }

  return reachable;
}

function filesContainingEvery(javascriptByName, markers) {
  return [...javascriptByName]
    .filter(([, source]) => markers.every((marker) => source.includes(marker)))
    .map(([name]) => name);
}

function sourcesFor(files, javascriptByName) {
  return [...files].map((name) => javascriptByName.get(name)).join("\n");
}

const [manifestText, indexHtml, securityHeaders, assetNames, canonicalSeed] = await Promise.all([
  readFile(join(output, "manifest.webmanifest"), "utf8"),
  readFile(join(output, "index.html"), "utf8"),
  readFile(join(output, "_headers"), "utf8"),
  readdir(join(output, "assets")),
  readFile(join(root, "data", "seed-data.json"), "utf8").then(JSON.parse)
]);
const manifest = JSON.parse(manifestText);
const javascriptFiles = assetNames.filter((name) => name.endsWith(".js"));
const javascriptByName = new Map(
  await Promise.all(
    javascriptFiles.map(async (name) => [
      name,
      await readFile(join(output, "assets", name), "utf8")
    ])
  )
);
const allJavaScript = [...javascriptByName.values()].join("\n");
const initialScripts = [
  ...new Set([
    ...[...indexHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/gu)].map((match) => match[1]),
    ...[...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/gu)].map(
      (match) => match[1]
    )
  ])
];
const initialStyles = [...indexHtml.matchAll(/<link[^>]+href="([^"]+\.css)"/gu)].map(
  (match) => match[1]
);
const assetPath = (path) => join(output, path.replace(/^\//u, ""));
const initialEntryFiles = initialScripts
  .map(javascriptAssetName)
  .filter((name) => javascriptByName.has(name));
const initialRootScripts = initialScripts.filter(
  (path) => !javascriptByName.has(javascriptAssetName(path))
);
const initialFiles = staticReachableJavaScript(initialEntryFiles, javascriptByName);
const initialGzip = (
  await Promise.all([
    ...[...initialFiles].map((name) => gzipSize(join(output, "assets", name))),
    ...initialRootScripts.map((path) => gzipSize(assetPath(path)))
  ])
).reduce((total, size) => total + size, 0);
const initialCssGzip = (
  await Promise.all(initialStyles.map((path) => gzipSize(assetPath(path))))
).reduce((total, size) => total + size, 0);
const standaloneRuntimeFiles = [...javascriptByName]
  .filter(([, source]) => source.includes("standalone:v1") && source.includes("local-user"))
  .map(([name]) => name);
assert(
  standaloneRuntimeFiles.length === 1,
  `Expected one standalone runtime chunk; found ${String(standaloneRuntimeFiles.length)}.`
);
const homeFiles = staticReachableJavaScript(
  [...initialFiles, ...standaloneRuntimeFiles],
  javascriptByName
);
const homeJavaScript = sourcesFor(homeFiles, javascriptByName);
const homeGzip = (
  await Promise.all([
    ...[...homeFiles].map((name) => gzipSize(join(output, "assets", name))),
    ...initialRootScripts.map((path) => gzipSize(assetPath(path)))
  ])
).reduce((total, size) => total + size, 0);
const precacheExtensions = new Set([".html", ".css", ".js", ".png", ".svg", ".webmanifest"]);
const precacheFiles = (await collectFiles(output)).filter(
  (path) =>
    precacheExtensions.has(extname(path)) &&
    !path.endsWith("/sw.js") &&
    !/\/workbox-[^/]+\.js$/u.test(path) &&
    !path.endsWith("/og.png")
);
const compressedPrecache = (await Promise.all(precacheFiles.map((path) => gzipSize(path)))).reduce(
  (total, size) => total + size,
  0
);
const activeCardIds = canonicalSeed.cards.filter((card) => card.active).map((card) => card.id);
const cardCatalogFiles = filesContainingEvery(javascriptByName, activeCardIds);
const fsrsMarkers = ["ts-fsrs@5.4.1/default-v1", "wordeasy-fsrs-card-v1"];
const fsrsFiles = filesContainingEvery(javascriptByName, fsrsMarkers);

assert(manifest.name === "wordeasy", "Standalone manifest uses the wrong product name.");
assert(manifest.short_name === "wordeasy", "Standalone manifest uses the wrong short name.");
assert(manifest.display === "standalone", "Standalone manifest is not installable standalone UI.");
assert(!manifest.name.includes("Preview"), "Standalone manifest presents itself as a Preview.");
assert(
  securityHeaders.includes("Content-Security-Policy: default-src 'none'") &&
    securityHeaders.includes("connect-src 'self'") &&
    securityHeaders.includes("X-Robots-Tag: noindex"),
  "Standalone origin is missing its local-only security headers."
);
assert(activeCardIds.length === 60, "Canonical standalone catalog must contain 60 active cards.");
assert(
  cardCatalogFiles.length === 1,
  `Expected one dedicated standalone 60-card chunk; found ${String(cardCatalogFiles.length)}.`
);
const cardCatalogFile = cardCatalogFiles[0];
assert(cardCatalogFile !== undefined, "Standalone 60-card chunk could not be identified.");
assert(
  [...javascriptByName].every(
    ([name, source]) =>
      name === cardCatalogFile || activeCardIds.every((cardId) => !source.includes(cardId))
  ),
  "Standalone card IDs escaped their dedicated deferred catalog chunk."
);
assert(
  !homeFiles.has(cardCatalogFile) &&
    activeCardIds.every((cardId) => !homeJavaScript.includes(cardId)),
  "Standalone initial + Home reachable JavaScript contains canonical vocabulary data."
);
assert(
  fsrsFiles.length === 1,
  `Expected one dedicated standalone FSRS chunk; found ${String(fsrsFiles.length)}.`
);
const fsrsFile = fsrsFiles[0];
assert(fsrsFile !== undefined, "Standalone FSRS chunk could not be identified.");
assert(
  fsrsFile !== cardCatalogFile,
  "Standalone FSRS and canonical vocabulary must be separate deferred chunks."
);
assert(
  !homeFiles.has(fsrsFile) && fsrsMarkers.every((marker) => !homeJavaScript.includes(marker)),
  "Standalone initial + Home reachable JavaScript contains the FSRS implementation."
);
assert(
  allJavaScript.includes("standalone:v1") && allJavaScript.includes("local-user"),
  "Standalone build does not contain its stable personal-data identity."
);
assert(
  allJavaScript.includes("Progress is stored only on this device"),
  "Standalone build does not disclose its device-local data boundary."
);
assert(
  !allJavaScript.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Standalone build contains a secret name."
);
assertBudget("Standalone initial JavaScript gzip", initialGzip, limits.initialJavaScript);
assertBudget("Standalone Home cumulative JavaScript gzip", homeGzip, limits.homeJavaScript);
assertBudget("Standalone initial CSS gzip", initialCssGzip, limits.initialCss);
assertBudget("Standalone compressed precache", compressedPrecache, limits.precache);

console.log(
  `Standalone PWA boundary passed: ${formatBytes(initialGzip)} initial JS, ${formatBytes(homeGzip)} Home JS, ${formatBytes(initialCssGzip)} CSS, ${formatBytes(compressedPrecache)} precache, dedicated deferred 60-card and FSRS chunks.`
);
