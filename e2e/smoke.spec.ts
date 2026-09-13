import { expect, test } from "@playwright/test";

test("landing page renders in every project", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/7eight|8eight/i);
});