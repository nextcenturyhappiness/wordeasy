import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { loadEnv, type Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const demoSeedModuleId = "virtual:article-english-demo-seed";
const resolvedDemoSeedModuleId = `\0${demoSeedModuleId}`;
const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const previewSecurityHeaders = `/*
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

function loadDemoSeedModule(): string {
  const seed = JSON.parse(
    readFileSync(fileURLToPath(new URL("./data/seed-data.json", import.meta.url)), "utf8")
  ) as { cards: BuildSeedCard[] };
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

function previewSecurityHeadersPlugin(): Plugin {
  return {
    name: "article-english-preview-security-headers",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: previewSecurityHeaders
      });
    }
  };
}

function assertViteModeMatchesAppMode(mode: string, appMode: string | undefined): void {
  if (appMode !== undefined && !["cloud", "demo", "preview"].includes(appMode)) {
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
}

export default defineConfig(({ mode }) => {
  const appMode = loadEnv(mode, projectRoot, "VITE_").VITE_APP_MODE;
  assertViteModeMatchesAppMode(mode, appMode);

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
      ...(mode === "preview" ? [previewSecurityHeadersPlugin()] : []),
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
        registerType: "prompt",
        injectRegister: null,
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"],
        manifest: {
          name: mode === "preview" ? "Article English Preview" : "Article English",
          short_name: mode === "preview" ? "English Preview" : "English",
          description:
            mode === "preview"
              ? "Local-data preview of context-first Research English and Medical English learning."
              : "Context-first Research English and Medical English learning.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#f6f3ec",
          theme_color: "#173f35",
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
        : undefined,
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
