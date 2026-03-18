import { expect, test } from "@playwright/test";

import { TENANT_SLUG } from "./helpers";

test.describe("API Route Guards", () => {
  test("GET /api/stores returns active stores", async ({ request }) => {
    const res = await request.get("/api/stores");
    expect(res.ok()).toBeTruthy();
    const { stores } = await res.json();
    expect(Array.isArray(stores)).toBeTruthy();
    expect(stores.length).toBeGreaterThan(0);
    for (const store of stores) {
      expect(store).toHaveProperty("id");
      expect(store).toHaveProperty("name");
      expect(store).toHaveProperty("slug");
    }
  });

  test("GET /api/tenants/:slug/menu returns categories and products", async ({
    request,
  }) => {
    const res = await request.get(`/api/tenants/${TENANT_SLUG}/menu`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // Response is { tenant, categories }
    expect(data).toHaveProperty("categories");
    expect(Array.isArray(data.categories)).toBeTruthy();
    expect(data.categories.length).toBeGreaterThan(0);
    for (const cat of data.categories) {
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("products");
      expect(Array.isArray(cat.products)).toBeTruthy();
    }
  });

  test("POST /api/tenants/:slug/orders requires auth", async ({
    request,
  }) => {
    const res = await request.post(`/api/tenants/${TENANT_SLUG}/orders`, {
      data: {
        items: [],
        orderType: "PICKUP",
        paymentMethod: "CASH",
        customerName: "Test",
        customerPhone: "123",
      },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/tenants/:slug/orders/active returns null without auth", async ({
    request,
  }) => {
    const res = await request.get(
      `/api/tenants/${TENANT_SLUG}/orders/active`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.order).toBeNull();
  });

  test("admin routes require authentication", async ({ request }) => {
    const res = await request.get("/api/admin/fake-tenant-id/stats");
    expect([401, 403]).toContain(res.status());
  });

  test("admin orders route requires authentication", async ({ request }) => {
    const res = await request.get("/api/admin/fake-tenant-id/orders");
    expect([401, 403]).toContain(res.status());
  });

  test("admin settings route requires authentication", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/fake-tenant-id/settings");
    expect([401, 403]).toContain(res.status());
  });

  test("invalid tenant slug returns 404 for status", async ({ request }) => {
    const res = await request.get(
      "/api/tenants/nonexistent-slug-xyz/status"
    );
    expect(res.status()).toBe(404);
  });
});
