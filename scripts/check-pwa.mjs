import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const distDirectory = join(process.cwd(), process.argv[2] ?? "dist");
const manifestPath = join(distDirectory, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function iconFor(size, purpose) {
  return manifest.icons?.find(
    (icon) =>
      icon.sizes === `${size}x${size}` && (purpose === undefined || icon.purpose === purpose)
  );
}

async function readPngDimensions(path) {
  const bytes = await readFile(path);
  const signature = "89504e470d0a1a0a";
  assert(bytes.subarray(0, 8).toString("hex") === signature, `${path} is not a PNG file.`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

for (const field of [
  "name",
  "short_name",
  "description",
  "start_url",
  "scope",
  "display",
  "theme_color",
  "background_color"
]) {
  assert(typeof manifest[field] === "string" && manifest[field].length > 0, `${field} is missing.`);
}
assert(manifest.display === "standalone", "Manifest display must be standalone.");

const requiredIcons = [iconFor(192), iconFor(512), iconFor(512, "maskable")];
assert(requiredIcons.every(Boolean), "Manifest must contain 192, 512, and maskable 512 icons.");

for (const icon of requiredIcons) {
  const path = join(distDirectory, icon.src.replace(/^\//u, ""));
  await access(path);
  const expectedSize = Number.parseInt(icon.sizes, 10);
  const dimensions = await readPngDimensions(path);
  assert(
    dimensions.width === expectedSize && dimensions.height === expectedSize,
    `${icon.src} dimensions do not match ${icon.sizes}.`
  );
}

const serviceWorker = await readFile(join(distDirectory, "sw.js"), "utf8");
assert(
  serviceWorker.includes("index.html"),
  "Service Worker does not precache the App Shell HTML."
);
assert(
  /denylist\s*:\s*\[[^\]]*cdn-cgi[^\]]*\]/u.test(serviceWorker),
  "Service Worker navigation fallback does not explicitly exclude /cdn-cgi/."
);
assert(!serviceWorker.includes("og.png"), "Non-essential social artwork must not enter precache.");
// A statically cached JavaScript chunk may contain "supabase" in its filename. The boundary is
// that no Auth/REST endpoint or token-bearing response is registered as a runtime cache target.
assert(
  !/(?:\/auth\/v1|\/rest\/v1|access_token|refresh_token)/iu.test(serviceWorker),
  "Service Worker contains a private API or token cache pattern."
);

const assetFiles = (await readdir(join(distDirectory, "assets"))).filter((name) =>
  name.endsWith(".js")
);
const appJavaScript = (
  await Promise.all(assetFiles.map((name) => readFile(join(distDirectory, "assets", name), "utf8")))
).join("\n");
assert(
  appJavaScript.includes("serviceWorker") && appJavaScript.includes("register"),
  "The production app does not appear to register its Service Worker."
);

console.log("PWA manifest, icons, generated Service Worker, and registration checks passed.");
