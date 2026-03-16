import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";
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
    select: { total: true, status: true },
  });

  const todayRevenue = todayOrders
    .filter((o) => o.status !== "REJECTED")
    .reduce((sum, o) => sum + o.total, 0);

  const todayCount = todayOrders.filter((o) => o.status !== "REJECTED").length;

  // Active orders (not completed/rejected)
  const activeOrders = await prisma.order.count({
    where: {
      tenantId,
      status: { in: ACTIVE_ORDER_STATUSES },
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
    today: { revenue: todayRevenue, orders: todayCount },
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
