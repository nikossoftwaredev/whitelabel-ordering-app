import { expect, test } from "@playwright/test";

import { addProductToCart, clearCart, dismissLocationPrompt } from "./helpers";

test.describe("Checkout — Unauthenticated", () => {
  test("checkout page shows sign-in or empty cart", async ({ page }) => {
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");
    await page.goto("/en/order/checkout");

    // Should show sign-in prompt (not authenticated) or checkout form
    await expect(
      page.getByText(/sign in|checkout/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("empty cart on checkout shows empty state", async ({ page }) => {
    // Clear cart and go to checkout
    await page.goto("/en/order");
    await clearCart(page);
    await page.goto("/en/order/checkout");

    // Should show empty cart or sign-in
    await expect(
      page.getByText(/empty|sign in/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Checkout — Delivery UI", () => {
  test("delivery tab shows address section when enabled", async ({
    page,
  }) => {
    await page.goto("/en/order");
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");
    await page.goto("/en/order/checkout");

    // If authenticated and delivery is enabled, check for delivery toggle
    const deliveryBtn = page.getByText("Delivery");
    if (await deliveryBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliveryBtn.click();
      await expect(
        page.getByText(/delivery address|no address selected/i).first()
      ).toBeVisible({ timeout: 3000 });
    }
  });
});
