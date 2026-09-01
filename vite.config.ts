import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

import { resolveDesktopCloudPublicEnv } from "./src/desktop/personalSupabaseOrigin.ts";

const demoSeedModuleId = "virtual:article-english-demo-seed";
const resolvedDemoSeedModuleId = `\0${demoSeedModuleId}`;
const standaloneSeedModuleId = "virtual:article-english-standalone-seed";
const resolvedStandaloneSeedModuleId = `\0${standaloneSeedModuleId}`;
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const localOnlySecurityHeaders = `/*
  Content-Security-Policy: default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'none'; img-src 'self'; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; upgrade-insecure-requests
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), clipboard-read=(), clipboard-write=(), display-capture=(), document-domain=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), hid=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-create=(), publickey-credentials-get=(), screen-wake-lock=(), serial=(), usb=(), web-share=(), xr-spatial-tracking=()
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-Permitted-Cross-Domain-Policies: none
  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex
  ! Access-Control-Allow-Origin

/index.html
  Cache-Control: no-store, max-age=0

/sw.js
  Cache-Control: no-store, max-age=0
`;
const medicalDemoCategories = [
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

interface BuildSeedCard {
  active: boolean;
  category: string;
  module: string;
}

function loadCanonicalSeed(): { cards: BuildSeedCard[] } {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL("./data/seed-data.json", import.meta.url)), "utf8")
  ) as { cards: BuildSeedCard[] };
}

function loadDemoSeedModule(): string {
  const seed = loadCanonicalSeed();
  const researchQuotas = new Map([
    ["general_research", 5],
    ["statistics_methodology", 2],
    ["bioinformatics", 3]
  ]);
  const selected = [
    ...[...researchQuotas].flatMap(([category, quota]) =>
      seed.cards
        .filter(
          (card) => card.active && card.module === "research_english" && card.category === category
        )
        .slice(0, quota)
    ),
    ...medicalDemoCategories.flatMap((category) =>
      seed.cards
        .filter(
          (card) => card.active && card.module === "medical_english" && card.category === category
        )
        .slice(0, 1)
    )
  ];
  if (selected.length !== 20) {
    throw new Error(`Canonical seed produced ${String(selected.length)} demo cards; expected 20.`);
  }
  return `export default ${JSON.stringify(selected)};`;
}

function loadStandaloneSeedModule(): string {
  const selected = loadCanonicalSeed().cards.filter((card) => card.active);
  if (selected.length !== 60) {
    throw new Error(
      `Canonical seed produced ${String(selected.length)} active cards; expected 60.`
    );
  }
  return `export default ${JSON.stringify(selected)};`;
}

function localOnlySecurityHeadersPlugin(): Plugin {
  return {
    name: "article-english-local-only-security-headers",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: localOnlySecurityHeaders
      });
    }
  };
}

function assertViteModeMatchesAppMode(mode: string, appMode: string | undefined): void {
  if (
    appMode !== undefined &&
    !["cloud", "demo", "preview", "standalone", "desktop"].includes(appMode)
  ) {
    throw new Error(`Unsupported VITE_APP_MODE: ${appMode}`);
  }
  if (mode === "preview" && appMode !== "preview") {
    throw new Error("Vite mode/runtime mismatch: --mode preview requires VITE_APP_MODE=preview.");
  }
  if (appMode === "preview" && mode !== "preview") {
    throw new Error(
      "Vite mode/runtime mismatch: VITE_APP_MODE=preview requires --mode preview so security headers cannot be omitted."
    );
  }
  if (mode === "demo" && appMode !== "demo") {
    throw new Error("Vite mode/runtime mismatch: --mode demo requires VITE_APP_MODE=demo.");
  }
  if (appMode === "demo" && mode !== "demo") {
    throw new Error("Vite mode/runtime mismatch: VITE_APP_MODE=demo requires --mode demo.");
  }
  if (mode === "standalone" && appMode !== "standalone") {
    throw new Error(
      "Vite mode/runtime mismatch: --mode standalone requires VITE_APP_MODE=standalone."
    );
  }
  if (appMode === "standalone" && mode !== "standalone") {
    throw new Error(
      "Vite mode/runtime mismatch: VITE_APP_MODE=standalone requires --mode standalone."
    );
  }
  if (mode === "desktop" && appMode !== "desktop") {
    throw new Error("Vite mode/runtime mismatch: --mode desktop requires VITE_APP_MODE=desktop.");
  }
  if (appMode === "desktop" && mode !== "desktop") {
    throw new Error("Vite mode/runtime mismatch: VITE_APP_MODE=desktop requires --mode desktop.");
  }
}

