import { expect, test } from "@playwright/test";

import { dismissLocationPrompt } from "./helpers";

test.describe("Internationalization", () => {
  test("English locale loads menu correctly", async ({ page }) => {
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    // Should show the store's menu — wait for any product price
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("Greek locale loads correctly", async ({ page }) => {
    await page.goto("/el/order");
    await dismissLocationPrompt(page);
    // Page loads without error, URL preserved
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("/el/");
  });

  test("invalid locale returns 404", async ({ page }) => {
    const res = await page.goto("/xx/order");
    expect(res?.status()).toBe(404);
  });

  test("checkout page respects Greek locale", async ({ page }) => {
    await page.goto("/el/order/checkout");
    // Should show Greek: either sign-in prompt or checkout form
    await expect(
      page.getByText(/Σύνδεση|καλάθι|Ολοκλήρωση/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
