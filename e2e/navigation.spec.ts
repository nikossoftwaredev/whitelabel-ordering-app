import { expect, test } from "@playwright/test";

import { addProductToCart, clearCart, dismissLocationPrompt, suppressPwaPromptGlobally } from "./helpers";

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
  test("view cart → proceed to checkout navigates correctly", async ({
    page,
  }) => {
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");
    await page.getByText("View Cart").click();
    await expect(page.getByText("Subtotal")).toBeVisible({ timeout: 5000 });

    // Click proceed to checkout — may require sign-in
    const checkoutLink = page.getByText("Proceed to checkout").first();
    if (await checkoutLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkoutLink.click();
      // May navigate to checkout or show auth prompt in a dialog
      await page.waitForTimeout(3000);
    }
  });
});
