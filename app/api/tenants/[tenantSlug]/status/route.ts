import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isStoreOpen } from "@/lib/orders/store-hours";
import { apiLimiter, getClientIp } from "@/lib/security/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { success } = await apiLimiter.limit(getClientIp(request));
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: {
      operatingHours: true,
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (tenant.isPaused) {
    return NextResponse.json({
      isOpen: false,
      isPaused: true,
      reason: "paused",
    });
  }

  const status = isStoreOpen(tenant.operatingHours, tenant.timezone);

  return NextResponse.json({
    ...status,
    isPaused: false,
  });
}
