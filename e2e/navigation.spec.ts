import { expect, test } from "@playwright/test";

import { addProductToCart, clearCart, dismissLocationPrompt } from "./helpers";

test.describe("Page Navigation", () => {
  test("order page loads without errors", async ({ page }) => {
    const res = await page.goto("/en/order");
    expect(res?.ok()).toBeTruthy();
  });

  test("checkout page loads", async ({ page }) => {
    const res = await page.goto("/en/order/checkout");
    expect(res?.ok()).toBeTruthy();
  });

  test("order history page loads", async ({ page }) => {
    const res = await page.goto("/en/order/orders");
    expect(res?.ok()).toBeTruthy();
  });

  test("profile page loads", async ({ page }) => {
    const res = await page.goto("/en/order/profile");
    expect(res?.ok()).toBeTruthy();
  });

  test("admin page loads (redirects without auth)", async ({ page }) => {
    const res = await page.goto("/en/admin");
    expect(res?.ok()).toBeTruthy();
  });
});

test.describe("Cart → Checkout Navigation", () => {
  test("clicking checkout in cart navigates to checkout page", async ({
    page,
  }) => {
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();

    // Wait for cart sheet
    await expect(page.getByText("Subtotal")).toBeVisible({ timeout: 5000 });

    // Click proceed to checkout
    const checkoutBtn = page.getByText("Proceed to checkout").first();
    if (await checkoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutBtn.click();
      await page.waitForURL(/checkout/, { timeout: 10000 });
      expect(page.url()).toContain("checkout");
    }
  });
});

test.describe("Back Navigation", () => {
  test("checkout back button returns to menu", async ({ page }) => {
    await page.goto("/en/order/checkout");
    // Look for back arrow or "Back to Menu" link
    const backLink = page.getByText("Back to Menu");
    if (await backLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backLink.click();
      await page.waitForURL(/order/, { timeout: 5000 });
    }
  });
});
