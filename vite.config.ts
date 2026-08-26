import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const demoSeedModuleId = "virtual:article-english-demo-seed";
const resolvedDemoSeedModuleId = `\0${demoSeedModuleId}`;
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

export default defineConfig(({ mode }) => ({
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
        name: "Article English",
        short_name: "English",
        description: "Context-first Research English and Medical English learning.",
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
}));
