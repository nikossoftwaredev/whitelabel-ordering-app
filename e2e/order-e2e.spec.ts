import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import {
  clearCart,
  dismissLocationPrompt,
  suppressPwaPromptGlobally,
  TENANT_SLUG,
} from "./helpers";

const BASE = `http://${TENANT_SLUG}.lvh.me:3000`;

/**
 * Create a NextAuth session for a given userId and return the token.
 */
async function createSession(prisma: PrismaClient, userId: string) {
  const token = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.session.create({
    data: {
      userId,
      sessionToken: token,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

test.describe.configure({ mode: "serial" });

test.describe("Order E2E: place and accept", () => {
  let prisma: PrismaClient;
  let tenant: { id: string; slug: string };
  let product: { id: string; name: string; price: number };
  let customerUser: { id: string };
  let adminUser: { id: string };
  let customerToken: string;
  let adminToken: string;

  test.beforeAll(async () => {
    prisma = new PrismaClient();

    // Resolve tenant
    const t = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
    });
    if (!t) throw new Error(`Tenant "${TENANT_SLUG}" not found`);
    tenant = t;

    // Ensure store is not paused
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { isPaused: false },
    });

    // Ensure store is open for today by setting 24-hour operating hours
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: t.timezone || "Europe/Athens",
      weekday: "short",
    }).formatToParts(now);
    const weekdayShort = parts.find((p) => p.type === "weekday")?.value || "Sat";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const todayDow = dayMap[weekdayShort] ?? 6;

    await prisma.operatingHour.updateMany({
      where: { tenantId: tenant.id, dayOfWeek: todayDow },
      data: { openTime: "00:00", closeTime: "23:59", isClosed: false },
    });

    // Get a product to order
    const p = await prisma.product.findFirst({
      where: { category: { tenantId: tenant.id }, isActive: true },
      orderBy: { name: "asc" },
    });
    if (!p) throw new Error("No active products found");
    product = p;

    // Find or create customer user
    const cu = await prisma.user.upsert({
      where: { email: "e2e-customer@test.com" },
      update: {},
      create: {
        email: "e2e-customer@test.com",
        name: "E2E Customer",
      },
    });
    customerUser = cu;

    // Ensure customer has a profile name+phone (needed for checkout)
    await prisma.user.update({
      where: { id: customerUser.id },
      data: { name: "E2E Customer", phone: "6990000000" },
    });

    // Find admin user (someone with OWNER/ADMIN role on this tenant)
    const adminRole = await prisma.tenantRole.findFirst({
      where: {
        tenantId: tenant.id,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });
    if (!adminRole) throw new Error("No admin user for this tenant");
    const au = await prisma.user.findUnique({
      where: { id: adminRole.userId },
    });
    if (!au) throw new Error("Admin user record missing");
    adminUser = au;

    // Clean up any leftover E2E orders from previous runs
    const staleOrders = await prisma.order.findMany({
      where: { customerName: "E2E Customer" },
      select: { id: true },
    });
    for (const o of staleOrders) {
      await prisma.promoCodeUsage.deleteMany({ where: { orderId: o.id } }).catch(() => {});
      await prisma.orderItemModifier.deleteMany({ where: { orderItem: { orderId: o.id } } });
      await prisma.orderItem.deleteMany({ where: { orderId: o.id } });
      await prisma.order.delete({ where: { id: o.id } });
    }

    // Create sessions
    customerToken = await createSession(prisma, customerUser.id);
    adminToken = await createSession(prisma, adminUser.id);
  });

  test.afterAll(async () => {
    const tokens = [customerToken, adminToken].filter(Boolean);
    if (tokens.length > 0) {
      await prisma.session.deleteMany({
        where: { sessionToken: { in: tokens } },
      });
    }
    await prisma.$disconnect();
  });

  test("customer places order via API, admin accepts and completes it", async ({
    page,
  }) => {
    // ── 1. Set customer auth cookie ──
    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: customerToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    // Navigate first so page.request uses the right origin + cookies
    await suppressPwaPromptGlobally(page);
    await page.goto("/en/order");
    await dismissLocationPrompt(page);

    // ── 2. Place order via API (using page.request which shares cookies) ──
    const orderRes = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [
            {
              productId: product.id,
              quantity: 1,
              modifiers: [],
              notes: "",
            },
          ],
          orderType: "PICKUP",
          customerName: "E2E Customer",
          customerPhone: "6990000000",
          paymentMethod: "CASH",
          tipAmount: 0,
        },
      }
    );

    // Handle store-closed gracefully
    if ([400, 403, 503].includes(orderRes.status())) {
      const body = await orderRes.json();
      if (
        body.error?.includes("closed") ||
        body.error?.includes("open") ||
        body.error?.includes("paused")
      ) {
        test.skip(true, `Store unavailable: ${body.error}`);
        return;
      }
    }

    expect(orderRes.status()).toBe(201);

    const orderData = await orderRes.json();
    expect(orderData.orderId).toBeTruthy();
    expect(orderData.orderNumber).toBeTruthy();
    expect(orderData.status).toBe("NEW");
    expect(orderData.paymentMethod).toBe("CASH");

    const { orderId, orderNumber } = orderData;

    // ── 3. Customer: Verify confirmation page ──
    await page.goto(
      `/en/order/confirmation?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}`
    );
    await expect(
      page.getByText(new RegExp(`Order.*${orderNumber.replace("#", "")}`)).first()
    ).toBeVisible({ timeout: 10000 });

    // Should show waiting/received status
    await expect(
      page.getByText(/Waiting|Received/i).first()
    ).toBeVisible({ timeout: 5000 });

    // ── 4. Admin: Accept the order (use admin cookie via extra headers) ──
    const adminHeaders = {
      Cookie: `next-auth.session-token=${adminToken}`,
    };

    const acceptRes = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: adminHeaders,
        data: { status: "ACCEPTED" },
      }
    );
    expect(acceptRes.status()).toBe(200);
    const acceptedOrder = await acceptRes.json();
    expect(acceptedOrder.status).toBe("ACCEPTED");
    expect(acceptedOrder.acceptedAt).toBeTruthy();

    // ── 5. Customer: SSE updates the page ──
    await expect(
      page.getByText(/accepted|confirmed/i).first()
    ).toBeVisible({ timeout: 15000 });

    // ── 6. Admin: Advance PREPARING → READY → COMPLETED ──
    const prepRes = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: adminHeaders,
        data: { status: "PREPARING" },
      }
    );
    expect(prepRes.status()).toBe(200);

    const readyRes = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: adminHeaders,
        data: { status: "READY" },
      }
    );
    expect(readyRes.status()).toBe(200);

    const completeRes = await page.request.fetch(
      `${BASE}/api/admin/${tenant.id}/orders/${orderId}`,
      {
        method: "PATCH",
        headers: adminHeaders,
        data: { status: "COMPLETED" },
      }
    );
    expect(completeRes.status()).toBe(200);
    const completedOrder = await completeRes.json();
    expect(completedOrder.status).toBe("COMPLETED");
    expect(completedOrder.completedAt).toBeTruthy();

    // ── 7. Customer: Confirmation page shows completion state ──
    await expect(
      page.getByText(/complete|Enjoy your meal/i).first()
    ).toBeVisible({ timeout: 15000 });

    // ── 8. Verify in database ──
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    expect(dbOrder).toBeTruthy();
    expect(dbOrder!.status).toBe("COMPLETED");
    expect(dbOrder!.items.length).toBe(1);
    expect(dbOrder!.items[0].productName).toBe(product.name);

    // Clean up test order
    await prisma.orderItemModifier.deleteMany({
      where: { orderItem: { orderId } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId } });
    await prisma.order.delete({ where: { id: orderId } });
  });

  // UI test is desktop-only — mobile PWA overlay and viewport constraints make it flaky
  test("customer adds item via UI and reaches checkout", async ({ page, browserName }, testInfo) => {
    test.skip(testInfo.project.name === "Mobile Chrome", "UI flow is desktop-only");

    // Set customer auth cookie
    await page.context().addCookies([
      {
        name: "next-auth.session-token",
        value: customerToken,
        domain: `${TENANT_SLUG}.lvh.me`,
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);

    await suppressPwaPromptGlobally(page);

    // Navigate to order page (via about:blank first to reset any stale state)
    await page.goto("about:blank");
    await clearCart(page).catch(() => {});
    await page.goto("/en/order");
    await dismissLocationPrompt(page);

    // Wait for products to load (retry with reload if needed)
    let productsVisible = await page
      .locator("text=/€/")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (!productsVisible) {
      await page.reload();
      await dismissLocationPrompt(page);
      await page
        .locator("text=/€/")
        .first()
        .waitFor({ state: "visible", timeout: 15000 });
    }

    // Click a product
    await page.getByText(product.name, { exact: false }).first().click();

    // Product detail sheet should open
    const addBtn = page.getByText(/Add to (order|cart)/i).first();
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Wait for product sheet to close
    await page.waitForTimeout(500);

    // Cart bar should appear
    await expect(
      page.getByText(/View Cart/i).first()
    ).toBeVisible({ timeout: 5000 });

    // Open cart — use force click to bypass any overlapping banners
    await page.getByText(/View Cart/i).first().click({ force: true });

    // Wait for cart sheet animation
    await page.waitForTimeout(500);

    // Cart sheet should show the item
    await expect(
      page.getByText(product.name).first()
    ).toBeVisible({ timeout: 5000 });

    // Click checkout
    const checkoutBtn = page.getByText(/Proceed to checkout/i).first();
    await expect(checkoutBtn).toBeVisible({ timeout: 5000 });
    await checkoutBtn.click();

    // Should navigate to checkout page
    await expect(page).toHaveURL(/checkout/, { timeout: 10000 });

    // Verify checkout shows the item
    await expect(
      page.getByText(product.name).first()
    ).toBeVisible({ timeout: 5000 });

    // Verify checkout has Pickup and Cash options
    await expect(
      page.getByText(/Pickup/i).first()
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.getByText(/Cash/i).first()
    ).toBeVisible({ timeout: 3000 });

    // Verify Place order button exists
    await expect(
      page.getByText(/Place order/i).first()
    ).toBeVisible({ timeout: 3000 });
  });
});
