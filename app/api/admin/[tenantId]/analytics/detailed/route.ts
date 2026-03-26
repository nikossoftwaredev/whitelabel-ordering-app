import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import {
  determineGranularity,
  type Granularity,
  toISODateString,
} from "@/lib/general/date-presets";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const searchParams = request.nextUrl.searchParams;
  const startParam = searchParams.get("startDate");
  const endParam = searchParams.get("endDate");

  // Parse dates, default to last 7 days
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  let startDate: Date;
  let endDate: Date;

  if (startParam && endParam) {
    startDate = new Date(startParam + "T00:00:00");
    endDate = new Date(endParam + "T23:59:59.999");

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "startDate must be before endDate." },
        { status: 400 }
      );
    }

    // Clamp endDate to today
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    if (endDate > todayEnd) {
      endDate = todayEnd;
    }

    // Cap at 366 days
    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays > 366) {
      return NextResponse.json(
        { error: "Date range cannot exceed 366 days." },
        { status: 400 }
      );
    }
  } else {
    // Default: last 7 days
    startDate = new Date(todayStart);
    startDate.setDate(startDate.getDate() - 6);
    endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
  }

  const granularity = determineGranularity(startDate, endDate);
  const totalDays = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Fetch all matching orders
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      createdAt: { gte: startDate, lte: endDate },
      status: { notIn: ["REJECTED", "CANCELLED"] },
    },
    select: {
      total: true,
      orderType: true,
      createdAt: true,
    },
  });

  // Build time series
  const timeSeries = buildTimeSeries(orders, startDate, endDate, granularity);

  // Order type breakdown
  const orderTypeCounts: Record<string, number> = {};
  for (const order of orders) {
    orderTypeCounts[order.orderType] =
      (orderTypeCounts[order.orderType] || 0) + 1;
  }
  const totalOrders = orders.length;
  const orderTypeBreakdown = Object.entries(orderTypeCounts).map(
    ([type, count]) => ({
      type,
      count,
      percentage:
        totalOrders > 0
          ? Math.round((count / totalOrders) * 1000) / 10
          : 0,
    })
  );

  // Peak hours (across entire range)
  const peakHoursMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) peakHoursMap[h] = 0;
  for (const order of orders) {
    const hour = order.createdAt.getHours();
    peakHoursMap[hour] += 1;
  }
  const peakHours = Object.entries(peakHoursMap)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .filter((h) => h.count > 0 || (h.hour >= 8 && h.hour <= 23));

  // Summary stats
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgDailyRevenue =
    totalDays > 0 ? Math.round(totalRevenue / totalDays) : 0;
  const avgOrderValue =
    totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const avgDailyOrders =
    totalDays > 0
      ? Math.round((totalOrders / totalDays) * 10) / 10
      : 0;

  // Peak day
  let peakDay: { label: string; revenue: number } | null = null;
  if (timeSeries.length > 0) {
    const peak = timeSeries.reduce((best, cur) =>
      cur.revenue > best.revenue ? cur : best
    );
    if (peak.revenue > 0) {
      peakDay = { label: peak.label, revenue: peak.revenue };
    }
  }

  // Most popular order type
  let mostPopularType: string | null = null;
  let mostPopularTypePercent: string | null = null;
  if (orderTypeBreakdown.length > 0) {
    const top = orderTypeBreakdown.reduce((best, cur) =>
      cur.count > best.count ? cur : best
    );
    mostPopularType = top.type;
    mostPopularTypePercent = `${top.percentage}%`;
  }

  // Busiest and quietest hour
  const nonZeroHours = peakHours.filter((h) => h.count > 0);
  let busiestHour: number | null = null;
  let quietestHour: number | null = null;
  if (nonZeroHours.length > 0) {
    busiestHour = nonZeroHours.reduce((best, cur) =>
      cur.count > best.count ? cur : best
    ).hour;
    quietestHour = nonZeroHours.reduce((best, cur) =>
      cur.count < best.count ? cur : best
    ).hour;
  }

  return NextResponse.json({
    meta: {
      startDate: toISODateString(startDate),
      endDate: toISODateString(endDate),
      granularity,
      totalDays,
    },
    timeSeries,
    orderTypeBreakdown,
    peakHours,
    summary: {
      totalRevenue,
      avgDailyRevenue,
      peakDay,
      totalOrders,
      avgDailyOrders,
      avgOrderValue,
      mostPopularType,
      mostPopularTypePercent,
      busiestHour,
      quietestHour,
    },
  });
}

function buildTimeSeries(
  orders: { total: number; createdAt: Date }[],
  startDate: Date,
  endDate: Date,
  granularity: Granularity
) {
  const buckets = generateBuckets(startDate, endDate, granularity);

  for (const order of orders) {
    const key = getBucketKey(order.createdAt, granularity);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.revenue += order.total;
      bucket.orders += 1;
    }
  }

  return Array.from(buckets.values());
}

function generateBuckets(
  startDate: Date,
  endDate: Date,
  granularity: Granularity
): Map<string, { key: string; label: string; revenue: number; orders: number }> {
  const buckets = new Map<
    string,
    { key: string; label: string; revenue: number; orders: number }
  >();

  if (granularity === "hour") {
    for (let h = 0; h < 24; h++) {
      const key = `${h}`;
      const label = formatHourLabel(h);
      buckets.set(key, { key, label, revenue: 0, orders: 0 });
    }
  } else if (granularity === "day") {
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = toISODateString(current);
      const label = current.toLocaleDateString("en", { weekday: "short" });
      buckets.set(key, { key, label, revenue: 0, orders: 0 });
      current.setDate(current.getDate() + 1);
    }
  } else if (granularity === "week") {
    const current = new Date(startDate);
    // Align to start of week (Monday)
    const dayOfWeek = current.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    current.setDate(current.getDate() + diff);

    while (current <= endDate) {
      const key = toISODateString(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `${current.getDate()}/${current.getMonth() + 1}`;
      buckets.set(key, { key, label, revenue: 0, orders: 0 });
      current.setDate(current.getDate() + 7);
    }
  } else {
    // month
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      const label = current.toLocaleDateString("en", { month: "short" });
      buckets.set(key, { key, label, revenue: 0, orders: 0 });
      current.setMonth(current.getMonth() + 1);
    }
  }

  return buckets;
}

function getBucketKey(date: Date, granularity: Granularity): string {
  if (granularity === "hour") {
    return `${date.getHours()}`;
  } else if (granularity === "day") {
    return toISODateString(date);
  } else if (granularity === "week") {
    // Find Monday of the week
    const d = new Date(date);
    const dayOfWeek = d.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    d.setDate(d.getDate() + diff);
    return toISODateString(d);
  } else {
    // month
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12AM";
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return "12PM";
  return `${hour - 12}PM`;
}
