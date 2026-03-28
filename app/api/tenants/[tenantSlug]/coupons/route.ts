import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { resolveTenantRoute, findCustomer } from "@/lib/api/tenant-route";
import { findEligibleGroupDiscounts } from "@/lib/groups/query";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const ctx = await resolveTenantRoute(tenantSlug);
  if ("error" in ctx) return ctx.error;
  const { session, tenant } = ctx;

  const tenantWithConfig = await prisma.tenant.findUnique({
    where: { id: tenant.id },
    include: { config: true },
  });

  if (!tenantWithConfig?.config) {
    return NextResponse.json({ enabled: false, coupons: [], milestoneProgress: null });
  }

  const {
    couponEnabled,
    couponMilestoneType,
    couponMilestoneOrders,
    couponMilestoneSpent,
    couponValue,
    couponType,
    couponMaxPerOrder,
    couponRedeemMinOrder,
  } = tenantWithConfig.config;

  const milestoneType = couponMilestoneType || "ORDERS";

  if (!couponEnabled) {
    return NextResponse.json({ enabled: false, coupons: [], milestoneProgress: null });
  }

  // Get customer record
  const customer = await findCustomer(tenant.id, session.user.id);

  if (!customer) {
    const required =
      milestoneType === "ORDERS" ? couponMilestoneOrders : couponMilestoneSpent;
    return NextResponse.json({
      enabled: true,
      coupons: [],
      groupDiscounts: [],
      milestoneProgress: {
        type: milestoneType,
        current: 0,
        required,
        nextReward: { type: couponType, value: couponValue },
      },
    });
  }

  // Fetch available personal coupons (unused, active, not expired)
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
      customerId: customer.id,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch group discounts for this customer
  const groupDiscountsRaw = await findEligibleGroupDiscounts(tenant.id, customer.id);
  const groupDiscounts = groupDiscountsRaw.map((g) => ({
    id: g.id,
    name: g.name,
    discountType: g.discountType,
    discountValue: g.discountValue,
    minOrder: g.minOrder,
    maxDiscount: g.maxDiscount,
    description: g.description,
  }));

  // Split into available and expired for the UI
  const available = coupons.filter(
    (c) => !c.isUsed && (c.expiresAt === null || c.expiresAt > now)
  );
  const expired = coupons.filter(
    (c) => c.isUsed || (c.expiresAt !== null && c.expiresAt <= now)
  );

  // Calculate milestone progress based on type
  let current: number;
  let required: number;

  if (milestoneType === "SPENDING") {
    current = customer.completedSpent % couponMilestoneSpent;
    required = couponMilestoneSpent;
  } else {
    current = customer.completedOrderCount % couponMilestoneOrders;
    required = couponMilestoneOrders;
  }

  // If progress is 0 but there are unused milestone coupons, show as earned
  const hasAvailableCoupon = available.some((c) => c.source === "MILESTONE");

  return NextResponse.json({
    enabled: true,
    coupons: available,
    expiredCoupons: expired.slice(0, 5),
    groupDiscounts,
    maxPerOrder: couponMaxPerOrder ?? 1,
    redeemMinOrder: couponRedeemMinOrder ?? null,
    milestoneProgress: {
      type: milestoneType,
      current,
      required,
      hasAvailableCoupon,
      progressFrozen: hasAvailableCoupon,
      nextReward: { type: couponType, value: couponValue },
    },
  });
}
