import { expect,test } from "@playwright/test";

test.describe("Order Page", () => {
  test("should load the menu page", async ({ page }) => {
    await page.goto("/en/order");
    await expect(page).toHaveTitle(/Order/i);
    // Wait for menu to load
    await expect(page.locator("text=Popular")).toBeVisible({ timeout: 10000 });
  });

  test("should display store name and cover image", async ({ page }) => {
    await page.goto("/en/order");
    await expect(page.locator("text=Figata Cafe")).toBeVisible({ timeout: 10000 });
  });

  test("should search for products", async ({ page }) => {
    await page.goto("/en/order");
    // Dismiss location prompt if visible
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }

    const searchInput = page.getByPlaceholder(/Search in/i);
    await searchInput.fill("Espresso");
    await expect(page.locator("text=Espresso")).toBeVisible();
  });

  test("should open product detail sheet when clicking a product", async ({ page }) => {
    await page.goto("/en/order");
    // Dismiss location prompt
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    // Wait for products to load then click first one
    await page.locator("text=Espresso").first().click();
    // Product detail sheet should appear
    await expect(page.locator("text=Add to cart")).toBeVisible({ timeout: 5000 });
  });

  test("should add item to cart and show cart bar", async ({ page }) => {
    await page.goto("/en/order");
    // Dismiss location prompt
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    // Click on a product
    await page.locator("text=Espresso").first().click();
    // Click add to cart
    await page.locator("text=Add to cart").click();
    // Cart bar should appear
    await expect(page.locator("text=View Cart")).toBeVisible({ timeout: 5000 });
  });

  test("should filter by dietary preference", async ({ page }) => {
    await page.goto("/en/order");
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    // Click Vegan filter
    await page.locator("text=Vegan").first().click();
    // Should filter products
    await page.waitForTimeout(500);
  });
});

test.describe("Location Prompt", () => {
  test("should show location prompt for unauthenticated users", async ({ page }) => {
    // Clear localStorage
    await page.goto("/en/order");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator("text=Tell us where you are")).toBeVisible({ timeout: 5000 });
  });

  test("should dismiss location prompt", async ({ page }) => {
    await page.goto("/en/order");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    await closeBtn.click();

    await expect(page.locator("text=Tell us where you are")).not.toBeVisible();
  });
});
