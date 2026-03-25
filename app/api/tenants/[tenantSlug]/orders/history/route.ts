import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
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
    return NextResponse.json({ orders: [], total: 0 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const forReorder = searchParams.get("forReorder") === "true";

  const where: Record<string, unknown> = {
    customerId: customer.id,
    tenantId: tenant.id,
  };

  if (forReorder) {
    where.status = { in: ["COMPLETED", "DELIVERING", "READY"] };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            modifiers: {
              select: {
                modifierOptionId: true,
                name: true,
                priceAdjustment: true,
              },
            },
            product: {
              select: { image: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total });
}
