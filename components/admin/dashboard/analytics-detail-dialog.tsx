"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CalendarIcon,
  Download,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
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
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DATE_PRESET_KEYS,
  type DatePreset,
  getDateRange,
  toISODateString,
} from "@/lib/general/date-presets";
import { centsToEuros } from "@/lib/general/formatters";
import { ORDER_TYPE_LABELS } from "@/lib/general/order-types";
import { exportChartToPdf } from "@/lib/general/pdf-export";
import { queryKeys } from "@/lib/query/keys";

import {
  type AnalyticsTab,
  ChartTooltipContent,
  formatHour,
  ORDER_TYPE_COLORS,
} from "./analytics-charts";

interface DetailedAnalyticsData {
  meta: {
    startDate: string;
    endDate: string;
    granularity: string;
    totalDays: number;
  };
  timeSeries: { key: string; label: string; revenue: number; orders: number }[];
  orderTypeBreakdown: { type: string; count: number; percentage: number }[];
  peakHours: { hour: number; count: number }[];
  summary: {
    totalRevenue: number;
    avgDailyRevenue: number;
    peakDay: { label: string; revenue: number } | null;
    totalOrders: number;
    avgDailyOrders: number;
    avgOrderValue: number;
    mostPopularType: string | null;
    mostPopularTypePercent: string | null;
    busiestHour: number | null;
    quietestHour: number | null;
  };
}

interface AnalyticsDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  initialTab?: AnalyticsTab;
}

