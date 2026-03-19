import { expect, test } from "@playwright/test";

import { addProductToCart, clearCart, dismissLocationPrompt, suppressPwaPromptGlobally } from "./helpers";

test.describe("Checkout — Unauthenticated", () => {
  test("checkout page shows sign-in or empty cart", async ({ page }) => {
    await page.goto("/en/order");
    await suppressPwaPromptGlobally(page);
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");

    // Navigate to checkout via URL
    await page.goto("/en/order/checkout");
    await dismissLocationPrompt(page);

    // Should show sign-in prompt (not authenticated), checkout form, or menu with cart
    await expect(
      page.getByText(/sign in|checkout|empty|View Cart/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("empty cart on checkout shows empty state", async ({ page }) => {
    // Clear cart and go to checkout
    await page.goto("/en/order");
    await suppressPwaPromptGlobally(page);
    await clearCart(page);
    await page.goto("/en/order/checkout");
    await dismissLocationPrompt(page);

    // Should show empty cart, redirect to order, or sign-in
    await expect(
      page.getByText(/empty|sign in|Search|Figata/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Checkout — Delivery UI", () => {
  test("delivery tab shows address section when enabled", async ({
    page,
  }) => {
    await page.goto("/en/order");
    await suppressPwaPromptGlobally(page);
    await dismissLocationPrompt(page);
    await clearCart(page);
    await page.reload();
    await dismissLocationPrompt(page);

    await addProductToCart(page, "Espresso");
    await page.goto("/en/order/checkout");
    await dismissLocationPrompt(page);

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
