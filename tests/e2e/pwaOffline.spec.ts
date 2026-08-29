import { expect, test } from "@playwright/test";

test("launches the production App Shell from the service worker while offline", async ({
  context,
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "wordeasy could not open." })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "wordeasy could not open." })).toBeVisible();
  await expect(page.getByText("Configuration needed")).toBeVisible();
});
