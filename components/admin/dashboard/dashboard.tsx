"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  DollarSign,
  Heart,
  RotateCcw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { useTenant } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { centsToEuros, timeAgo } from "@/lib/general/formatters";
import { ORDER_STATUS_COLORS } from "@/lib/general/status-config";
import { queryKeys } from "@/lib/query/keys";

import { AnalyticsCharts } from "./analytics-charts";

interface DashboardStats {
  today: { revenue: number; orders: number; tips: number; refunds: number; refundAmount: number };
  activeOrders: number;
  weekRevenue: number;
  popularProducts: { name: string; quantity: number }[];
  recentOrders: {
    id: string;
    orderNumber: number;
    status: string;
    total: number;
    createdAt: string;
    customerName: string | null;
    items: { productName: string; quantity: number }[];
  }[];
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}

export function Dashboard({ tenantId }: { tenantId: string }) {
  const tenant = useTenant();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.stats.dashboard(tenantId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/${tenantId}/stats`);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of {tenant.name}&apos;s performance
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  &euro;{centsToEuros(data?.today.revenue ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.today.orders ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Orders
                </CardTitle>
                <Clock
                  className={`h-4 w-4 ${
                    (data?.activeOrders ?? 0) > 0
                      ? "text-amber-500"
                      : "text-muted-foreground"
                  }`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    (data?.activeOrders ?? 0) > 0 ? "text-amber-500" : ""
                  }`}
                >
                  {data?.activeOrders ?? 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Tips
                </CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  &euro;{centsToEuros(data?.today.tips ?? 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Refunds Today
                </CardTitle>
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.today.refunds ?? 0}
                </div>
                {(data?.today.refundAmount ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    &euro;{centsToEuros(data?.today.refundAmount ?? 0)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Week Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  &euro;{centsToEuros(data?.weekRevenue ?? 0)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Bottom sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Products */}
        <Card>
          <CardHeader>
            <CardTitle>Popular This Week</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && <ListSkeleton />}
            {!isLoading && data?.popularProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No orders this week yet.
              </p>
            )}
            {!isLoading && (data?.popularProducts.length ?? 0) > 0 && (
              <div className="space-y-3">
                {data?.popularProducts.map((product, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {product.name}
                      </span>
                      <Badge variant="secondary">
                        {product.quantity} sold
                      </Badge>
                    </div>
                    {i < (data?.popularProducts.length ?? 0) - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading && <ListSkeleton />}
            {!isLoading && data?.recentOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
            {!isLoading && (data?.recentOrders.length ?? 0) > 0 && (
              <div className="space-y-3">
                {data?.recentOrders.map((order, i) => (
                  <div key={order.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            #{order.orderNumber}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              ORDER_STATUS_COLORS[order.status] || ""
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {order.customerName || "Guest"} &middot;{" "}
                          {order.items
                            .map(
                              (item) =>
                                `${item.quantity}x ${item.productName}`
                            )
                            .join(", ")}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium">
                          &euro;{centsToEuros(order.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    {i < (data?.recentOrders.length ?? 0) - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <AnalyticsCharts tenantId={tenantId} />
    </div>
  );
}
