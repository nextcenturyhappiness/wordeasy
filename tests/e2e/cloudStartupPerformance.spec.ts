import { expect, test } from "@playwright/test";

const remotePattern = "https://wordeasy-performance.invalid/**";

test("renders production cloud Cached Home while Supabase remains delayed for five seconds", async ({
  page
}) => {
  const requests: Array<{ elapsed: number; method: string; url: string }> = [];
  const startedAt = Date.now();
  page.on("request", (request) => {
    if (request.url().startsWith("https://wordeasy-performance.invalid/")) {
      requests.push({
        elapsed: Date.now() - startedAt,
        method: request.method(),
        url: request.url()
      });
    }
  });
  await page.route(remotePattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await route.abort("timedout");
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible({
    timeout: 1_500
  });
  await expect(
    page.getByRole("article", { name: "Research English" }).getByText("2 / 10")
  ).toBeVisible();
  const homeVisibleAt = Date.now() - startedAt;
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Number(
            performance.getEntriesByName("app-shell-visible", "mark").length > 0 &&
              performance.getEntriesByName("cached-home-ready", "mark").length > 0
          )
        ),
      { timeout: 1_500 }
    )
    .toBe(1);
  const marks = await page.evaluate(() => ({
    appShell: performance.getEntriesByName("app-shell-visible", "mark").at(-1)?.startTime ?? 0,
    cachedHome: performance.getEntriesByName("cached-home-ready", "mark").at(-1)?.startTime ?? 0,
    remoteSync: performance.getEntriesByName("remote-sync-complete", "mark").length
  }));

  expect(homeVisibleAt).toBeLessThan(1_500);
  expect(marks.appShell).toBeGreaterThan(0);
  expect(marks.appShell).toBeLessThan(1_500);
  expect(marks.cachedHome).toBeGreaterThanOrEqual(marks.appShell);
  expect(marks.remoteSync).toBe(0);
  await expect.poll(() => requests.length).toBeGreaterThan(0);
  console.log(
    `CLOUD_STARTUP_RESULT ${JSON.stringify({
      method:
        "production cloud entry with preseeded account IndexedDB and 5s intercepted Supabase delay",
      homeVisibleAt,
      marks,
      requests
    })}`
  );
});

test("keeps production cloud Cached Home visible when Supabase requests fail", async ({ page }) => {
  await page.route(remotePattern, (route) => route.abort("failed"));

  await page.goto("/");
  const research = page.getByRole("article", { name: "Research English" });
  await expect(research.getByText("2 / 10")).toBeVisible();
  await expect(
    page.getByText(/server could not verify this session.*Cached learning remains available/iu)
  ).toBeVisible();
  await expect(research.getByText("2 / 10")).toBeVisible();
});
