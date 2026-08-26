import { expect, test, type Browser, type Page } from "@playwright/test";

const baseURL = "http://127.0.0.1:4175";
const coldTrialCount = 3;
const warmTrialCount = 3;

interface BrowserMetricStore {
  cls: number;
  eventDurations: Record<string, number>;
  eventTimingSupported: boolean;
  lcp: number;
  longestTask: number;
}

interface JourneyMetrics {
  appShell: number;
  cachedHome: number;
  cls: number;
  fcp: number;
  homeToFirstCard: number;
  inp: number;
  inpObserved: boolean;
  lcp: number;
  longestTask: number;
}

interface SummaryMetrics {
  appShell: number;
  cachedHome: number;
  cls: number;
  fcp: number;
  homeToFirstCard: number;
  inp: number;
  lcp: number;
  longestTask: number;
}

interface BrowserIssueLog {
  messages: string[];
}

function median(values: number[]): number {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const value = ordered[middle];
  if (value === undefined) {
    throw new Error("A performance median requires at least one trial.");
  }

  return Number(value.toFixed(1));
}

function summarize(trials: JourneyMetrics[]): SummaryMetrics {
  return {
    appShell: median(trials.map((trial) => trial.appShell)),
    cachedHome: median(trials.map((trial) => trial.cachedHome)),
    fcp: median(trials.map((trial) => trial.fcp)),
    lcp: median(trials.map((trial) => trial.lcp)),
    inp: median(trials.map((trial) => trial.inp)),
    cls: median(trials.map((trial) => trial.cls)),
    homeToFirstCard: median(trials.map((trial) => trial.homeToFirstCard)),
    longestTask: median(trials.map((trial) => trial.longestTask))
  };
}

async function installMetricObservers(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const store: BrowserMetricStore = {
      cls: 0,
      eventDurations: {},
      eventTimingSupported: PerformanceObserver.supportedEntryTypes.includes("event"),
      lcp: 0,
      longestTask: 0
    };
    const measuredWindow = window as typeof window & {
      __articleEnglishMetrics?: BrowserMetricStore;
    };
    measuredWindow.__articleEnglishMetrics = store;

    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries.at(-1);
        if (lastEntry !== undefined) {
          store.lcp = lastEntry.startTime;
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });
    }

    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            hadRecentInput: boolean;
            value: number;
          };
          if (!shift.hadRecentInput) {
            store.cls += shift.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    }

    if (store.eventTimingSupported) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const event = entry as PerformanceEntry & { interactionId: number };
          if (event.interactionId <= 0) {
            continue;
          }
          const key = String(event.interactionId);
          store.eventDurations[key] = Math.max(store.eventDurations[key] ?? 0, event.duration);
        }
      }).observe({
        type: "event",
        buffered: true,
        durationThreshold: 16
      } as PerformanceObserverInit);
    }

    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          store.longestTask = Math.max(store.longestTask, entry.duration);
        }
      }).observe({ type: "longtask", buffered: true });
    }
  });
}

async function applyCpuAndNetworkConditions(
  page: Page,
  options: { slow4g: boolean }
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: options.slow4g ? 150 : 0,
    downloadThroughput: options.slow4g ? 204_800 : -1,
    uploadThroughput: options.slow4g ? 96_000 : -1,
    connectionType: options.slow4g ? "cellular4g" : "none"
  });
}

async function openFirstResearchCard(page: Page, issues: BrowserIssueLog): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await page.evaluate(() => performance.mark("performance-home-navigation-start"));
  await page.getByRole("link", { name: /Continue Research English/u }).click();
  await expect(
    page.getByRole("heading", { name: "Today" }),
    `Browser issues: ${issues.messages.join(" | ") || "none captured"}`
  ).toBeVisible();
  await page.getByRole("link", { name: /Continue New/u }).click();
  await expect(page.getByRole("button", { name: /Reveal answer/u })).toBeVisible();
  await page.waitForTimeout(250);
}

async function readJourneyMetrics(page: Page): Promise<JourneyMetrics> {
  return page.evaluate(() => {
    const measuredWindow = window as typeof window & {
      __articleEnglishMetrics?: BrowserMetricStore;
    };
    const store = measuredWindow.__articleEnglishMetrics;
    if (store === undefined) {
      throw new Error("The browser metric observers were not installed.");
    }

    const markTime = (name: string): number =>
      performance.getEntriesByName(name, "mark").at(-1)?.startTime ?? 0;
    const inputDurations = Object.values(store.eventDurations);

    return {
      appShell: markTime("app-shell-visible"),
      cachedHome: markTime("cached-home-ready"),
      fcp: performance.getEntriesByName("first-contentful-paint", "paint").at(-1)?.startTime ?? 0,
      lcp: store.lcp,
      inp: inputDurations.length === 0 ? 0 : Math.max(...inputDurations),
      inpObserved: store.eventTimingSupported && inputDurations.length > 0,
      cls: store.cls,
      homeToFirstCard: Math.max(
        0,
        markTime("first-study-card-ready") - markTime("performance-home-navigation-start")
      ),
      longestTask: store.longestTask
    };
  });
}

