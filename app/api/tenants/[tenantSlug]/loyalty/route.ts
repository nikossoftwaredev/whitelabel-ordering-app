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
    return NextResponse.json({ enabled: false });
  }

  const { loyaltyEnabled, loyaltyRequiredOrders, loyaltyRewardAmount } =
    tenant.config;

  if (!loyaltyEnabled) {
    return NextResponse.json({ enabled: false });
  }

  // Get customer record
  const customer = await prisma.customer.findUnique({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: session.user.id },
    },
  });

  if (!customer) {
    return NextResponse.json({
      enabled: true,
      requiredOrders: loyaltyRequiredOrders,
      rewardAmount: loyaltyRewardAmount,
      currentProgress: 0,
      isEligible: false,
    });
  }

  // Count past redemptions
  const redemptionCount = await prisma.loyaltyRedemption.count({
    where: { customerId: customer.id, tenantId: tenant.id },
  });

  const effectiveOrders =
    customer.orderCount - redemptionCount * loyaltyRequiredOrders;
  const currentProgress = Math.max(0, effectiveOrders);
  const isEligible = currentProgress >= loyaltyRequiredOrders;

  return NextResponse.json({
    enabled: true,
    requiredOrders: loyaltyRequiredOrders,
    rewardAmount: loyaltyRewardAmount,
    currentProgress,
    isEligible,
  });
}
