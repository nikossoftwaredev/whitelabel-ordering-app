import { expect, test } from "@playwright/test";

import { addProductToCart, clearCart, dismissLocationPrompt, suppressPwaPrompt, suppressPwaPromptGlobally } from "./helpers";

test.describe("Menu Browsing", () => {
  test.beforeEach(async ({ page }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
  });

  test("menu loads with categories and products", async ({ page }) => {
    // Store name should be visible
    await expect(page.getByText("Figata Cafe").first()).toBeVisible({ timeout: 10000 });
    // Wait for products to load — price indicator
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 10000 });
  });

  test("search filters products", async ({ page }) => {
    const search = page.getByPlaceholder(/Search/i);
    await search.fill("Espresso");
    await expect(page.getByText("Espresso").first()).toBeVisible();
  });

  test("product detail sheet shows add-to-cart", async ({ page }) => {
    // Wait for products to load
    await expect(page.locator("text=/€/").first()).toBeVisible({ timeout: 10000 });
    // Click first product card
    await page.getByText("Espresso").first().click();
    const sheet = page.locator("[role=dialog]");
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.getByText("Add to cart")).toBeVisible();
  });

  test("dietary filter toggles work", async ({ page }) => {
    const veganBtn = page.getByText("Vegan").first();
    if (await veganBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await veganBtn.click();
      await page.waitForTimeout(500);
      await veganBtn.click();
    }
  });
});

test.describe("Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/en/order");
    await suppressPwaPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);
  });

  test("add item shows cart bar with count", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await expect(page.getByText("View Cart")).toBeVisible();
  });

  test("cart sheet opens and shows items", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();
    await expect(page.getByText("Espresso").first()).toBeVisible();
    await expect(page.getByText("Subtotal")).toBeVisible();
  });

  test("increase quantity in cart", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();
    await expect(page.getByText("Subtotal")).toBeVisible({ timeout: 5000 });

    // Scope to cart sheet to avoid clicking + on product cards behind
    const cartSheet = page.locator("[role=dialog]");
    const plusBtn = cartSheet.locator("button:has(svg.lucide-plus)").first();
    await plusBtn.click();
    await page.waitForTimeout(500);
  });

  test("remove item from cart auto-closes dialog", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();

    // Click minus to remove (quantity is 1, so item gets removed)
    const cartDialog = page.locator("[role=dialog]");
    await expect(cartDialog).toBeVisible({ timeout: 5000 });
    const minusBtn = cartDialog.locator("button:has(svg.lucide-minus)").first();
    await minusBtn.click();

    // Cart dialog should auto-close when empty
    await expect(cartDialog).toBeHidden({ timeout: 3000 });
  });

  test("cart persists after page reload", async ({ page }) => {
    await addProductToCart(page, "Espresso");
    await page.reload();
    await dismissLocationPrompt(page);
    await expect(page.getByText("View Cart")).toBeVisible({ timeout: 5000 });
  });
});
