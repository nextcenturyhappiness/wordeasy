import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const root = new URL("..", import.meta.url).pathname;
const output = join(root, "dist-desktop");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function gzipSize(path) {
  return gzipSync(await readFile(path)).byteLength;
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

const [indexHtml, assetNames, canonicalSeed, tauriConfigText, cargoManifest, tauriSource] =
  await Promise.all([
    readFile(join(output, "index.html"), "utf8"),
    readdir(join(output, "assets")),
    readFile(join(root, "data", "seed-data.json"), "utf8").then(JSON.parse),
    readFile(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
    readFile(join(root, "src-tauri", "Cargo.toml"), "utf8"),
    readFile(join(root, "src-tauri", "src", "lib.rs"), "utf8")
  ]);
const tauriConfig = JSON.parse(tauriConfigText);
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
const desktopRuntimeFiles = [...javascriptByName]
  .filter(([, source]) => source.includes("desktop:v1") && source.includes("local-user"))
  .map(([name]) => name);
assert(
  desktopRuntimeFiles.length === 1,
  `Expected one desktop local runtime chunk; found ${String(desktopRuntimeFiles.length)}.`
);
const homeFiles = staticReachableJavaScript(
  [...initialFiles, ...desktopRuntimeFiles],
  javascriptByName
);
const homeJavaScript = sourcesFor(homeFiles, javascriptByName);
const homeGzip = (
  await Promise.all([
    ...[...homeFiles].map((name) => gzipSize(join(output, "assets", name))),
    ...initialRootScripts.map((path) => gzipSize(assetPath(path)))
  ])
).reduce((total, size) => total + size, 0);
const activeCardIds = canonicalSeed.cards.filter((card) => card.active).map((card) => card.id);
const cardCatalogFiles = filesContainingEvery(javascriptByName, activeCardIds);
const fsrsMarkers = ["ts-fsrs@5.4.1/default-v1", "wordeasy-fsrs-card-v1"];
const fsrsFiles = filesContainingEvery(javascriptByName, fsrsMarkers);

for (const forbiddenFile of ["manifest.webmanifest", "sw.js", "_headers"]) {
  assert(!(await exists(join(output, forbiddenFile))), `Desktop build contains ${forbiddenFile}.`);
}
assert(
  !assetNames.some((name) => /^workbox-.+\.js$/u.test(name)),
  "Desktop build contains a Workbox runtime."
);
assert(!indexHtml.includes("manifest.webmanifest"), "Desktop HTML links a PWA manifest.");
assert(
  !/navigator\.serviceWorker|registerSW|virtual:pwa-register/u.test(allJavaScript),
  "Desktop JavaScript contains Service Worker registration code."
);
assert(activeCardIds.length === 60, "Canonical desktop catalog must contain 60 active cards.");
assert(
  cardCatalogFiles.length === 1,
  `Expected one dedicated desktop 60-card chunk; found ${String(cardCatalogFiles.length)}.`
);
const cardCatalogFile = cardCatalogFiles[0];
assert(cardCatalogFile !== undefined, "Desktop 60-card chunk could not be identified.");
assert(
  [...javascriptByName].every(
    ([name, source]) =>
      name === cardCatalogFile || activeCardIds.every((cardId) => !source.includes(cardId))
  ),
  "Desktop card IDs escaped their dedicated deferred catalog chunk."
);
assert(
  !homeFiles.has(cardCatalogFile) &&
    activeCardIds.every((cardId) => !homeJavaScript.includes(cardId)),
  "Desktop initial + Home reachable JavaScript contains canonical vocabulary data."
);
assert(
  fsrsFiles.length === 1,
  `Expected one dedicated desktop FSRS chunk; found ${String(fsrsFiles.length)}.`
);
const fsrsFile = fsrsFiles[0];
assert(fsrsFile !== undefined, "Desktop FSRS chunk could not be identified.");
assert(
  fsrsFile !== cardCatalogFile,
  "Desktop FSRS and canonical vocabulary must be separate deferred chunks."
);
assert(
  !homeFiles.has(fsrsFile) && fsrsMarkers.every((marker) => !homeJavaScript.includes(marker)),
  "Desktop initial + Home reachable JavaScript contains the FSRS implementation."
);
assert(
  allJavaScript.includes("desktop:v1") && allJavaScript.includes("local-user"),
  "Desktop build does not contain its stable personal-data identity."
);
for (const forbidden of ["SUPABASE_SERVICE_ROLE_KEY", "sb_secret_", "wordeasy-preview.pages.dev"]) {
  assert(
    !allJavaScript.includes(forbidden),
    `Desktop build contains forbidden value: ${forbidden}`
  );
}
assert(initialGzip <= 150 * 1024, "Desktop initial JavaScript exceeds the 150 KiB budget.");
assert(homeGzip <= 200 * 1024, "Desktop Home JavaScript exceeds the 200 KiB budget.");
assert(initialCssGzip <= 30 * 1024, "Desktop CSS exceeds the 30 KiB budget.");

assert(indexHtml.includes("<title>wordeasy</title>"), "Desktop HTML uses the wrong product title.");
assert(tauriConfig.productName === "wordeasy", "Tauri product name changed.");
assert(
  tauriConfig.identifier === "com.nextcenturyhappiness.wordeasy",
  "Tauri bundle identifier changed."
);
assert(
  tauriConfig.build.frontendDist === "../dist-desktop" &&
    tauriConfig.build.removeUnusedCommands === true,
  "Tauri build is not locked to the desktop frontend with unused commands removed."
);
assert(
  tauriConfig.app.windows.length === 1 &&
    tauriConfig.app.windows[0].title === "wordeasy" &&
    tauriConfig.app.windows[0].devtools === false &&
    tauriConfig.app.windows[0].useHttpsScheme === false,
  "Tauri window title or debug/origin surface changed."
);
assert(
  tauriConfig.app.withGlobalTauri === false && tauriConfig.app.macOSPrivateApi === false,
  "Tauri exposes a global API or private macOS API."
);
assert(
  tauriConfig.app.security.assetProtocol.enable === false &&
    tauriConfig.app.security.assetProtocol.scope.length === 0 &&
    tauriConfig.app.security.capabilities.length === 0 &&
    tauriConfig.app.security.freezePrototype === true,
  "Tauri capabilities or asset protocol are broader than the personal build permits."
);
for (const directive of [
  "default-src 'none'",
  "script-src 'self'",
  "connect-src 'self'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "frame-ancestors 'none'"
]) {
  assert(tauriConfig.app.security.csp.includes(directive), `Tauri CSP is missing: ${directive}`);
}
assert(
  tauriConfig.bundle.targets.join(",") === "app,dmg" &&
    tauriConfig.bundle.macOS.hardenedRuntime === true &&
    tauriConfig.bundle.macOS.signingIdentity === "-",
  "Tauri personal macOS bundle/signing policy changed."
);
assert(
  !cargoManifest.includes("tauri-plugin-") && !cargoManifest.includes("reqwest"),
  "Desktop Rust manifest contains an unexpected privileged/network plugin."
);
assert(
  tauriSource.includes('new("navigation-guard")') &&
    tauriSource.includes(".on_navigation") &&
    !tauriSource.includes("invoke_handler") &&
    !tauriSource.includes("#[tauri::command]"),
  "Desktop Rust boundary lacks its navigation guard or exposes an IPC command."
);
const capabilityDirectory = join(root, "src-tauri", "capabilities");
const capabilityFiles = (await exists(capabilityDirectory))
  ? await readdir(capabilityDirectory)
  : [];
assert(
  capabilityFiles.length === 0,
  "Desktop source contains a capability file despite its zero-capability policy."
);

console.log(
  `Desktop boundary passed: ${(initialGzip / 1024).toFixed(2)} KiB initial JS, ${(homeGzip / 1024).toFixed(2)} KiB Home JS, dedicated deferred 60-card and FSRS chunks, ${(initialCssGzip / 1024).toFixed(2)} KiB CSS, zero capability/IPC/network plugin, no PWA runtime or privileged secret.`
);
