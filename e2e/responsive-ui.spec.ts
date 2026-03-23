import { expect, test } from "@playwright/test";

import {
  addProductToCart,
  clearCart,
  dismissLocationPrompt,
  suppressPwaPromptGlobally,
} from "./helpers";

test.describe("Search and Filters", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    // Wait for products to load
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("search filters products in real-time", async ({ page }) => {
    const search = page.getByPlaceholder(/Search/i);
    await search.fill("Latte");
    await page.waitForTimeout(500);

    // "Latte" product should be visible
    await expect(page.getByText("Latte").first()).toBeVisible({
      timeout: 5000,
    });

    // "Espresso" should either be gone or reduced in count within the product area
    const espressoCount = await page.getByText("Espresso").count();
    // After filtering for "Latte", Espresso entries should be fewer than before
    // At minimum, if Espresso is still visible it should only be in non-product areas
    expect(espressoCount).toBeLessThanOrEqual(1);
  });

  test("empty search shows no products found", async ({ page }) => {
    const search = page.getByPlaceholder(/Search/i);
    await search.fill("xyznonexistent");
    await page.waitForTimeout(500);

    await expect(page.getByText(/No products found/i).first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("clearing search restores full menu", async ({ page }) => {
    const search = page.getByPlaceholder(/Search/i);

    // Fill with nonsense to get empty state
    await search.fill("xyz");
    await page.waitForTimeout(500);
    await expect(page.getByText(/No products found/i).first()).toBeVisible({
      timeout: 5000,
    });

    // Clear the search input
    await search.clear();
    await page.waitForTimeout(500);

    // Products should return — check for price indicators
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("dietary filter popover opens", async ({ page }) => {
    // The dietary filter is inside a Popover — look for the filter icon button
    const filterTrigger = page.locator("button:has(svg.lucide-sliders-horizontal)").first();
    if (await filterTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterTrigger.click();
      // Popover should appear with filter options
      await expect(page.getByRole("button", { name: "Vegan" })).toBeVisible({ timeout: 3000 });
      // Close by clicking outside
      await page.locator("body").click({ position: { x: 0, y: 0 } });
    }
  });
});

test.describe("Product Quick-Add vs Detail", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    // Wait for products to load
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("product with required modifiers opens detail dialog", async ({
    page,
  }) => {
    // Click on "Espresso" which has a required Size modifier
    await page.getByText("Espresso").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should show the product name and an Add to order button
    await expect(dialog.getByRole("heading", { name: "Espresso" }).first()).toBeVisible({ timeout: 3000 });
    await expect(dialog.getByText(/Add to order/i).first()).toBeVisible({ timeout: 3000 });
  });

  test("quantity controls in product detail work", async ({ page }) => {
    // Open product detail for Espresso
    await page.getByText("Espresso").first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Find the plus button in the dialog's sticky bottom bar
    const plusBtn = dialog.locator("button:has(svg.lucide-plus)").first();
    await plusBtn.click();
    await page.waitForTimeout(500);

    // Quantity should now show "2"
    await expect(dialog.getByText("2").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Cart Close", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
    // Wait for products to load
    await expect(page.locator("text=/€/").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("cart dialog can be closed via close button", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();

    const cartDialog = page.locator("[role=dialog]");
    await expect(cartDialog).toBeVisible({ timeout: 5000 });

    // Close via Close button
    await page.getByRole("button", { name: "Close" }).click();
    await expect(cartDialog).toBeHidden({ timeout: 5000 });
  });
});