function loadDesktopCloudEnvironment(mode: string): Record<string, string> {
  const modeEnvironment = loadEnv(mode, projectRoot, "VITE_");
  if (mode !== "desktop") {
    return modeEnvironment;
  }
  const productionEnvironment = loadEnv("production", projectRoot, "VITE_");
  const merged: Record<string, string> = {
    ...productionEnvironment,
    ...modeEnvironment
  };
  const url = modeEnvironment.VITE_SUPABASE_URL ?? productionEnvironment.VITE_SUPABASE_URL;
  const publishableKey =
    modeEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY ??
    productionEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url !== undefined) {
    merged.VITE_SUPABASE_URL = url;
  }
  if (publishableKey !== undefined) {
    merged.VITE_SUPABASE_PUBLISHABLE_KEY = publishableKey;
  }
  return merged;
}

export default defineConfig(({ mode }) => {
  const environment = loadDesktopCloudEnvironment(mode);
  const appMode = environment.VITE_APP_MODE;
  assertViteModeMatchesAppMode(mode, appMode);
  const desktopCloudPublicEnv =
    mode === "desktop" ? resolveDesktopCloudPublicEnv(environment) : null;

  return {
    plugins: [
      {
        name: "article-english-demo-seed",
        resolveId(id: string) {
          return id === demoSeedModuleId ? resolvedDemoSeedModuleId : null;
        },
        load(id: string) {
          return id === resolvedDemoSeedModuleId ? loadDemoSeedModule() : null;
        }
      },
      {
        name: "article-english-standalone-seed",
        resolveId(id: string) {
          return id === standaloneSeedModuleId ? resolvedStandaloneSeedModuleId : null;
        },
        load(id: string) {
          return id === resolvedStandaloneSeedModuleId ? loadStandaloneSeedModule() : null;
        }
      },
      ...(mode === "preview" || mode === "standalone" ? [localOnlySecurityHeadersPlugin()] : []),
      ...(mode === "performance" || mode === "cloud-performance"
        ? [
            {
              name: "article-english-test-entry",
              transformIndexHtml: {
                order: "pre" as const,
                handler(html: string) {
                  const entry =
                    mode === "performance"
                      ? "/tests/performance/performanceMain.tsx"
                      : "/tests/performance/cloudPerformanceMain.ts";
                  return html.replace("/src/main.tsx", entry);
                }
              }
            }
          ]
        : []),
      react(),
      VitePWA({
        disable: mode === "desktop",
        registerType: "prompt",
        injectRegister: null,
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"],
        manifest: {
          name: mode === "preview" ? "wordeasy Preview" : "wordeasy",
          short_name: mode === "preview" ? "wordeasy Preview" : "wordeasy",
          description:
            mode === "preview"
              ? "Local-data preview of context-first Research English and Medical English learning."
              : "Context-first Research English and Medical English learning.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#f5f6f8",
          theme_color: "#f5f6f8",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png"
            },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/cdn-cgi\//],
          globPatterns: ["**/*.{html,css,js,png,svg,webmanifest}"],
          globIgnores: ["og.png"],
          runtimeCaching: []
        }
      })
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "npm:ts-fsrs@5.4.1": "ts-fsrs"
      }
    },
    server:
      mode === "desktop"
        ? {
            host: "127.0.0.1",
            port: 1420,
            strictPort: true,
            watch: {
              ignored: ["**/src-tauri/**"]
            }
          }
        : undefined,
    define:
      mode === "cloud-performance"
        ? {
            "import.meta.env.VITE_APP_MODE": JSON.stringify("cloud"),
            "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
              "https://wordeasy-performance.invalid"
            ),
            "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
              "sb_publishable_performance_fixture"
            )
          }
        : desktopCloudPublicEnv === null
          ? undefined
          : {
              "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(desktopCloudPublicEnv.url),
              "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
                desktopCloudPublicEnv.publishableKey
              )
            },
    build: {
      target: "es2022",
      cssCodeSplit: true,
      sourcemap: false
    },
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "tests/e2e/**"],
      setupFiles: ["./tests/setup.ts"],
      restoreMocks: true,
      clearMocks: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "html"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/vite-env.d.ts"]
      }
    }
  };
});
