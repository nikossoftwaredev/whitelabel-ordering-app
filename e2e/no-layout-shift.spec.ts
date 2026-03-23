import { expect, test } from "@playwright/test";

import {
  addProductToCart,
  dismissLocationPrompt,
  suppressPwaPromptGlobally,
} from "./helpers";

test.describe("No Layout Shift on Dialog Open", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("opening product detail dialog does not shift body content", async ({
    page,
  }) => {
    // Measure body's right edge before dialog opens
    const beforeRight = await page.evaluate(() => {
      const rect = document.body.getBoundingClientRect();
      return rect.right;
    });

    // Open product detail dialog
    await page.getByText("Espresso").first().click();
    await expect(page.locator("[role=dialog]")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    // Measure body's right edge after dialog opens
    const afterRight = await page.evaluate(() => {
      const rect = document.body.getBoundingClientRect();
      return rect.right;
    });

    // Body right edge must not move (tolerance: 1px for subpixel rounding)
    expect(Math.abs(afterRight - beforeRight)).toBeLessThanOrEqual(1);
  });

  test("opening cart dialog does not shift body content", async ({ page }) => {
    await addProductToCart(page, "Espresso");

    const beforeRight = await page.evaluate(() => {
      const rect = document.body.getBoundingClientRect();
      return rect.right;
    });

    await page.getByText("View Cart").click();
    await expect(page.locator("[role=dialog]")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    const afterRight = await page.evaluate(() => {
      const rect = document.body.getBoundingClientRect();
      return rect.right;
    });

    expect(Math.abs(afterRight - beforeRight)).toBeLessThanOrEqual(1);
  });

  test("body has no extra margin/padding when dialog is open", async ({
    page,
  }) => {
    await page.getByText("Espresso").first().click();
    await expect(page.locator("[role=dialog]")).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(300);

    const bodyStyles = await page.evaluate(() => {
      const s = getComputedStyle(document.body);
      return {
        marginRight: s.marginRight,
        paddingRight: s.paddingRight,
      };
    });
    expect(bodyStyles.marginRight).toBe("0px");
    expect(bodyStyles.paddingRight).toBe("0px");
  });
});
