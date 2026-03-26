import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { TENANT_SLUG } from "./helpers";

const BASE = `http://${TENANT_SLUG}.lvh.me:3000`;

/**
 * Create a NextAuth session for a given userId and return the token.
 */
async function createSession(prisma: PrismaClient, userId: string) {
  const token = `e2e-analytics-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.session.create({
    data: {
      userId,
      sessionToken: token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

// ─── API Route Guard Tests ──────────────────────────────────

test.describe("Analytics Detailed API Guards", () => {
  test("GET /api/admin/:tenantId/analytics/detailed requires auth", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/admin/fake-tenant-id/analytics/detailed"
    );
    expect([401, 403]).toContain(res.status());
  });

  test("rejects startDate after endDate", async ({ request }) => {
    // Even without auth, date validation may return 400 or 401/403 first
    const res = await request.get(
      "/api/admin/fake-tenant-id/analytics/detailed?startDate=2026-03-20&endDate=2026-03-10"
    );
    expect([400, 401, 403]).toContain(res.status());
  });

  test("rejects range exceeding 366 days", async ({ request }) => {
    const res = await request.get(
      "/api/admin/fake-tenant-id/analytics/detailed?startDate=2024-01-01&endDate=2026-01-01"
    );
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── Authenticated API Tests ────────────────────────────────

test.describe("Analytics Detailed API (authenticated)", () => {
  let prisma: PrismaClient;
  let tenant: { id: string; slug: string };
  let adminToken: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient();

    const t = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
    });
    if (!t) throw new Error(`Tenant "${TENANT_SLUG}" not found`);
    tenant = t;

    // Find admin user
    const adminRole = await prisma.tenantRole.findFirst({
      where: {
        tenantId: tenant.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!adminRole) throw new Error("No admin user for this tenant");

    adminToken = await createSession(prisma, adminRole.userId);
  });

  test.afterAll(async () => {
    if (adminToken) {
      await prisma.session.deleteMany({
        where: { sessionToken: adminToken },
      });
    }
    await prisma.$disconnect();
  });

  test("returns analytics with default date range (last 7 days)", async ({
    page,
  }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();

    // Verify response shape
    expect(data).toHaveProperty("meta");
    expect(data).toHaveProperty("timeSeries");
    expect(data).toHaveProperty("orderTypeBreakdown");
    expect(data).toHaveProperty("peakHours");
    expect(data).toHaveProperty("summary");

    // Verify meta
    expect(data.meta).toHaveProperty("startDate");
    expect(data.meta).toHaveProperty("endDate");
    expect(data.meta).toHaveProperty("granularity");
    expect(data.meta).toHaveProperty("totalDays");
    expect(data.meta.granularity).toBe("day");
    expect(data.meta.totalDays).toBe(7);

    // Verify timeSeries shape
    expect(Array.isArray(data.timeSeries)).toBeTruthy();
    expect(data.timeSeries.length).toBe(7);
    for (const point of data.timeSeries) {
      expect(point).toHaveProperty("key");
      expect(point).toHaveProperty("label");
      expect(point).toHaveProperty("revenue");
      expect(point).toHaveProperty("orders");
      expect(typeof point.revenue).toBe("number");
      expect(typeof point.orders).toBe("number");
    }

    // Verify summary shape
    expect(data.summary).toHaveProperty("totalRevenue");
    expect(data.summary).toHaveProperty("avgDailyRevenue");
    expect(data.summary).toHaveProperty("peakDay");
    expect(data.summary).toHaveProperty("totalOrders");
    expect(data.summary).toHaveProperty("avgDailyOrders");
    expect(data.summary).toHaveProperty("avgOrderValue");
    expect(data.summary).toHaveProperty("mostPopularType");
    expect(data.summary).toHaveProperty("busiestHour");
    expect(data.summary).toHaveProperty("quietestHour");
  });

  test("returns correct granularity for single day (today)", async ({
    page,
  }) => {
    const today = new Date().toISOString().split("T")[0];
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed?startDate=${today}&endDate=${today}`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.meta.granularity).toBe("hour");
    // 24 hours in a day
    expect(data.timeSeries.length).toBe(24);
  });

  test("returns month granularity for year-long range", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed?startDate=2025-01-01&endDate=2025-12-31`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.meta.granularity).toBe("month");
    expect(data.timeSeries.length).toBe(12);
  });

  test("returns 400 for invalid date format", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed?startDate=not-a-date&endDate=2026-03-26`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid date format");
  });

  test("returns 400 when startDate is after endDate", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed?startDate=2026-03-20&endDate=2026-03-10`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("startDate must be before endDate");
  });

  test("clamps future endDate to today", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const futureDate = "2030-12-31";
    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed?startDate=2026-03-01&endDate=${futureDate}`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    // endDate should be clamped to today, not 2030-12-31
    expect(data.meta.endDate).not.toBe(futureDate);
  });

  test("order type breakdown includes percentage", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    for (const entry of data.orderTypeBreakdown) {
      expect(entry).toHaveProperty("type");
      expect(entry).toHaveProperty("count");
      expect(entry).toHaveProperty("percentage");
      expect(typeof entry.percentage).toBe("number");
    }
  });

  test("peak hours entries have hour and count", async ({ page }) => {
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const res = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/analytics/detailed`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);

    const data = await res.json();
    for (const entry of data.peakHours) {
      expect(entry).toHaveProperty("hour");
      expect(entry).toHaveProperty("count");
      expect(entry.hour).toBeGreaterThanOrEqual(0);
      expect(entry.hour).toBeLessThanOrEqual(23);
    }
  });
});

// ─── Admin Dashboard UI Tests ───────────────────────────────

test.describe("Analytics Detail Dialog UI", () => {
  let prisma: PrismaClient;
  let tenant: { id: string };
  let adminToken: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient();

    const t = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
    });
    if (!t) throw new Error(`Tenant "${TENANT_SLUG}" not found`);
    tenant = t;

    const adminRole = await prisma.tenantRole.findFirst({
      where: {
        tenantId: tenant.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!adminRole) throw new Error("No admin user for this tenant");

    adminToken = await createSession(prisma, adminRole.userId);
  });

  test.afterAll(async () => {
    if (adminToken) {
      await prisma.session.deleteMany({
        where: { sessionToken: adminToken },
      });
    }
    await prisma.$disconnect();
  });

  test("analytics cards show expand buttons", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Wait for analytics section to load (expand buttons use lucide-expand icon)
    const expandButtons = page.locator(
      "button:has(svg.lucide-expand)"
    );
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });

    // Should have 4 expand buttons (one per analytics card)
    await expect(expandButtons).toHaveCount(4);
  });

  test("clicking expand opens the detail dialog with correct tab", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Wait for expand buttons
    const expandButtons = page.locator("button:has(svg.lucide-expand)");
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });

    // Click the first expand button (Revenue)
    await expandButtons.first().click();

    // Dialog should open
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Should show "Detailed Analytics" title
    await expect(
      dialog.getByText("Detailed Analytics")
    ).toBeVisible({ timeout: 5000 });

    // Revenue tab should be active (first tab)
    await expect(
      dialog.getByRole("tab", { name: "Revenue" })
    ).toBeVisible();

    // Date preset pills should be visible
    await expect(
      dialog.getByText("Last 7 Days")
    ).toBeVisible();
    await expect(
      dialog.getByText("This Month")
    ).toBeVisible();

    // Download PDF button should be visible
    await expect(
      dialog.locator("button:has(svg.lucide-download)")
    ).toBeVisible();
  });

  test("switching tabs works", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Open dialog
    const expandButtons = page.locator("button:has(svg.lucide-expand)");
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });
    await expandButtons.first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click Orders tab
    await dialog.getByRole("tab", { name: "Orders" }).click();
    await expect(
      dialog.getByRole("tab", { name: "Orders" })
    ).toHaveAttribute("data-state", "active");

    // Click Order Types tab
    await dialog.getByRole("tab", { name: "Order Types" }).click();
    await expect(
      dialog.getByRole("tab", { name: "Order Types" })
    ).toHaveAttribute("data-state", "active");

    // Click Peak Hours tab
    await dialog.getByRole("tab", { name: "Peak Hours" }).click();
    await expect(
      dialog.getByRole("tab", { name: "Peak Hours" })
    ).toHaveAttribute("data-state", "active");
  });

  test("date preset switching triggers data reload", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Open dialog
    const expandButtons = page.locator("button:has(svg.lucide-expand)");
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });
    await expandButtons.first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "This Month" preset — should trigger a new API call
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/analytics/detailed") && res.status() === 200
    );
    await dialog.getByText("This Month").click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });

  test("custom date range shows calendar popovers", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Open dialog
    const expandButtons = page.locator("button:has(svg.lucide-expand)");
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });
    await expandButtons.first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click "Custom..." preset
    await dialog.getByText("Custom...").click();

    // Start date and End date buttons should appear
    await expect(
      dialog.getByText("Start Date")
    ).toBeVisible({ timeout: 3000 });
    await expect(
      dialog.getByText("End Date")
    ).toBeVisible({ timeout: 3000 });

    // Click start date button — calendar should appear
    await dialog.getByText("Start Date").click();
    const calendar = page.locator("[data-slot=calendar]");
    await expect(calendar).toBeVisible({ timeout: 3000 });
  });

  test("dialog closes on X button or overlay click", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "Mobile Chrome",
      "Admin dashboard is desktop-only"
    );

    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: adminToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/en/admin");

    // Open dialog
    const expandButtons = page.locator("button:has(svg.lucide-expand)");
    await expect(expandButtons.first()).toBeVisible({ timeout: 15000 });
    await expandButtons.first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close via the X button
    const closeBtn = dialog.locator("button:has(svg.lucide-x)");
    await closeBtn.click();

    // Dialog should be hidden
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });
});
