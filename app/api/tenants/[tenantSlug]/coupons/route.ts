import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: { config: true },
  });

  if (!tenant || !tenant.config) {
    return NextResponse.json({ enabled: false, coupons: [], milestoneProgress: null });
  }

  const {
    couponEnabled,
    couponMilestoneType,
    couponMilestoneOrders,
    couponMilestoneSpent,
    couponValue,
    couponType,
  } = tenant.config;

  const milestoneType = couponMilestoneType || "ORDERS";

  if (!couponEnabled) {
    return NextResponse.json({ enabled: false, coupons: [], milestoneProgress: null });
  }

  // Get customer record
  const customer = await prisma.customer.findUnique({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: session.user.id },
    },
  });

  if (!customer) {
    const required =
      milestoneType === "ORDERS" ? couponMilestoneOrders : couponMilestoneSpent;
    return NextResponse.json({
      enabled: true,
      coupons: [],
      milestoneProgress: {
        type: milestoneType,
        current: 0,
        required,
        nextReward: { type: couponType, value: couponValue },
      },
    });
  }

  // Fetch available coupons (unused, active, not expired)
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      customerId: customer.id,
      tenantId: tenant.id,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Split into available and expired for the UI
  const available = coupons.filter((c) => !c.isUsed && c.expiresAt > now);
  const expired = coupons.filter((c) => c.isUsed || c.expiresAt <= now);

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
    milestoneProgress: {
      type: milestoneType,
      current,
      required,
      hasAvailableCoupon,
      nextReward: { type: couponType, value: couponValue },
    },
  });
}
