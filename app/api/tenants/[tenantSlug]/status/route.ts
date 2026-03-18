import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isStoreOpen } from "@/lib/orders/store-hours";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
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
