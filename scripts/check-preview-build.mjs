import { access, readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { gzipSync } from "node:zlib";

import { verifyBuildModeBoundary } from "./lib/build-mode-boundary.mjs";

const root = new URL("..", import.meta.url).pathname;
const output = join(root, "dist-preview");

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

const [manifestText, indexHtml, serviceWorker, securityHeaders, themeInitializer, assetNames] =
  await Promise.all([
    readFile(join(output, "manifest.webmanifest"), "utf8"),
    readFile(join(output, "index.html"), "utf8"),
    readFile(join(output, "sw.js"), "utf8"),
    readFile(join(output, "_headers"), "utf8"),
    readFile(join(output, "theme-init.js"), "utf8"),
    readdir(join(output, "assets"))
  ]);
const manifest = JSON.parse(manifestText);
const javascript = (
  await Promise.all(
    assetNames
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFile(join(output, "assets", name), "utf8"))
  )
).join("\n");
const initialScripts = [...indexHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/gu)].map(
  (match) => match[1]
);
const initialStyles = [...indexHtml.matchAll(/<link[^>]+href="([^"]+\.css)"/gu)].map(
  (match) => match[1]
);
const initialJavaScript = (
  await Promise.all(initialScripts.map((path) => gzipSize(join(output, path.replace(/^\//u, "")))))
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

assert(manifest.name === "Article English Preview", "Preview manifest name is missing.");
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
assert(
  !javascript.includes("SUPABASE_SERVICE_ROLE_KEY"),
  "Preview bundle contains a privileged Supabase secret name."
);
assert(initialJavaScript <= 150 * 1024, "Preview initial JavaScript exceeds the 150 KiB budget.");
assert(initialCss <= 30 * 1024, "Preview CSS exceeds the 30 KiB budget.");
assert(compressedPrecache <= 1.5 * 1024 * 1024, "Preview precache exceeds the 1.5 MiB budget.");

await verifyBuildModeBoundary(root);

console.log(
  `Explicit local-data preview build and mode-boundary checks passed: initial JS ${(initialJavaScript / 1024).toFixed(2)} KiB gzip, CSS ${(initialCss / 1024).toFixed(2)} KiB gzip, precache ${(compressedPrecache / 1024).toFixed(2)} KiB gzip.`
);
