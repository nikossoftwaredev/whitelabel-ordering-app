"use client";

import { useQuery } from "@tanstack/react-query";
import { Expand } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { centsToEuros } from "@/lib/general/formatters";
import { ORDER_TYPE_LABELS } from "@/lib/general/order-types";
import { queryKeys } from "@/lib/query/keys";

interface AnalyticsData {
  revenueByDay: { date: string; revenue: number }[];
  ordersByDay: { date: string; count: number }[];
  orderTypeBreakdown: { type: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  popularProducts: { name: string; quantity: number }[];
}

export const ORDER_TYPE_COLORS: Record<string, string> = {
  PICKUP: "hsl(var(--chart-1, 220 70% 50%))",
  DELIVERY: "hsl(var(--chart-2, 160 60% 45%))",
  DINE_IN: "hsl(var(--chart-3, 30 80% 55%))",
};


export function formatShortDay(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en", { weekday: "short" });
}

export function formatHour(hour: number) {
  if (hour === 0) return "12AM";
  if (hour < 12) return `${hour}AM`;
  if (hour === 12) return "12PM";
  return `${hour - 12}PM`;
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  );
}

export function ChartTooltipContent({ active, payload, label, valueFormatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">
        {valueFormatter ? valueFormatter(payload[0].value) : payload[0].value}
      </p>
    </div>
  );
}

export type AnalyticsTab = "revenue" | "orders" | "orderTypes" | "peakHours";

export function AnalyticsCharts({
  tenantId,
  onExpandChart,
}: {
  tenantId: string;
  onExpandChart?: (tab: AnalyticsTab) => void;
}) {
  const t = useTranslations("Analytics");

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: queryKeys.analytics.dashboard(tenantId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const brandColor = "var(--brand-primary, hsl(var(--primary)))";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by Day */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("revenue7Days")}
            </CardTitle>
            {onExpandChart && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onExpandChart("revenue")}
                title={t("expand")}
              >
                <Expand className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.revenueByDay.every((d) => d.revenue === 0) ? (
              <p className="text-sm text-muted-foreground h-48 flex items-center justify-center">
                {t("noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.revenueByDay}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDay}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `€${centsToEuros(v)}`}
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={55}
                  />
                  <Tooltip
                    content={
                      <ChartTooltipContent
                        valueFormatter={(v: number) => `€${centsToEuros(v)}`}
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill={brandColor}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Orders by Day */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("orders7Days")}
            </CardTitle>
            {onExpandChart && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onExpandChart("orders")}
                title={t("expand")}
              >
                <Expand className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.ordersByDay.every((d) => d.count === 0) ? (
              <p className="text-sm text-muted-foreground h-48 flex items-center justify-center">
                {t("noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.ordersByDay}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDay}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill={brandColor}
                    radius={[4, 4, 0, 0]}
                    opacity={0.8}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Order Type Breakdown */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("orderTypeBreakdown")}
            </CardTitle>
            {onExpandChart && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onExpandChart("orderTypes")}
                title={t("expand")}
              >
                <Expand className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.orderTypeBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground h-48 flex items-center justify-center">
                {t("noData")}
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.orderTypeBreakdown}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.orderTypeBreakdown.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={
                            ORDER_TYPE_COLORS[entry.type] || "hsl(var(--muted))"
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltipContent />}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.orderTypeBreakdown.map((entry) => (
                    <div key={entry.type} className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{
                          backgroundColor:
                            ORDER_TYPE_COLORS[entry.type] ||
                            "hsl(var(--muted))",
                        }}
                      />
                      <span className="text-sm">
                        {ORDER_TYPE_LABELS[entry.type] || entry.type}
                      </span>
                      <span className="text-sm font-semibold ml-auto tabular-nums">
                        {entry.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">
              {t("peakHours")}
            </CardTitle>
            {onExpandChart && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => onExpandChart("peakHours")}
                title={t("expand")}
              >
                <Expand className="size-3.5" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {data.peakHours.length === 0 ? (
              <p className="text-sm text-muted-foreground h-48 flex items-center justify-center">
                {t("noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.peakHours}>
                  <XAxis
                    dataKey="hour"
                    tickFormatter={formatHour}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={25}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltipContent />}
                    labelFormatter={(v) => formatHour(v as number)}
                  />
                  <Bar
                    dataKey="count"
                    fill={brandColor}
                    radius={[4, 4, 0, 0]}
                    opacity={0.6}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
