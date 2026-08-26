import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const root = process.cwd();
const distDirectory = join(root, "dist");
const limits = {
  initialJavaScript: 150 * 1024,
  homeJavaScript: 200 * 1024,
  initialCss: 30 * 1024,
  precache: 1.5 * 1024 * 1024
};

function assetPath(value) {
  return join(distDirectory, value.replace(/^\//u, ""));
}

async function gzipSize(path) {
  return gzipSync(await readFile(path)).byteLength;
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

function formatBytes(value) {
  return `${(value / 1024).toFixed(2)} KiB`;
}

function assertBudget(label, actual, maximum) {
  if (actual > maximum) {
    throw new Error(`${label} is ${formatBytes(actual)}; budget is ${formatBytes(maximum)}.`);
  }
}

const indexHtml = await readFile(join(distDirectory, "index.html"), "utf8");
const initialScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/gu)].map(
  (match) => match[1]
);
const initialStyles = [...indexHtml.matchAll(/<link[^>]+href="([^"]+\.css)"/gu)].map(
  (match) => match[1]
);

if (initialScripts.length === 0) {
  throw new Error("No initial JavaScript entry was found in dist/index.html.");
}

const initialJavaScript = (
  await Promise.all(initialScripts.map((path) => gzipSize(assetPath(path))))
).reduce((total, size) => total + size, 0);
const initialCss = (
  await Promise.all(initialStyles.map((path) => gzipSize(assetPath(path))))
).reduce((total, size) => total + size, 0);

// Home is eager by design, so its cumulative JavaScript is the initial entry graph.
const homeJavaScript = initialJavaScript;
const precacheExtensions = new Set([".html", ".css", ".js", ".png", ".svg", ".webmanifest"]);
const precacheFiles = (await collectFiles(distDirectory)).filter((path) => {
  const name = relative(distDirectory, path);
  return (
    precacheExtensions.has(extname(path)) &&
    name !== "sw.js" &&
    !/^workbox-[^/]+\.js$/u.test(name) &&
    name !== "og.png"
  );
});
const productionTextExtensions = new Set([".html", ".js", ".json", ".webmanifest"]);
const productionTextFiles = (await collectFiles(distDirectory)).filter((path) =>
  productionTextExtensions.has(extname(path))
);
const demoSentinels = ["demo-card-", "wordeasy:demo:", "demo@wordeasy.invalid"];
for (const path of productionTextFiles) {
  const contents = await readFile(path, "utf8");
  const leakedSentinel = demoSentinels.find((sentinel) => contents.includes(sentinel));
  if (leakedSentinel !== undefined) {
    throw new Error(
      `Production asset ${relative(distDirectory, path)} contains demo-only content (${leakedSentinel}).`
    );
  }
}
const compressedPrecache = (await Promise.all(precacheFiles.map((path) => gzipSize(path)))).reduce(
  (total, size) => total + size,
  0
);

assertBudget("Initial JavaScript gzip", initialJavaScript, limits.initialJavaScript);
assertBudget("Home cumulative JavaScript gzip", homeJavaScript, limits.homeJavaScript);
assertBudget("Initial CSS gzip", initialCss, limits.initialCss);
assertBudget("Compressed precache", compressedPrecache, limits.precache);

const largestPrecacheFile = (
  await Promise.all(
    precacheFiles.map(async (path) => ({
      path: relative(distDirectory, path),
      bytes: (await stat(path)).size,
      gzipBytes: await gzipSize(path)
    }))
  )
).sort((left, right) => right.gzipBytes - left.gzipBytes)[0];

console.log(
  JSON.stringify(
    {
      initialJavaScriptGzip: formatBytes(initialJavaScript),
      homeJavaScriptGzip: formatBytes(homeJavaScript),
      initialCssGzip: formatBytes(initialCss),
      compressedPrecache: formatBytes(compressedPrecache),
      precacheFileCount: precacheFiles.length,
      largestPrecacheFile:
        largestPrecacheFile === undefined
          ? null
          : {
              path: largestPrecacheFile.path,
              raw: formatBytes(largestPrecacheFile.bytes),
              gzip: formatBytes(largestPrecacheFile.gzipBytes)
            }
    },
    null,
    2
  )
);
