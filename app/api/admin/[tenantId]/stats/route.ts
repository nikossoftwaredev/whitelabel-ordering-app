import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
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

  const [
    todayStats,
    todayRefunds,
    activeOrders,
    weekStats,
    popularProducts,
    recentOrders,
  ] = await Promise.all([
    // Today's stats (revenue, tips, order count) — excludes REJECTED
    prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: todayStart },
        status: { not: "REJECTED" },
      },
      _sum: { total: true, tipAmount: true },
      _count: true,
    }),

    // Today's refunds
    prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: todayStart },
        paymentStatus: "REFUNDED",
      },
      _sum: { refundAmount: true },
      _count: true,
    }),

    // Active orders count
    prisma.order.count({
      where: {
        tenantId,
        status: { in: ACTIVE_ORDER_STATUSES as any },
      },
    }),

    // Week revenue — excludes REJECTED
    prisma.order.aggregate({
      where: {
        tenantId,
        createdAt: { gte: weekStart },
        status: { not: "REJECTED" },
      },
      _sum: { total: true },
    }),

    // Popular products (last 7 days)
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { tenantId, createdAt: { gte: weekStart } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // Recent orders
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { select: { productName: true, quantity: true } } },
    }),
  ]);

  return NextResponse.json({
    today: {
      revenue: todayStats._sum.total || 0,
      orders: todayStats._count,
      tips: todayStats._sum.tipAmount || 0,
      refunds: todayRefunds._count,
      refundAmount: todayRefunds._sum.refundAmount || 0,
    },
    activeOrders,
    weekRevenue: weekStats._sum.total || 0,
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
