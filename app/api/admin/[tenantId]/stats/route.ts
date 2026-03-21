import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES } from "@/lib/general/status-config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Today's stats
  const todayOrders = await prisma.order.findMany({
    where: { tenantId, createdAt: { gte: todayStart } },
    select: { total: true, tipAmount: true, status: true },
  });

  const completedToday = todayOrders.filter((o) => o.status !== "REJECTED");
  const todayRevenue = completedToday.reduce((sum, o) => sum + o.total, 0);
  const todayTips = completedToday.reduce((sum, o) => sum + o.tipAmount, 0);

  const todayCount = completedToday.length;

  // Active orders (not completed/rejected)
  const activeOrders = await prisma.order.count({
    where: {
      tenantId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- app OrderStatus includes DELIVERING, Prisma's doesn't until next `prisma generate`
      status: { in: ACTIVE_ORDER_STATUSES as any },
    },
  });

  // Week revenue
  const weekOrders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: weekStart },
      status: { not: "REJECTED" },
    },
    select: { total: true },
  });
  const weekRevenue = weekOrders.reduce((sum, o) => sum + o.total, 0);

  // Popular products (last 7 days)
  const popularProducts = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: { order: { tenantId, createdAt: { gte: weekStart } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  // Recent orders
  const recentOrders = await prisma.order.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { items: { select: { productName: true, quantity: true } } },
  });

  return NextResponse.json({
    today: { revenue: todayRevenue, orders: todayCount, tips: todayTips },
    activeOrders,
    weekRevenue,
    popularProducts: popularProducts.map((p) => ({
      name: p.productName,
      quantity: p._sum.quantity || 0,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      customerName: o.customerName,
      items: o.items,
    })),
  });
}
