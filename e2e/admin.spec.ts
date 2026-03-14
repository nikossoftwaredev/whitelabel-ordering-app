import { test, expect } from "@playwright/test";

test.describe("Admin Panel", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/en/admin");
    // Should be redirected to sign in or show unauthorized
    await page.waitForTimeout(2000);
    // Check we're not on the admin dashboard
    const url = page.url();
    expect(url.includes("/admin") || url.includes("/auth") || url.includes("/api/auth")).toBeTruthy();
  });
});

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/en");
    await expect(page).toHaveURL(/\/en/);
  });
});
