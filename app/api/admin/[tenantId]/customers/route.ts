import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
  );
  const offset = (page - 1) * limit;

  const sort = url.searchParams.get("sort") || "recent";

  let orderBy: Prisma.CustomerOrderByWithRelationInput;
  if (sort === "name") {
    orderBy = { user: { name: "asc" } };
  } else if (sort === "spent") {
    orderBy = { totalSpent: "desc" };
  } else {
    orderBy = { createdAt: "desc" };
  }

  // Build where clause with search across user fields
  const where: Record<string, unknown> = { tenantId };

  if (search) {
    where.user = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
        orders: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true,
            orderNumber: true,
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy,
      skip: offset,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  const data = customers.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
    phone: c.user.phone,
    image: c.user.image,
    totalSpent: c.totalSpent,
    orderCount: c.orderCount,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastOrderDate: c.orders[0]?.createdAt.toISOString() || null,
    recentOrders: c.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
  }));

  return NextResponse.json({
    customers: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
