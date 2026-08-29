import { expect, test, type Page } from "@playwright/test";

async function cachedCardCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const request = indexedDB.open("wordeasy:standalone:v1:local-user");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("Could not open local database."));
      };
    });
    const transaction = database.transaction("cached_cards", "readonly");
    const countRequest = transaction.objectStore("cached_cards").count();
    const count = await new Promise<number>((resolve, reject) => {
      countRequest.onsuccess = () => {
        resolve(countRequest.result);
      };
      countRequest.onerror = () => {
        reject(countRequest.error ?? new Error("Could not count cards."));
      };
    });
    database.close();
    return count;
  });
}

test("runs the formal personal PWA with the complete catalog and offline local persistence", async ({
  context,
  page
}) => {
  await page.addInitScript(() => {
    const idleCallbacks = new Map<number, IdleRequestCallback>();
    let nextIdleHandle = 0;
    const testWindow = window as typeof window & {
      __runArticleEnglishIdlePrefetch: () => void;
    };
    testWindow.requestIdleCallback = (callback) => {
      nextIdleHandle += 1;
      idleCallbacks.set(nextIdleHandle, callback);
      return nextIdleHandle;
    };
    testWindow.cancelIdleCallback = (handle) => {
      idleCallbacks.delete(handle);
    };
    testWindow.__runArticleEnglishIdlePrefetch = () => {
      const callbacks = [...idleCallbacks.values()];
      idleCallbacks.clear();
      callbacks.forEach((callback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 });
      });
    };
  });

  const remoteDataRequests: string[] = [];
  page.on("request", (request) => {
    if (/supabase|\/auth\/v1|\/rest\/v1/iu.test(request.url())) {
      remoteDataRequests.push(request.url());
    }
  });

  await page.goto("/");
  const deploymentNotice = page.getByRole("status", { name: "Deployment status" });
  await expect(deploymentNotice).toContainText("Personal edition");
  await expect(deploymentNotice).toContainText("stored only on this device");
  await expect(deploymentNotice).not.toContainText("Preview");
  await expect(page.getByRole("status").filter({ hasText: "Saved on this device" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sync now" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);

  expect(await cachedCardCount(page)).toBe(0);
  await page.evaluate(() => {
    (
      window as typeof window & { __runArticleEnglishIdlePrefetch: () => void }
    ).__runArticleEnglishIdlePrefetch();
  });
  await expect.poll(() => cachedCardCount(page)).toBe(60);

  await page.getByRole("link", { name: /Continue Research English/u }).click();
  expect(await cachedCardCount(page)).toBe(60);
  await page.getByRole("link", { name: /Continue New/u }).click();
  await page.getByRole("button", { name: /Reveal answer/u }).click();
  await page.getByRole("button", { name: /^Good/u }).click();
  await page.getByRole("link", { name: "wordeasy home" }).click();

  const research = page.getByRole("article", { name: "Research English" });
  await expect(research.getByText("1 / 10")).toBeVisible();
  await page.reload();
  await expect(research.getByText("1 / 10")).toBeVisible();
  await page.goto("/today/research");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await expect(research.getByText("1 / 10")).toBeVisible();
  expect(remoteDataRequests).toEqual([]);
});
