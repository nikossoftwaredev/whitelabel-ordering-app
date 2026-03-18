import { expect, test } from "@playwright/test";

import { dismissLocationPrompt, TENANT_SLUG } from "./helpers";

test.describe("Store Status", () => {
  test("status API returns valid response", async ({ request }) => {
    const res = await request.get(`/api/tenants/${TENANT_SLUG}/status`);
    expect(res.ok()).toBeTruthy();

    const status = await res.json();
    expect(status).toHaveProperty("isOpen");
    expect(status).toHaveProperty("isPaused");
    expect(typeof status.isOpen).toBe("boolean");
    expect(typeof status.isPaused).toBe("boolean");
  });

  test("store closed banner reflects status API", async ({ page }) => {
    await page.goto("/en/order");
    await dismissLocationPrompt(page);

    const statusRes = await page.request.get(
      `/api/tenants/${TENANT_SLUG}/status`
    );
    const status = await statusRes.json();

    if (!status.isOpen) {
      // If closed, the banner or some indicator should be visible
      await expect(
        page.getByText(/closed|paused/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Store Status API Guards", () => {
  test("order creation fails without auth", async ({ request }) => {
    const res = await request.post(`/api/tenants/${TENANT_SLUG}/orders`, {
      data: {
        items: [{ productId: "fake", quantity: 1, modifiers: [] }],
        orderType: "PICKUP",
        paymentMethod: "CASH",
        customerName: "Test",
        customerPhone: "1234567890",
      },
    });
    // 401 (not authenticated) regardless of store status
    expect(res.status()).toBe(401);
  });
});
