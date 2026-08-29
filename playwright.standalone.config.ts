/// <reference types="node" />

import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4177";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/standaloneDeployment.spec.ts",
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 5"],
    baseURL,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run preview:standalone -- --host 127.0.0.1 --port 4177",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000
  }
});
