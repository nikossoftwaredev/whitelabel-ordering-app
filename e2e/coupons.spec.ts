import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

import { TENANT_SLUG } from "./helpers";

const BASE = `http://${TENANT_SLUG}.lvh.me:3000`;

async function createSession(prisma: PrismaClient, userId: string) {
  const token = `e2e-coupon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

test.describe("Coupon System E2E", () => {
  let prisma: PrismaClient;
  let tenant: { id: string; slug: string };
  let adminUser: { id: string };
  let customerUser: { id: string };
  let customerToken: string;
  let adminToken: string;
  let customer: { id: string };
  let product: { id: string; name: string; price: number };

  // Track all created resources for cleanup
  const createdCouponIds: string[] = [];
  const createdGroupIds: string[] = [];
  const createdOrderIds: string[] = [];

  test.beforeAll(async () => {
    prisma = new PrismaClient();

    const t = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
    if (!t) throw new Error(`Tenant "${TENANT_SLUG}" not found`);
    tenant = t;

    // Ensure store is not paused
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { isPaused: false },
    });

    // Open store for today
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

    // Ensure coupon system is enabled
    await prisma.tenantConfig.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        couponEnabled: true,
        couponMilestoneType: "ORDERS",
        couponMilestoneOrders: 5,
        couponType: "FIXED",
        couponValue: 200,
        couponValidDays: 30,
        couponMaxPerOrder: 2,
      },
      update: {
        couponEnabled: true,
        couponMilestoneType: "ORDERS",
        couponMilestoneOrders: 5,
        couponType: "FIXED",
        couponValue: 200,
        couponValidDays: 30,
        couponMaxPerOrder: 2,
      },
    });

    // Get a product
    const p = await prisma.product.findFirst({
      where: { category: { tenantId: tenant.id }, isActive: true },
      orderBy: { name: "asc" },
    });
    if (!p) throw new Error("No active products found");
    product = p;

    // Customer user
    const cu = await prisma.user.upsert({
      where: { email: "e2e-coupon-customer@test.com" },
      update: {},
      create: { email: "e2e-coupon-customer@test.com", name: "E2E Coupon Customer" },
    });
    customerUser = cu;
    await prisma.user.update({
      where: { id: customerUser.id },
      data: { name: "E2E Coupon Customer", phone: "6990000001" },
    });

    // Ensure customer record
    const cust = await prisma.customer.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: customerUser.id } },
      update: {},
      create: { tenantId: tenant.id, userId: customerUser.id },
    });
    customer = cust;

    // Admin user
    const adminRole = await prisma.tenantRole.findFirst({
      where: { tenantId: tenant.id, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (!adminRole) throw new Error("No admin user for this tenant");
    const au = await prisma.user.findUnique({ where: { id: adminRole.userId } });
    if (!au) throw new Error("Admin user record missing");
    adminUser = au;

    // Create sessions
    customerToken = await createSession(prisma, customerUser.id);
    adminToken = await createSession(prisma, adminUser.id);
  });

  test.afterAll(async () => {
    // Clean up orders (with related records)
    for (const orderId of createdOrderIds) {
      await prisma.promoCodeUsage.deleteMany({ where: { orderId } }).catch(() => {});
      await prisma.orderItemModifier.deleteMany({ where: { orderItem: { orderId } } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    // Clean up coupons
    for (const id of createdCouponIds) {
      await prisma.coupon.delete({ where: { id } }).catch(() => {});
    }
    // Clean up groups (cascades to members)
    for (const id of createdGroupIds) {
      await prisma.customerGroupMember.deleteMany({ where: { customerGroupId: id } }).catch(() => {});
      await prisma.customerGroup.delete({ where: { id } }).catch(() => {});
    }
    // Clean up sessions
    const tokens = [customerToken, adminToken].filter(Boolean);
    if (tokens.length > 0) {
      await prisma.session.deleteMany({ where: { sessionToken: { in: tokens } } });
    }
    await prisma.$disconnect();
  });

  function adminHeaders() {
    return { Cookie: `next-auth.session-token=${adminToken}` };
  }

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN: MANUAL COUPON CRUD
  // ═══════════════════════════════════════════════════════════════════

  test("admin can create a manual single-use coupon (FIXED)", async ({ page }) => {
    const res = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/coupons`,
      {
        headers: adminHeaders(),
        data: {
          customerId: customer.id,
          type: "FIXED",
          value: 300, // 3.00 EUR
          description: "E2E test coupon",
          validDays: 7,
        },
      }
    );
    expect(res.status()).toBe(201);
    const coupon = await res.json();
    createdCouponIds.push(coupon.id);

    expect(coupon.code).toMatch(/^GIFT-/);
    expect(coupon.type).toBe("FIXED");
    expect(coupon.value).toBe(300);
    expect(coupon.source).toBe("MANUAL");
    expect(coupon.customerId).toBe(customer.id);
    expect(coupon.expiresAt).toBeTruthy();
  });

  test("admin can create a manual coupon with no expiry", async ({ page }) => {
    const res = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/coupons`,
      {
        headers: adminHeaders(),
        data: {
          customerId: customer.id,
          type: "PERCENTAGE",
          value: 15,
          description: "E2E no-expiry coupon",
          noExpiry: true,
        },
      }
    );
    expect(res.status()).toBe(201);
    const coupon = await res.json();
    createdCouponIds.push(coupon.id);

    expect(coupon.type).toBe("PERCENTAGE");
    expect(coupon.value).toBe(15);
    expect(coupon.expiresAt).toBeNull();
    expect(coupon.source).toBe("MANUAL");
  });

  test("admin can list available coupons", async ({ page }) => {
    const res = await page.request.get(
      `${BASE}/api/admin/${tenant.id}/coupons?status=available`,
      { headers: adminHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const coupons = await res.json();
    expect(Array.isArray(coupons)).toBeTruthy();

    // Should include the coupons we just created
    const ourCoupons = coupons.filter((c: { id: string }) =>
      createdCouponIds.includes(c.id)
    );
    expect(ourCoupons.length).toBeGreaterThanOrEqual(2);
  });

  test("admin can revoke a coupon", async ({ page }) => {
    // Create a coupon to revoke
    const createRes = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/coupons`,
      {
        headers: adminHeaders(),
        data: {
          customerId: customer.id,
          type: "FIXED",
          value: 100,
          validDays: 1,
        },
      }
    );
    const coupon = await createRes.json();
    createdCouponIds.push(coupon.id);

    const revokeRes = await page.request.delete(
      `${BASE}/api/admin/${tenant.id}/coupons/${coupon.id}`,
      { headers: adminHeaders() }
    );
    expect(revokeRes.status()).toBe(200);

    // Verify in DB
    const revoked = await prisma.coupon.findUnique({ where: { id: coupon.id } });
    expect(revoked!.isActive).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════
  // CUSTOMER: COUPON FETCH & CHECKOUT
  // ═══════════════════════════════════════════════════════════════════

  test("customer can fetch their available coupons", async ({ page }) => {
    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    const res = await page.request.get(
      `${BASE}/api/tenants/${TENANT_SLUG}/coupons`
    );
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.enabled).toBe(true);
    expect(Array.isArray(data.coupons)).toBeTruthy();

    // Should see at least the FIXED coupon (no-expiry PERCENTAGE should also be there)
    const fixedCoupon = data.coupons.find(
      (c: { type: string; value: number; source: string }) =>
        c.type === "FIXED" && c.value === 300 && c.source === "MANUAL"
    );
    expect(fixedCoupon).toBeTruthy();

    const noExpiryCoupon = data.coupons.find(
      (c: { expiresAt: string | null }) => c.expiresAt === null
    );
    expect(noExpiryCoupon).toBeTruthy();
  });

  test("customer can place order with a single-use coupon applied", async ({ page }) => {
    // Find the 3.00 EUR coupon we created
    const coupon = await prisma.coupon.findFirst({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        type: "FIXED",
        value: 300,
        isUsed: false,
        isActive: true,
        source: "MANUAL",
      },
    });
    expect(coupon).toBeTruthy();

    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    const orderRes = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [{ productId: product.id, quantity: 1, modifiers: [], notes: "" }],
          orderType: "PICKUP",
          customerName: "E2E Coupon Customer",
          customerPhone: "6990000001",
          paymentMethod: "CASH",
          tipAmount: 0,
          couponIds: [coupon!.id],
        },
      }
    );

    if ([400, 403, 503].includes(orderRes.status())) {
      const body = await orderRes.json();
      if (body.error?.includes("closed") || body.error?.includes("paused")) {
        test.skip(true, `Store unavailable: ${body.error}`);
        return;
      }
    }

    expect(orderRes.status()).toBe(201);
    const orderData = await orderRes.json();
    createdOrderIds.push(orderData.orderId);

    // Verify coupon discount was applied
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderData.orderId },
    });
    expect(dbOrder).toBeTruthy();
    expect(dbOrder!.couponDiscount).toBeGreaterThan(0);

    // Verify coupon is now marked as used
    const usedCoupon = await prisma.coupon.findUnique({ where: { id: coupon!.id } });
    expect(usedCoupon!.isUsed).toBe(true);
    expect(usedCoupon!.orderId).toBe(orderData.orderId);
  });

  test("used coupon cannot be applied again", async ({ page }) => {
    const usedCoupon = await prisma.coupon.findFirst({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        isUsed: true,
        id: { in: createdCouponIds },
      },
    });
    if (!usedCoupon) {
      test.skip(true, "No used coupon from previous test");
      return;
    }

    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    const res = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [{ productId: product.id, quantity: 1, modifiers: [], notes: "" }],
          orderType: "PICKUP",
          customerName: "E2E Coupon Customer",
          customerPhone: "6990000001",
          paymentMethod: "CASH",
          tipAmount: 0,
          couponIds: [usedCoupon.id],
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("already been used");
  });

  // ═══════════════════════════════════════════════════════════════════
  // CUSTOMER GROUPS
  // ═══════════════════════════════════════════════════════════════════

  test("admin can create a customer group", async ({ page }) => {
    const res = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/customer-groups`,
      {
        headers: adminHeaders(),
        data: {
          name: "E2E Test Family",
          customerIds: [customer.id],
        },
      }
    );
    expect(res.status()).toBe(201);
    const group = await res.json();
    createdGroupIds.push(group.id);

    expect(group.name).toBe("E2E Test Family");
    expect(group._count.members).toBe(1);
  });

  test("admin can list customer groups", async ({ page }) => {
    const res = await page.request.get(
      `${BASE}/api/admin/${tenant.id}/customer-groups`,
      { headers: adminHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const groups = await res.json();
    expect(Array.isArray(groups)).toBeTruthy();

    const ourGroup = groups.find((g: { id: string }) => createdGroupIds.includes(g.id));
    expect(ourGroup).toBeTruthy();
    expect(ourGroup.name).toBe("E2E Test Family");
  });

  test("admin can get group detail with members", async ({ page }) => {
    const groupId = createdGroupIds[0];
    const res = await page.request.get(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}`,
      { headers: adminHeaders() }
    );
    expect(res.ok()).toBeTruthy();
    const group = await res.json();
    expect(group.members.length).toBe(1);
    expect(group.members[0].customer.user.email).toBe("e2e-coupon-customer@test.com");
  });

  test("admin can rename a group", async ({ page }) => {
    const groupId = createdGroupIds[0];
    const res = await page.request.patch(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}`,
      {
        headers: adminHeaders(),
        data: { name: "E2E Family Renamed" },
      }
    );
    expect(res.ok()).toBeTruthy();
    const group = await res.json();
    expect(group.name).toBe("E2E Family Renamed");

    // Rename back for subsequent tests
    await page.request.patch(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}`,
      {
        headers: adminHeaders(),
        data: { name: "E2E Test Family" },
      }
    );
  });

  test("duplicate group name returns 409", async ({ page }) => {
    const res = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/customer-groups`,
      {
        headers: adminHeaders(),
        data: { name: "E2E Test Family" },
      }
    );
    expect(res.status()).toBe(409);
  });

  // ═══════════════════════════════════════════════════════════════════
  // MILESTONE COUPON GENERATION WITH NO-EXPIRY
  // ═══════════════════════════════════════════════════════════════════

  test("milestone coupon generated with no-expiry when config is set", async ({ page }) => {
    // Set milestone no-expiry and low threshold
    await prisma.tenantConfig.update({
      where: { tenantId: tenant.id },
      data: {
        couponMilestoneNoExpiry: true,
        couponMilestoneOrders: 1, // Trigger after every 1 order
        couponValue: 150,
      },
    });

    // Reset customer completedOrderCount to 0 so next completion triggers milestone
    await prisma.customer.update({
      where: { id: customer.id },
      data: { completedOrderCount: 0, completedSpent: 0 },
    });

    // Clear any existing milestone coupons for this customer
    await prisma.coupon.deleteMany({
      where: { customerId: customer.id, tenantId: tenant.id, source: "MILESTONE" },
    });

    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    // Place an order (no coupon)
    const orderRes = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [{ productId: product.id, quantity: 1, modifiers: [], notes: "" }],
          orderType: "PICKUP",
          customerName: "E2E Coupon Customer",
          customerPhone: "6990000001",
          paymentMethod: "CASH",
          tipAmount: 0,
        },
      }
    );

    if ([400, 403, 503].includes(orderRes.status())) {
      const body = await orderRes.json();
      if (body.error?.includes("closed") || body.error?.includes("paused")) {
        test.skip(true, `Store unavailable: ${body.error}`);
        return;
      }
    }

    expect(orderRes.status()).toBe(201);
    const orderData = await orderRes.json();
    createdOrderIds.push(orderData.orderId);

    // Admin: complete the order to trigger milestone
    for (const status of ["ACCEPTED", "PREPARING", "READY", "COMPLETED"] as const) {
      const statusRes = await page.request.fetch(
        `${BASE}/api/admin/${tenant.id}/orders/${orderData.orderId}`,
        {
          method: "PATCH",
          headers: adminHeaders(),
          data: { status },
        }
      );
      expect(statusRes.status()).toBe(200);
    }

    // Check that a milestone coupon was generated with no expiry
    const milestoneCoupon = await prisma.coupon.findFirst({
      where: {
        customerId: customer.id,
        tenantId: tenant.id,
        source: "MILESTONE",
        sourceOrderId: orderData.orderId,
      },
    });
    expect(milestoneCoupon).toBeTruthy();
    createdCouponIds.push(milestoneCoupon!.id);

    expect(milestoneCoupon!.expiresAt).toBeNull(); // No expiry!
    expect(milestoneCoupon!.value).toBe(150);
    expect(milestoneCoupon!.code).toMatch(/^LOYAL-/);

    // Reset config
    await prisma.tenantConfig.update({
      where: { tenantId: tenant.id },
      data: {
        couponMilestoneNoExpiry: false,
        couponMilestoneOrders: 5,
        couponValue: 200,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATION EDGE CASES
  // ═══════════════════════════════════════════════════════════════════

  test("expired coupon cannot be used", async ({ page }) => {
    // Create a coupon that's already expired (via Prisma directly)
    const expiredCoupon = await prisma.coupon.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        code: `TEST-EXP${Date.now().toString(36).slice(-4).toUpperCase()}`,
        type: "FIXED",
        value: 100,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        source: "MANUAL",
      },
    });
    createdCouponIds.push(expiredCoupon.id);

    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    const res = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [{ productId: product.id, quantity: 1, modifiers: [], notes: "" }],
          orderType: "PICKUP",
          customerName: "E2E Coupon Customer",
          customerPhone: "6990000001",
          paymentMethod: "CASH",
          tipAmount: 0,
          couponIds: [expiredCoupon.id],
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("expired");
  });

  test("revoked coupon cannot be used", async ({ page }) => {
    const revokedCoupon = await prisma.coupon.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        code: `TEST-REV${Date.now().toString(36).slice(-4).toUpperCase()}`,
        type: "FIXED",
        value: 100,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        isActive: false,
        source: "MANUAL",
      },
    });
    createdCouponIds.push(revokedCoupon.id);

    await page.context().addCookies([{
      name: "next-auth.session-token",
      value: customerToken,
      domain: `${TENANT_SLUG}.lvh.me`,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    }]);

    const res = await page.request.post(
      `${BASE}/api/tenants/${TENANT_SLUG}/orders`,
      {
        data: {
          items: [{ productId: product.id, quantity: 1, modifiers: [], notes: "" }],
          orderType: "PICKUP",
          customerName: "E2E Coupon Customer",
          customerPhone: "6990000001",
          paymentMethod: "CASH",
          tipAmount: 0,
          couponIds: [revokedCoupon.id],
        },
      }
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("revoked");
  });

  // ═══════════════════════════════════════════════════════════════════
  // AUTH GUARDS
  // ═══════════════════════════════════════════════════════════════════

  test("coupon admin routes require authentication", async ({ request }) => {
    const res = await request.get(
      `/api/admin/fake-tenant-id/coupons?status=available`
    );
    expect([401, 403]).toContain(res.status());
  });

  test("customer group admin routes require authentication", async ({ request }) => {
    const res = await request.get(
      `/api/admin/fake-tenant-id/customer-groups`
    );
    expect([401, 403]).toContain(res.status());
  });

  // ═══════════════════════════════════════════════════════════════════
  // GROUP MEMBER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════

  test("admin can add members to a group", async ({ page }) => {
    // Create a second customer to add
    const newUser = await prisma.user.upsert({
      where: { email: "e2e-coupon-member2@test.com" },
      update: {},
      create: { email: "e2e-coupon-member2@test.com", name: "E2E Member 2" },
    });
    const newCustomer = await prisma.customer.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: newUser.id } },
      update: {},
      create: { tenantId: tenant.id, userId: newUser.id },
    });

    const groupId = createdGroupIds[0];
    const res = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}/members`,
      {
        headers: adminHeaders(),
        data: { customerIds: [newCustomer.id] },
      }
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.memberCount).toBe(2);
  });

  test("admin can remove a member from a group", async ({ page }) => {
    const newUser = await prisma.user.findUnique({
      where: { email: "e2e-coupon-member2@test.com" },
    });
    const newCustomer = await prisma.customer.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: newUser!.id } },
    });

    const groupId = createdGroupIds[0];
    const res = await page.request.delete(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}/members`,
      {
        headers: adminHeaders(),
        data: { customerId: newCustomer!.id },
      }
    );
    expect(res.ok()).toBeTruthy();

    // Verify member was removed
    const detail = await page.request.get(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${groupId}`,
      { headers: adminHeaders() }
    );
    const group = await detail.json();
    expect(group.members.length).toBe(1);
  });

  // ═══════════════════════════════════════════════════════════════════
  // GROUP DELETION CASCADE
  // ═══════════════════════════════════════════════════════════════════

  test("deleting a group cascades to members", async ({ page }) => {
    // Create a fresh group
    const groupRes = await page.request.post(
      `${BASE}/api/admin/${tenant.id}/customer-groups`,
      {
        headers: adminHeaders(),
        data: { name: "E2E Temp Group", customerIds: [customer.id] },
      }
    );
    const tempGroup = await groupRes.json();
    const tempGroupId = tempGroup.id;

    // Delete the group
    const deleteRes = await page.request.delete(
      `${BASE}/api/admin/${tenant.id}/customer-groups/${tempGroupId}`,
      { headers: adminHeaders() }
    );
    expect(deleteRes.ok()).toBeTruthy();

    // Verify group is gone
    const groupCheck = await prisma.customerGroup.findUnique({
      where: { id: tempGroupId },
    });
    expect(groupCheck).toBeNull();

    // Verify members are gone
    const memberCheck = await prisma.customerGroupMember.findMany({
      where: { customerGroupId: tempGroupId },
    });
    expect(memberCheck.length).toBe(0);
  });
});
