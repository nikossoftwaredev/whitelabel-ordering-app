import { expect, test } from "@playwright/test";

import {
  addProductToCart,
  dismissLocationPrompt,
  suppressPwaPromptGlobally,
} from "./helpers";

test.describe("Address Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
  });

  test("address list dialog opens from header", async ({ page }) => {
    await page.getByText("Add address").first().click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Choose address")).toBeVisible({
      timeout: 5000,
    });
  });

  test("add new address requires auth when not logged in", async ({ page }) => {
    await page.getByText("Add address").first().click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.getByText("Add new address").click();
    // Not logged in → auth dialog opens
    await expect(dialog.getByText("Sign in")).toBeVisible({
      timeout: 5000,
    });
  });

  test("address picker shows in cart dialog", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText("Add address").first()).toBeVisible({
      timeout: 5000,
    });
  });
});
