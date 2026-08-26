import { expect, test } from "@playwright/test";

async function outboxCount(): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("wordeasy:demo:demo-user");
    request.onerror = () => {
      reject(request.error ?? new Error("Could not open the demo database."));
    };
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("sync_outbox", "readonly");
      const countRequest = transaction.objectStore("sync_outbox").count();
      countRequest.onerror = () => {
        reject(countRequest.error ?? new Error("Could not count the local outbox."));
      };
      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };
      transaction.oncomplete = () => {
        database.close();
      };
    };
  });
}

test("keeps cached learning progress and outbox events across an offline restart", async ({
  context,
  page
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.getByRole("link", { name: /Continue Research English/u }).click();
  await page.getByRole("link", { name: /Continue New/u }).click();
  for (let completed = 1; completed <= 3; completed += 1) {
    await page.getByRole("button", { name: /Reveal answer/u }).click();
    await page.getByRole("button", { name: /Good/u }).click();
    if (completed < 3) {
      await expect(
        page.getByText(new RegExp(`Card ${String(completed + 1)} of 10`, "u"))
      ).toBeVisible();
    }
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(/Card 1 of 7/u)).toBeVisible();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("3 changes pending")).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Research English" }).getByText("3 / 10")
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Medical English" }).getByText("0 / 10")
  ).toBeVisible();
  expect(await page.evaluate(outboxCount)).toBe(3);

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText("3 changes pending")).toBeVisible();
  expect(await page.evaluate(outboxCount)).toBe(3);
});
