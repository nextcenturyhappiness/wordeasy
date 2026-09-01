import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const PERSONAL_SUPABASE_HTTPS_ORIGIN = "https://kksllqgtjtfxfnknlrfn.supabase.co";
const PERSONAL_SUPABASE_WSS_ORIGIN = "wss://kksllqgtjtfxfnknlrfn.supabase.co";
const PERSONAL_SUPABASE_HOST = "kksllqgtjtfxfnknlrfn.supabase.co";

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
const cloudRuntimeFiles = [...javascriptByName]
  .filter(([name]) => /^cloudRuntime-[^/]+\.js$/u.test(name))
  .map(([name]) => name);
assert(
  cloudRuntimeFiles.length === 1,
  `Expected one desktop cloud runtime chunk; found ${String(cloudRuntimeFiles.length)}.`
);
const homeFiles = staticReachableJavaScript(
  [...initialFiles, ...cloudRuntimeFiles],
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
const deferredSupabaseFiles = [...javascriptByName]
  .filter(([name]) => /^supabaseRemote-[^/]+\.js$/u.test(name))
  .map(([name]) => name);

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
assert(activeCardIds.length === 60, "Canonical catalog must contain 60 active cards.");
assert(
  cardCatalogFiles.length === 0,
  "Desktop cloud build must not embed the canonical 60-card catalog."
);
assert(
  [...javascriptByName].every(([, source]) =>
    activeCardIds.every((cardId) => !source.includes(cardId))
  ),
  "Desktop JavaScript contains canonical vocabulary data."
);
assert(
  fsrsFiles.length === 1,
  `Expected one dedicated desktop FSRS chunk; found ${String(fsrsFiles.length)}.`
);
const fsrsFile = fsrsFiles[0];
assert(fsrsFile !== undefined, "Desktop FSRS chunk could not be identified.");
assert(
  !homeFiles.has(fsrsFile) && fsrsMarkers.every((marker) => !homeJavaScript.includes(marker)),
  "Desktop initial + Home reachable JavaScript contains the FSRS implementation."
);
assert(
  deferredSupabaseFiles.length === 1,
  `Expected one deferred Supabase runtime chunk; found ${String(deferredSupabaseFiles.length)}.`
);
const deferredSupabaseFile = deferredSupabaseFiles[0];
assert(deferredSupabaseFile !== undefined, "Desktop Supabase chunk could not be identified.");
assert(
  !homeFiles.has(deferredSupabaseFile),
  "Desktop Home JavaScript statically includes the deferred Supabase runtime."
);
assert(
  allJavaScript.includes(PERSONAL_SUPABASE_HTTPS_ORIGIN),
  "Desktop build does not contain the personal Supabase HTTPS origin."
);
assert(
  !allJavaScript.includes("desktop:v1") && !allJavaScript.includes("local-user"),
  "Desktop cloud build still contains the retired local-only desktop identity."
);
for (const forbidden of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_secret_",
  ["service", "role"].join("_"),
  "wordeasy-preview.pages.dev"
]) {
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
  `connect-src 'self' ${PERSONAL_SUPABASE_HTTPS_ORIGIN} ${PERSONAL_SUPABASE_WSS_ORIGIN}`,
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
    tauriSource.includes("navigation_is_allowed") &&
    tauriSource.includes(PERSONAL_SUPABASE_HOST) &&
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
  `Desktop cloud boundary passed: ${(initialGzip / 1024).toFixed(2)} KiB initial JS, ${(homeGzip / 1024).toFixed(2)} KiB Home JS, deferred Supabase and FSRS chunks, ${(initialCssGzip / 1024).toFixed(2)} KiB CSS, personal Supabase origin allowlisted, zero capability/IPC/plugin, no PWA runtime or privileged secret.`
);
