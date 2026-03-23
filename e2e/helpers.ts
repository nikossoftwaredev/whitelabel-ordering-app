import { Page } from "@playwright/test";

/** The tenant slug configured in playwright.config.ts */
export const TENANT_SLUG = process.env.E2E_TENANT_SLUG || "figata-cafe";

/**
 * Suppress the PWA install prompt by setting the sessionStorage flag.
 * Call after page.goto() — persists through reloads in the same session.
 */
export async function suppressPwaPrompt(page: Page) {
  await page.evaluate(() => sessionStorage.setItem("pwa-prompt-dismissed", "1"));
}

/**
 * Register a script that runs before every page load to suppress the PWA prompt.
 * Call this ONCE at the start of a test (before any goto).
 */
export async function suppressPwaPromptGlobally(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
  });
}

/**
 * Dismiss the location prompt if it appears.
 * Call this after navigating to /order pages.
 */
export async function dismissLocationPrompt(page: Page) {
  // Suppress PWA prompt in case it appears (mobile)
  const keepUsingWeb = page.getByText(/Keep using web|Συνέχεια μέσω web/);
  if (await keepUsingWeb.isVisible({ timeout: 4000 }).catch(() => false)) {
    await keepUsingWeb.click();
    await keepUsingWeb.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
  }
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
 * Waits for products to load before clicking.
 */
export async function addProductToCart(page: Page, productName: string) {
  // Wait for products to load (price indicator)
  await page.locator("text=/€/").first().waitFor({ state: "visible", timeout: 10000 });
  await page.getByText(productName, { exact: false }).first().click();
  await page.getByText("Add to order").click();
  // Wait for cart bar to appear
  await page
    .getByText("View Cart")
    .waitFor({ state: "visible", timeout: 5000 });
}
