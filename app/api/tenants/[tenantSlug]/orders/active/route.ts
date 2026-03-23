import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES } from "@/lib/general/status-config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ order: null });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });

  if (!tenant) {
    return NextResponse.json({ order: null });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: session.user.id,
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ order: null });
  }

  const order = await prisma.order.findFirst({
    where: {
      customerId: customer.id,
      tenantId: tenant.id,
      status: { in: ACTIVE_ORDER_STATUSES as any },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
      estimatedReadyAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ order });
}
