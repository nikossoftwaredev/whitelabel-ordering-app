import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

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
  weekStart.setDate(weekStart.getDate() - 6); // Last 7 days including today

  // Fetch all non-rejected orders for the last 7 days
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: weekStart },
      status: { notIn: ["REJECTED", "CANCELLED"] },
    },
    select: {
      total: true,
      orderType: true,
      createdAt: true,
    },
  });

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  const ordersByDay: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    revenueByDay[key] = 0;
    ordersByDay[key] = 0;
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().split("T")[0];
    if (revenueByDay[key] !== undefined) {
      revenueByDay[key] += order.total;
      ordersByDay[key] += 1;
    }
  }

  // Order type breakdown
  const orderTypeBreakdown: Record<string, number> = {};
  for (const order of orders) {
    orderTypeBreakdown[order.orderType] =
      (orderTypeBreakdown[order.orderType] || 0) + 1;
  }

  // Peak hours (today only)
  const todayOrders = orders.filter(
    (o) => o.createdAt >= todayStart
  );
  const peakHours: Record<number, number> = {};
  for (let h = 0; h < 24; h++) peakHours[h] = 0;
  for (const order of todayOrders) {
    const hour = order.createdAt.getHours();
    peakHours[hour] += 1;
  }

  // Popular products (last 7 days)
  const popularProducts = await prisma.orderItem.groupBy({
    by: ["productName"],
    where: {
      order: {
        tenantId,
        createdAt: { gte: weekStart },
        status: { notIn: ["REJECTED", "CANCELLED"] },
      },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return NextResponse.json({
    revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue,
    })),
    ordersByDay: Object.entries(ordersByDay).map(([date, count]) => ({
      date,
      count,
    })),
    orderTypeBreakdown: Object.entries(orderTypeBreakdown).map(
      ([type, count]) => ({ type, count })
    ),
    peakHours: Object.entries(peakHours)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .filter((h) => h.count > 0 || (h.hour >= 8 && h.hour <= 23)),
    popularProducts: popularProducts.map((p) => ({
      name: p.productName,
      quantity: p._sum.quantity || 0,
    })),
  });
}
