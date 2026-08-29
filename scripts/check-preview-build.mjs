import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

import { verifyBuildModeBoundary } from "./lib/build-mode-boundary.mjs";

const root = new URL("..", import.meta.url).pathname;
const output = join(root, "dist-preview");
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

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

const [
  manifestText,
  indexHtml,
  serviceWorker,
  securityHeaders,
  themeInitializer,
  assetNames,
  canonicalSeed
] = await Promise.all([
  readFile(join(output, "manifest.webmanifest"), "utf8"),
  readFile(join(output, "index.html"), "utf8"),
  readFile(join(output, "sw.js"), "utf8"),
  readFile(join(output, "_headers"), "utf8"),
  readFile(join(output, "theme-init.js"), "utf8"),
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
const javascript = [...javascriptByName.values()].join("\n");
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
const initialEntryFiles = initialScripts
  .map(javascriptAssetName)
  .filter((name) => javascriptByName.has(name));
const initialRootScripts = initialScripts.filter(
  (path) => !javascriptByName.has(javascriptAssetName(path))
);
const initialFiles = staticReachableJavaScript(initialEntryFiles, javascriptByName);
const initialJavaScript = (
  await Promise.all([
    ...[...initialFiles].map((name) => gzipSize(join(output, "assets", name))),
    ...initialRootScripts.map((path) => gzipSize(join(output, path.replace(/^\//u, ""))))
  ])
).reduce((total, size) => total + size, 0);
const previewRuntimeFiles = [...javascriptByName]
  .filter(
    ([, source]) => source.includes("preview-user") && source.includes("preview@wordeasy.invalid")
  )
  .map(([name]) => name);
assert(
  previewRuntimeFiles.length === 1,
  `Expected one Preview runtime chunk; found ${String(previewRuntimeFiles.length)}.`
);
const homeFiles = staticReachableJavaScript(
  [...initialFiles, ...previewRuntimeFiles],
  javascriptByName
);
const homeJavaScript = (
  await Promise.all([
    ...[...homeFiles].map((name) => gzipSize(join(output, "assets", name))),
    ...initialRootScripts.map((path) => gzipSize(join(output, path.replace(/^\//u, ""))))
  ])
).reduce((total, size) => total + size, 0);
const initialCss = (
  await Promise.all(initialStyles.map((path) => gzipSize(join(output, path.replace(/^\//u, "")))))
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
const activeCards = canonicalSeed.cards.filter((card) => card.active);
const researchQuotas = new Map([
  ["general_research", 5],
  ["statistics_methodology", 2],
  ["bioinformatics", 3]
]);
const medicalCategories = [
  "anatomy",
  "physiology",
  "pathology",
  "symptoms",
  "signs",
  "diseases",
  "diagnosis",
  "laboratory",
  "imaging",
  "treatment"
];
const expectedPreviewIds = new Set([
  ...[...researchQuotas].flatMap(([category, quota]) =>
    activeCards
      .filter((card) => card.module === "research_english" && card.category === category)
      .slice(0, quota)
      .map((card) => card.id)
  ),
  ...medicalCategories.flatMap((category) =>
    activeCards
      .filter((card) => card.module === "medical_english" && card.category === category)
      .slice(0, 1)
      .map((card) => card.id)
  )
]);
const bundledCanonicalIds = activeCards
  .map((card) => card.id)
  .filter((cardId) => javascript.includes(cardId));

assert(manifest.name === "wordeasy Preview", "Preview manifest name is missing.");
assert(manifest.short_name === "wordeasy Preview", "Preview manifest short name is missing.");
assert(manifest.display === "standalone", "Preview manifest is not standalone.");
assert(
  !(await fileExists(join(root, "dist", "_headers"))),
  "Cloud production output contains Preview-only security headers."
);
assert(indexHtml.includes("manifest.webmanifest"), "Preview HTML does not link its manifest.");
assert(indexHtml.includes('src="/theme-init.js"'), "Preview HTML lacks the CSP-safe theme script.");
assert(!/<script>(?:.|\n)*<\/script>/u.test(indexHtml), "Preview HTML contains an inline script.");
assert(themeInitializer.includes("article-english:theme"), "Theme initializer is incomplete.");
assert(
  serviceWorker.includes("index.html"),
  "Preview service worker does not precache the App Shell."
);
assert(
  serviceWorker.includes("cdn-cgi"),
  "Preview service worker does not exclude Cloudflare Access routes from SPA fallback."
);
for (const requiredHeader of [
  "Content-Security-Policy: default-src 'none'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "script-src-attr 'none'",
  "style-src-attr 'none'",
  "img-src 'self'",
  "Cross-Origin-Opener-Policy: same-origin",
  "Cross-Origin-Resource-Policy: same-origin",
  "Permissions-Policy: accelerometer=(), autoplay=(), camera=(), clipboard-read=(), clipboard-write=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-create=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), web-share=(), xr-spatial-tracking=()",
  "Referrer-Policy: no-referrer",
  "Strict-Transport-Security: max-age=31536000; includeSubDomains",
  "X-Content-Type-Options: nosniff",
  "X-Frame-Options: DENY",
  "X-Permitted-Cross-Domain-Policies: none",
  "X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex",
  "! Access-Control-Allow-Origin",
  "Cache-Control: no-store, max-age=0"
]) {
  assert(
    securityHeaders.includes(requiredHeader),
    `Preview headers are missing: ${requiredHeader}`
  );
}
assert(
  javascript.includes("Progress stays in this browser"),
  "Preview bundle does not disclose its local-only data boundary."
);
assert(
  javascript.includes("preview-user"),
  "Preview bundle does not contain the explicit preview runtime."
);
assert(expectedPreviewIds.size === 20, "Expected Preview catalog must contain exactly 20 cards.");
assert(
  bundledCanonicalIds.length === 20 &&
    bundledCanonicalIds.every((cardId) => expectedPreviewIds.has(cardId)),
  `Preview bundle crossed its 20-card boundary; found ${String(bundledCanonicalIds.length)} canonical card IDs.`
);
assert(
  !assetNames.some((name) => name.startsWith("standaloneCards-")),
  "Preview build emitted the complete standalone-card module."
);
assert(
  !javascript.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Preview bundle contains a privileged Supabase secret name."
);
assertBudget("Preview initial JavaScript gzip", initialJavaScript, limits.initialJavaScript);
assertBudget("Preview Home cumulative JavaScript gzip", homeJavaScript, limits.homeJavaScript);
assertBudget("Preview initial CSS gzip", initialCss, limits.initialCss);
assertBudget("Preview compressed precache", compressedPrecache, limits.precache);

await verifyBuildModeBoundary(root);

console.log(
  `Explicit local-data preview build and mode-boundary checks passed: ${formatBytes(initialJavaScript)} initial JS, ${formatBytes(homeJavaScript)} Home JS, ${formatBytes(initialCss)} CSS, ${formatBytes(compressedPrecache)} precache.`
);
