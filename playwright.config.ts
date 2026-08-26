/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: [
    "**/pwaOffline.spec.ts",
    "**/pwaOfflineLearning.spec.ts",
    "**/cloudStartupPerformance.spec.ts",
    "**/performance.spec.ts"
  ],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev:demo -- --host 127.0.0.1 --port 4173",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 30_000
  },
  projects: [
    {
      name: "macos-chrome",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "android-chrome",
      use: { ...devices["Pixel 5"] }
    }
  ]
});