async function createAndroidPage(
  browser: Browser
): Promise<{ close: () => Promise<void>; issues: BrowserIssueLog; page: Page }> {
  const context = await browser.newContext({
    baseURL,
    deviceScaleFactor: 2.75,
    hasTouch: true,
    isMobile: true,
    serviceWorkers: "allow",
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    viewport: { width: 393, height: 851 }
  });
  const page = await context.newPage();
  const issues: BrowserIssueLog = { messages: [] };
  page.on("pageerror", (error) => issues.messages.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      issues.messages.push(`console: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) =>
    issues.messages.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`
    )
  );
  await installMetricObservers(page);
  return { close: () => context.close(), issues, page };
}

test("reports three-run cold and warm synthetic demo-fixture medians", async ({ browser }) => {
  const coldTrials: JourneyMetrics[] = [];
  for (let trial = 0; trial < coldTrialCount; trial += 1) {
    const measured = await createAndroidPage(browser);
    await applyCpuAndNetworkConditions(measured.page, { slow4g: true });
    await openFirstResearchCard(measured.page, measured.issues);
    coldTrials.push(await readJourneyMetrics(measured.page));
    await measured.close();
  }

  const warmTrials: JourneyMetrics[] = [];
  const measured = await createAndroidPage(browser);
  await applyCpuAndNetworkConditions(measured.page, { slow4g: false });
  await measured.page.goto("/");
  await expect(measured.page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await measured.page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  for (let trial = 0; trial < warmTrialCount; trial += 1) {
    await measured.page.goto("about:blank");
    await openFirstResearchCard(measured.page, measured.issues);
    warmTrials.push(await readJourneyMetrics(measured.page));
  }
  await measured.close();

  const coldMedian = summarize(coldTrials);
  const warmMedian = summarize(warmTrials);
  const inpObserved = coldTrials.every((trial) => trial.inpObserved);
  const result = {
    method:
      "Synthetic demo fixture via Playwright CDP fallback (not production cloud, Lighthouse, or a DevTools trace)",
    environment: {
      browser: "system Chrome",
      viewport: "393x851 CSS pixels (Pixel 5)",
      cold: "4x CPU, 150ms latency, 1.64Mbps down, 0.77Mbps up",
      warm: "primed HTTP, module, Service Worker, and IndexedDB cache; 4x CPU"
    },
    units: { cls: "unitless", allOtherMetrics: "milliseconds" },
    trials: { cold: coldTrials, warm: warmTrials },
    medians: { cold: coldMedian, warm: warmMedian },
    inpObserved
  };
  console.log(`PERFORMANCE_RESULT ${JSON.stringify(result)}`);

  expect(coldMedian.fcp, "cold FCP median").toBeGreaterThan(0);
  expect(coldMedian.fcp, "cold FCP median").toBeLessThanOrEqual(1_800);
  expect(coldMedian.lcp, "cold LCP median").toBeGreaterThan(0);
  expect(coldMedian.lcp, "cold LCP median").toBeLessThanOrEqual(2_500);
  expect(coldMedian.cls, "cold CLS median").toBeLessThanOrEqual(0.1);
  expect(inpObserved, "Event Timing INP evidence was captured in all cold trials").toBe(true);
  expect(coldMedian.inp, "cold INP approximation median").toBeLessThanOrEqual(200);
  expect(coldMedian.appShell, "App Shell mark follows first visible paint").toBeGreaterThanOrEqual(
    coldMedian.fcp
  );
  expect(coldMedian.cachedHome, "Cached Home mark follows App Shell").toBeGreaterThanOrEqual(
    coldMedian.appShell
  );
  expect(warmMedian.appShell, "warm App Shell median").toBeLessThanOrEqual(800);
  expect(warmMedian.cachedHome, "warm Cached Home median").toBeLessThanOrEqual(1_200);
  expect(warmMedian.homeToFirstCard, "warm Home to first cached card median").toBeLessThanOrEqual(
    300
  );
});
