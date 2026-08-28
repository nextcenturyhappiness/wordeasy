import { expect, test } from "@playwright/test";

test("runs the explicit local-data preview without fake cloud sync and survives offline reload", async ({
  context,
  page
}) => {
  const supabaseRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|\/auth\/v1|\/rest\/v1/iu.test(request.url())) {
      supabaseRequests.push(request.url());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("status", { name: "Deployment status" })).toContainText(
    "Progress stays in this browser"
  );
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);

  await page.getByRole("link", { name: /Continue Research English/u }).click();
  await page.getByRole("link", { name: /Continue New/u }).click();
  await page.getByRole("button", { name: /Reveal answer/u }).click();
  await page.getByRole("button", { name: /^Good/u }).click();
  await page.getByRole("link", { name: "Article English home" }).click();

  const research = page.getByRole("article", { name: "Research English" });
  await expect(research.getByText("1 / 10")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "1 local review" })).toBeVisible();

  await page.reload();
  await expect(research.getByText("1 / 10")).toBeVisible();
  await page.goto("/today/research");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await expect(research.getByText("1 / 10")).toBeVisible();
  expect(supabaseRequests).toEqual([]);
});
