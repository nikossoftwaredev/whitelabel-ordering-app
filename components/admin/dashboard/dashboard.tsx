"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useTenant } from "@/components/tenant-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  today: { revenue: number; orders: number };
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

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  ACCEPTED:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  PREPARING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  READY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  COMPLETED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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
    refetchInterval: 30000,
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
                  &euro;{formatCents(data?.today.revenue ?? 0)}
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
                  Week Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  &euro;{formatCents(data?.weekRevenue ?? 0)}
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
            {isLoading ? (
              <ListSkeleton />
            ) : data?.popularProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders this week yet.
              </p>
            ) : (
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
            {isLoading ? (
              <ListSkeleton />
            ) : data?.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
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
                              STATUS_COLORS[order.status] || ""
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
                          &euro;{formatCents(order.total)}
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
    </div>
  );
}
