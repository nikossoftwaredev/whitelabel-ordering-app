import { defineConfig, devices } from "@playwright/test";

/**
 * Default tenant slug used for E2E tests.
 * Tests hit {slug}.lvh.me:3000 so the tenant middleware resolves correctly.
 * Override with E2E_TENANT_SLUG env var if you want a different tenant.
 */
const tenantSlug = process.env.E2E_TENANT_SLUG || "figata-cafe";
const baseURL = `http://${tenantSlug}.lvh.me:3000`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
