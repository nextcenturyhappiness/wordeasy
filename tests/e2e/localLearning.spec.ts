import { expect, test } from "@playwright/test";

test("renders both isolated modules without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Research English" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Medical English" })).toBeVisible();
  await expect(page.getByText("1 change pending")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
});

test("persists a Context Card rating locally across reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Continue Research English/u }).click();
  await page.getByRole("link", { name: /Continue New/u }).click();

  await expect(page.getByText(/what does the highlighted word mean/iu)).toBeVisible();
  await expect(page.getByRole("group", { name: "How well did you remember?" })).toHaveCount(0);
  await page.getByRole("button", { name: /Reveal answer/u }).click();
  await expect(page.getByRole("group", { name: "How well did you remember?" })).toBeVisible();
  await page.getByRole("button", { name: /Good/u }).click();

  await expect(page.getByText(/Card 2 of 10/u)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Card 1 of 9/u)).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("1 change pending")).toBeVisible();
  await expect(page.getByText("1 / 10")).toBeVisible();
  await expect(page.getByText("0 / 10")).toBeVisible();
});

test("persists Medical progress without changing Research progress", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Continue Medical English/u }).click();
  await expect(page.getByText("0 of 10 completed")).toBeVisible();
  await page.getByRole("link", { name: /Continue New/u }).click();

  await expect(page.getByText(/Card 1 of 10/u)).toBeVisible();
  await page.getByRole("button", { name: /Reveal answer/u }).click();
  await page.getByRole("button", { name: /Good/u }).click();
  await expect(page.getByText(/Card 2 of 10/u)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/Card 1 of 9/u)).toBeVisible();
  await page.goto("/");
  const medicalCard = page.getByRole("article", { name: "Medical English" });
  const researchCard = page.getByRole("article", { name: "Research English" });
  await expect(medicalCard.getByText("1 / 10")).toBeVisible();
  await expect(researchCard.getByText("0 / 10")).toBeVisible();
});

test("keeps primary study actions usable at 320 CSS pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/study/research?queue=new");

  const reveal = page.getByRole("button", { name: /Reveal answer/u });
  await expect(reveal).toBeVisible();
  await expect(reveal).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
    )
  ).toBe(true);
  await reveal.click();
  await expect(page.getByRole("button", { name: /Good/u })).toBeInViewport();
});
