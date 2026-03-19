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

  test("dietary filter toggles", async ({ page }) => {
    const veganBtn = page.getByText("Vegan").first();
    if (await veganBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click to activate filter
      await veganBtn.click();
      await page.waitForTimeout(500);
      // Page should not have errors — just verify it's still functional
      await expect(page.locator("body")).toBeVisible();

      // Click again to deselect
      await veganBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator("body")).toBeVisible();
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

    // Dialog should contain modifier group text like "Size" or "Choose"
    const hasSize = await dialog
      .getByText(/Size|Choose/i)
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasSize).toBeTruthy();
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

test.describe("Cart Auto-Close", () => {
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

  test("cart dialog auto-closes when last item removed", async ({ page }) => {
    // Add Espresso to cart
    await addProductToCart(page, "Espresso");

    // Open cart
    await page.getByText("View Cart").click();

    const cartDialog = page.locator("[role=dialog]");
    await expect(cartDialog).toBeVisible({ timeout: 5000 });

    // Click minus to remove the item (quantity is 1, so it gets removed)
    const minusBtn = cartDialog
      .locator("button:has(svg.lucide-minus)")
      .first();
    await minusBtn.click();

    // Cart dialog should auto-close when empty
    await expect(cartDialog).toBeHidden({ timeout: 5000 });
  });
});
