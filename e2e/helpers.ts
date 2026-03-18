import { Page } from "@playwright/test";

/** The tenant slug configured in playwright.config.ts */
export const TENANT_SLUG = process.env.E2E_TENANT_SLUG || "figata-cafe";

/**
 * Dismiss the location prompt if it appears.
 * Call this after navigating to /order pages.
 */
export async function dismissLocationPrompt(page: Page) {
  const prompt = page.getByText("Tell us where you are");
  if (await prompt.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator("button:has(svg.lucide-x)").first().click();
    await prompt.waitFor({ state: "hidden" });
  }
}

/**
 * Clear cart via localStorage before a test.
 */
export async function clearCart(page: Page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes("cart")) localStorage.removeItem(key);
    }
  });
}

/**
 * Add a product to cart by its visible name.
 */
export async function addProductToCart(page: Page, productName: string) {
  await page.getByText(productName, { exact: false }).first().click();
  await page.getByText("Add to cart").click();
  // Wait for cart bar to appear
  await page
    .getByText("View Cart")
    .waitFor({ state: "visible", timeout: 5000 });
}
