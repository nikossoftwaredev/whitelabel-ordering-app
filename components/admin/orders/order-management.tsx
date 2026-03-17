"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  Phone,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent,TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormatPrice } from "@/hooks/use-format-price";
import { timeAgo } from "@/lib/general/formatters";
import { ACTIVE_ORDER_STATUSES,OrderStatus, orderStatusConfig } from "@/lib/general/status-config";
import { queryKeys } from "@/lib/query/keys";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrderItemModifier {
  name: string;
  priceAdjustment: number;
}

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
}

interface OrderCustomer {
  name: string | null;
  phone: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  estimatedReadyAt: string | null;
  rejectionReason: string | null;
  items: OrderItem[];
  customer: OrderCustomer | null;
}

interface OrdersResponse {
  orders: Order[];
  total: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

interface OrderManagementProps {
  tenantId: string;
}

export function OrderManagement({ tenantId }: OrderManagementProps) {
  const queryClient = useQueryClient();
  const formatPrice = useFormatPrice();
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: queryKeys.orders.all(tenantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/orders?limit=200&offset=0`
      );
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!tenantId,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────

  const updateStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      rejectionReason: reason,
    }: {
      orderId: string;
      status: OrderStatus;
      rejectionReason?: string;
    }) => {
      const body: Record<string, unknown> = { status };
      if (reason) body.rejectionReason = reason;

      const res = await fetch(`/api/admin/${tenantId}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    onMutate: async ({ orderId, status }) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.orders.all(tenantId),
      });

      const previous = queryClient.getQueryData<OrdersResponse>(
        queryKeys.orders.all(tenantId)
      );

      queryClient.setQueryData<OrdersResponse>(
        queryKeys.orders.all(tenantId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            orders: old.orders.map((o) =>
              o.id === orderId ? { ...o, status } : o
            ),
          };
        }
      );

      return { previous };
    },
    onSuccess: (_data, { status }) => {
      const label = orderStatusConfig[status].label;
      toast.success(`Order updated to ${label}`);
      setRejectingOrderId(null);
      setRejectionReason("");
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.orders.all(tenantId),
          context.previous
        );
      }
      toast.error("Failed to update order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      });
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const orders = data?.orders ?? [];
  const activeOrders = orders.filter((o) =>
    ACTIVE_ORDER_STATUSES.includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const rejectedOrders = orders.filter((o) => o.status === "REJECTED" || o.status === "CANCELLED");

  const countByStatus = (status: OrderStatus) =>
    orders.filter((o) => o.status === status).length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAccept = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "ACCEPTED" });

  const handleReject = (orderId: string) => {
    if (rejectingOrderId === orderId && rejectionReason.trim()) {
      updateStatus.mutate({
        orderId,
        status: "REJECTED",
        rejectionReason: rejectionReason.trim(),
      });
    } else {
      setRejectingOrderId(orderId);
      setRejectionReason("");
    }
  };

  const handleStartPreparing = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "PREPARING" });

  const handleMarkReady = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "READY" });

  const handleComplete = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "COMPLETED" });

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderOrderCard = (order: Order) => {
    const status = orderStatusConfig[order.status];
    const isRejecting = rejectingOrderId === order.id;

    return (
      <Card key={order.id} className="overflow-hidden">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">#{order.orderNumber}</span>
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          </div>

          {/* Customer info */}
          {order.customer && (
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              {order.customer.name && (
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  {order.customer.name}
                </span>
              )}
              {order.customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {order.customer.phone}
                </span>
              )}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {timeAgo(order.createdAt)}
            <span className="ml-1 text-xs">
              ({new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })})
            </span>
          </div>

          <Separator className="my-3" />

          {/* Items */}
          <ul className="space-y-1.5">
            {order.items.map((item, idx) => (
              <li key={idx}>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{item.quantity}x</span>{" "}
                    {item.productName}
                  </span>
                  <span className="text-muted-foreground">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
                {item.modifiers.length > 0 && (
                  <div className="ml-5 text-xs text-muted-foreground">
                    {item.modifiers
                      .map(
                        (m) =>
                          `+ ${m.name}${m.priceAdjustment > 0 ? ` (${formatPrice(m.priceAdjustment)})` : ""}`
                      )
                      .join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <Separator className="my-3" />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">
              {formatPrice(order.total)}
            </span>
          </div>

          {/* Rejection reason display */}
          {order.status === "REJECTED" && order.rejectionReason && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              Reason: {order.rejectionReason}
            </p>
          )}

          {/* Cancelled by customer display */}
          {order.status === "CANCELLED" && (
            <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">
              Cancelled by customer
            </p>
          )}

          {/* Rejection textarea (inline) */}
          {isRejecting && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={
                    !rejectionReason.trim() || updateStatus.isPending
                  }
                  onClick={() => handleReject(order.id)}
                >
                  Confirm Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => {
                    setRejectingOrderId(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isRejecting && (
            <div className="flex gap-2 mt-3">
              {order.status === "NEW" && (
                <>
                  <Button
                    size="sm"
                    className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleAccept(order.id)}
                    disabled={updateStatus.isPending}
                  >
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={() => handleReject(order.id)}
                    disabled={updateStatus.isPending}
                  >
                    <X className="size-4" />
                    Reject
                  </Button>
                </>
              )}
              {order.status === "ACCEPTED" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={() => handleStartPreparing(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <ChefHat className="size-4" />
                  Start Preparing
                </Button>
              )}
              {order.status === "PREPARING" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleMarkReady(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <Bell className="size-4" />
                  Mark Ready
                </Button>
              )}
              {order.status === "READY" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={() => handleComplete(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="size-4" />
                  Complete
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderOrderList = (orderList: Order[]) => {
    if (orderList.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="size-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No orders in this category</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderList.map(renderOrderCard)}
      </div>
    );
  };

  const renderActiveOrders = () => {
    if (activeOrders.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Package className="size-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No active orders</p>
        </div>
      );
    }

    const groups: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
      { status: "NEW", label: "New Orders", icon: <Clock className="size-4" /> },
      { status: "ACCEPTED", label: "Accepted", icon: <Check className="size-4" /> },
      { status: "PREPARING", label: "Preparing", icon: <ChefHat className="size-4" /> },
      { status: "READY", label: "Ready for Pickup", icon: <Bell className="size-4" /> },
    ];

    return (
      <div className="space-y-8">
        {groups.map(({ status, label, icon }) => {
          const groupOrders = activeOrders.filter((o) => o.status === status);
          if (groupOrders.length === 0) return null;
          return (
            <section key={status}>
              <div className="flex items-center gap-2 mb-3">
                {icon}
                <h3 className="font-semibold text-base">{label}</h3>
                <Badge variant="secondary" className="ml-1">
                  {groupOrders.length}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupOrders.map(renderOrderCard)}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const renderSkeletons = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Separator />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Separator />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-9 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">
          Manage incoming orders and track their status.
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="cursor-pointer">
            Active
            {activeOrders.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {activeOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="cursor-pointer">
            Completed
            {completedOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {completedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="cursor-pointer">
            Rejected / Cancelled
            {rejectedOrders.length > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              >
                {rejectedOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {isLoading ? renderSkeletons() : renderActiveOrders()}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {isLoading ? renderSkeletons() : renderOrderList(completedOrders)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {isLoading ? renderSkeletons() : renderOrderList(rejectedOrders)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