export function AnalyticsDetailDialog({
  open,
  onOpenChange,
  tenantId,
  initialTab = "revenue",
}: AnalyticsDetailDialogProps) {
  const t = useTranslations("Analytics");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(initialTab);
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>("last7days");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Sync initial tab when dialog opens with a different tab
  useEffect(() => {
    if (open) setActiveTab(initialTab);
  }, [open, initialTab]);

  // Calculate date range
  const customRangeComplete =
    selectedPreset === "custom" && !!customStart && !!customEnd;
  const hasValidRange = selectedPreset !== "custom" || customRangeComplete;

  let startDateStr: string;
  let endDateStr: string;

  if (customRangeComplete) {
    startDateStr = toISODateString(customStart);
    endDateStr = toISODateString(customEnd);
  } else if (selectedPreset !== "custom") {
    const range = getDateRange(selectedPreset);
    startDateStr = toISODateString(range.startDate);
    endDateStr = toISODateString(range.endDate);
  } else {
    // Custom selected but dates not yet picked — don't fetch
    startDateStr = "";
    endDateStr = "";
  }

  const { data, isLoading } = useQuery<DetailedAnalyticsData>({
    queryKey: queryKeys.analytics.detailed(tenantId, startDateStr, endDateStr),
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/analytics/detailed?startDate=${startDateStr}&endDate=${endDateStr}`
      );
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
    enabled: open && !!tenantId && hasValidRange,
  });

  const handlePresetClick = (preset: DatePreset) => {
    setSelectedPreset(preset);
  };

  const handleExportPdf = async () => {
    if (!exportRef.current) return;
    setIsExporting(true);
    try {
      const tabLabels: Record<AnalyticsTab, string> = {
        revenue: t("tabs.revenue"),
        orders: t("tabs.orders"),
        orderTypes: t("tabs.orderTypes"),
        peakHours: t("tabs.peakHours"),
      };
      await exportChartToPdf(
        exportRef.current,
        `${tabLabels[activeTab]} — ${startDateStr} to ${endDateStr}`
      );
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const brandColor = "var(--brand-primary, hsl(var(--primary)))";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl min-h-0 overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 gap-2 pr-10">
          <DialogTitle>{t("detailedTitle")}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting || isLoading}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            <span className="hidden sm:inline ml-1">
              {isExporting ? t("downloading") : t("downloadPdf")}
            </span>
          </Button>
        </DialogHeader>

        {/* Date Presets */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          {DATE_PRESET_KEYS.map((preset) => (
            <Button
              key={preset}
              variant={selectedPreset === preset ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => handlePresetClick(preset)}
            >
              {t(`presets.${preset}`)}
            </Button>
          ))}
          <Button
            variant={selectedPreset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full border-dashed"
            onClick={() => handlePresetClick("custom")}
          >
            <CalendarIcon className="size-3 mr-1" />
            {t("presets.custom")}
          </Button>
        </div>

        {/* Custom Date Range */}
        {selectedPreset === "custom" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="size-3 mr-1" />
                  {customStart
                    ? customStart.toLocaleDateString()
                    : t("customRange.startDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customStart}
                  onSelect={setCustomStart}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-xs">—</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <CalendarIcon className="size-3 mr-1" />
                  {customEnd
                    ? customEnd.toLocaleDateString()
                    : t("customRange.endDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customEnd}
                  onSelect={setCustomEnd}
                  disabled={{
                    after: new Date(),
                    ...(customStart ? { before: customStart } : {}),
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Tabs */}
        <Tabs className="mt-2"
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as AnalyticsTab)}
        >
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="revenue">{t("tabs.revenue")}</TabsTrigger>
            <TabsTrigger value="orders">{t("tabs.orders")}</TabsTrigger>
            <TabsTrigger value="orderTypes">{t("tabs.orderTypes")}</TabsTrigger>
            <TabsTrigger value="peakHours">{t("tabs.peakHours")}</TabsTrigger>
          </TabsList>

          <div ref={exportRef}>
            {/* Revenue Tab */}
            <TabsContent value="revenue" className="mt-4 space-y-4">
              {isLoading && <ChartSkeleton />}
              {!isLoading &&
                (!data ||
                  data.timeSeries.every((d) => d.revenue === 0)) && (
                  <NoData message={t("noData")} />
                )}
              {!isLoading &&
                data &&
                data.timeSeries.some((d) => d.revenue > 0) && (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.timeSeries}>
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tickFormatter={(v) => `€${centsToEuros(v)}`}
                          tick={{ fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip
                          content={
                            <ChartTooltipContent
                              valueFormatter={(v: number) =>
                                `€${centsToEuros(v)}`
                              }
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
                    <KpiRow>
                      <KpiCard
                        label={t("kpi.totalRevenue")}
                        value={`€${centsToEuros(data.summary.totalRevenue)}`}
                      />
                      <KpiCard
                        label={t("kpi.avgDailyRevenue")}
                        value={`€${centsToEuros(data.summary.avgDailyRevenue)}`}
                      />
                      <KpiCard
                        label={t("kpi.peakDay")}
                        value={data.summary.peakDay?.label ?? "--"}
                        subtitle={
                          data.summary.peakDay
                            ? `€${centsToEuros(data.summary.peakDay.revenue)}`
                            : undefined
                        }
                      />
                    </KpiRow>
                  </>
                )}
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4 space-y-4">
              {isLoading && <ChartSkeleton />}
              {!isLoading &&
                (!data ||
                  data.timeSeries.every((d) => d.orders === 0)) && (
                  <NoData message={t("noData")} />
                )}
              {!isLoading &&
                data &&
                data.timeSeries.some((d) => d.orders > 0) && (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={data.timeSeries}>
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11 }}
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
                          dataKey="orders"
                          fill={brandColor}
                          radius={[4, 4, 0, 0]}
                          opacity={0.8}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <KpiRow>
                      <KpiCard
                        label={t("kpi.totalOrders")}
                        value={String(data.summary.totalOrders)}
                      />
                      <KpiCard
                        label={t("kpi.avgDailyOrders")}
                        value={String(data.summary.avgDailyOrders)}
                      />
                      <KpiCard
                        label={t("kpi.avgOrderValue")}
                        value={`€${centsToEuros(data.summary.avgOrderValue)}`}
                      />
                    </KpiRow>
                  </>
                )}
            </TabsContent>

            {/* Order Types Tab */}
            <TabsContent value="orderTypes" className="mt-4 space-y-4">
              {isLoading && <ChartSkeleton />}
              {!isLoading &&
                (!data || data.orderTypeBreakdown.length === 0) && (
                  <NoData message={t("noData")} />
                )}
              {!isLoading &&
                data &&
                data.orderTypeBreakdown.length > 0 && (
                  <>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="50%" height={300}>
                        <PieChart>
                          <Pie
                            data={data.orderTypeBreakdown}
                            dataKey="count"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                          >
                            {data.orderTypeBreakdown.map((entry) => (
                              <Cell
                                key={entry.type}
                                fill={
                                  ORDER_TYPE_COLORS[entry.type] ||
                                  "hsl(var(--muted))"
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltipContent />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3">
                        {data.orderTypeBreakdown.map((entry) => (
                          <div
                            key={entry.type}
                            className="flex items-center gap-2"
                          >
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
                              {entry.count}{" "}
                              <span className="text-muted-foreground font-normal">
                                ({entry.percentage}%)
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <KpiRow>
                      <KpiCard
                        label={t("kpi.mostPopularType")}
                        value={
                          data.summary.mostPopularType
                            ? (ORDER_TYPE_LABELS[
                                data.summary.mostPopularType
                              ] ?? data.summary.mostPopularType)
                            : "--"
                        }
                      />
                      <KpiCard
                        label={t("kpi.percentOfTotal")}
                        value={data.summary.mostPopularTypePercent ?? "--"}
                      />
                      <KpiCard
                        label={t("kpi.totalOrders")}
                        value={String(data.summary.totalOrders)}
                      />
                    </KpiRow>
                  </>
                )}
            </TabsContent>

            {/* Peak Hours Tab */}
            <TabsContent value="peakHours" className="mt-4 space-y-4">
              {isLoading && <ChartSkeleton />}
              {!isLoading &&
                (!data || data.peakHours.length === 0) && (
                  <NoData message={t("noData")} />
                )}
              {!isLoading && data && data.peakHours.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={300}>
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
                  <KpiRow>
                    <KpiCard
                      label={t("kpi.busiestHour")}
                      value={
                        data.summary.busiestHour !== null
                          ? formatHour(data.summary.busiestHour)
                          : "--"
                      }
                    />
                    <KpiCard
                      label={t("kpi.quietestHour")}
                      value={
                        data.summary.quietestHour !== null
                          ? formatHour(data.summary.quietestHour)
                          : "--"
                      }
                    />
                    <KpiCard
                      label={t("kpi.totalOrders")}
                      value={String(data.summary.totalOrders)}
                    />
                  </KpiRow>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function KpiRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">{children}</div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold mt-0.5">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[300px] w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

function NoData({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground h-[300px] flex items-center justify-center">
      {message}
    </p>
  );
}
