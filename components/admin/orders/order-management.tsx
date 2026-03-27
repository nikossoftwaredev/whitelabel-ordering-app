"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Columns3,
  List,
  MapPin,
  Package,
  Phone,
  RotateCcw,
  Truck,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useTenant } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent,TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFormatPrice } from "@/hooks/use-format-price";
import { timeAgo } from "@/lib/general/formatters";
import { ACTIVE_ORDER_STATUSES,OrderStatus, orderStatusConfig } from "@/lib/general/status-config";
import { queryKeys } from "@/lib/query/keys";
import { useOrderNotificationStore } from "@/lib/stores/order-notification-store";

import { OrderBoard } from "./order-board";
import { OrderDetailSheet } from "./order-detail-sheet";
import type { Order, OrdersResponse } from "./types";

// ── Component ──────────────────────────────────────────────────────────────────

interface OrderManagementProps {
  tenantId: string;
}

export function OrderManagement({ tenantId }: OrderManagementProps) {
  const queryClient = useQueryClient();
  const formatPrice = useFormatPrice();
  const tenant = useTenant();
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [refundingOrderId, setRefundingOrderId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isFullRefund, setIsFullRefund] = useState(true);
  const [view, setView] = useState<"board" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("orders-view") as "board" | "list") || "board";
    }
    return "board";
  });
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

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
    refetchInterval: 15_000,
  });

  // ── Open order drawer from notification toast ────────────────────────────

  const pendingOrderId = useOrderNotificationStore((s) => s.pendingOrderId);
  const clearPendingOrderId = useOrderNotificationStore(
    (s) => s.clearPendingOrderId,
  );

  useEffect(() => {
    if (!pendingOrderId || !data?.orders) return;

    const order = data.orders.find((o) => o.id === pendingOrderId);
    if (order) {
      setDetailOrder(order);
      clearPendingOrderId();
    } else {
      // Order might not be in the cached list yet — fetch it directly
      fetch(`/api/admin/${tenantId}/orders/${pendingOrderId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((order) => {
          if (order) setDetailOrder(order);
        })
        .catch(() => {})
        .finally(() => clearPendingOrderId());
    }
  }, [pendingOrderId, data?.orders, tenantId, clearPendingOrderId]);

  // ── Mutation ───────────────────────────────────────────────────────────────

  const updateStatus = useMutation({
    mutationFn: async ({
      orderId,
      status,
      rejectionReason: reason,
      estimatedMinutes: minutes,
    }: {
      orderId: string;
      status: OrderStatus;
      rejectionReason?: string;
      estimatedMinutes?: number;
    }) => {
      const body: Record<string, unknown> = { status };
      if (reason) body.rejectionReason = reason;
      if (minutes) body.estimatedMinutes = minutes;

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
      setAcceptingOrderId(null);
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

  const refundOrder = useMutation({
    mutationFn: async ({
      orderId,
      amount,
      reason,
    }: {
      orderId: string;
      amount?: number;
      reason?: string;
    }) => {
      const res = await fetch(
        `/api/admin/${tenantId}/orders/${orderId}/refund`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount, reason }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to process refund");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Refund processed successfully");
      setRefundingOrderId(null);
      setRefundAmount("");
      setRefundReason("");
      setIsFullRefund(true);
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const orders = data?.orders ?? [];
  const activeOrders = orders.filter((o) =>
    ACTIVE_ORDER_STATUSES.includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === "COMPLETED");
  const rejectedOrders = orders.filter((o) => o.status === "REJECTED" || o.status === "CANCELLED");

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAccept = (orderId: string) => {
    if (acceptingOrderId === orderId) {
      // Confirm accept with the set time
      updateStatus.mutate({
        orderId,
        status: "ACCEPTED",
        estimatedMinutes,
      });
    } else {
      // Show time input
      setAcceptingOrderId(orderId);
      setEstimatedMinutes(tenant.prepTimeMinutes || 15);
    }
  };

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

  const handleOutForDelivery = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "DELIVERING" });

  const handleComplete = (orderId: string) =>
    updateStatus.mutate({ orderId, status: "COMPLETED" });

  const handleRefund = (order: Order) => {
    if (refundingOrderId === order.id) {
      // Confirm refund
      const amount = isFullRefund
        ? undefined
        : parseInt(refundAmount) || undefined;
      refundOrder.mutate({
        orderId: order.id,
        amount,
        reason: refundReason.trim() || undefined,
      });
    } else {
      setRefundingOrderId(order.id);
      setRefundAmount(String(order.total));
      setRefundReason("");
      setIsFullRefund(true);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderOrderCard = (order: Order) => {
    const status = orderStatusConfig[order.status];
    const isRejecting = rejectingOrderId === order.id;
    const isAccepting = acceptingOrderId === order.id;

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

          {/* Scheduled badge */}
          {order.scheduledFor && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1 w-fit">
              <Clock className="size-3" />
              Scheduled: {new Date(order.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

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

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div className="mt-2">
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />
                <span>{order.deliveryAddress}</span>
              </div>
              {order.deliveryAddressDetails && (() => {
                const d = order.deliveryAddressDetails as {
                  locationType?: string;
                  floor?: string;
                  apartmentNumber?: string;
                  companyName?: string;
                  entrance?: string;
                  accessDetails?: string;
                  deliveryInstructions?: string;
                };
                const hasDetails = d.floor || d.apartmentNumber || d.companyName || d.entrance || d.deliveryInstructions;
                if (!hasDetails) return null;
                return (
                  <div className="text-sm text-muted-foreground space-y-0.5 mt-1 ml-4.5">
                    {d.floor && (
                      <p>
                        Floor {d.floor}
                        {d.apartmentNumber ? `, Apt ${d.apartmentNumber}` : ""}
                      </p>
                    )}
                    {d.companyName && <p>{d.companyName}</p>}
                    {d.entrance && (
                      <p>
                        {(() => {
                          const labels: Record<string, string> = { door_code: "Door code", door_open: "Door is open", doorbell: "Doorbell" };
                          return labels[d.entrance ?? ""] ?? d.entrance;
                        })()}
                        {d.accessDetails ? `: ${d.accessDetails}` : ""}
                      </p>
                    )}
                    {d.deliveryInstructions && (
                      <p className="italic">{d.deliveryInstructions}</p>
                    )}
                  </div>
                );
              })()}
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
            <div className="flex items-center gap-2">
              {order.discount > 0 && (
                <span className="text-xs text-green-600">
                  -{formatPrice(order.discount)} {order.promoCode && `(${order.promoCode})`}
                </span>
              )}
              {order.tipAmount > 0 && (
                <span className="text-xs text-muted-foreground">
                  incl. {formatPrice(order.tipAmount)} tip
                </span>
              )}
            </div>
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

          {/* Refunded badge */}
          {order.paymentStatus === "REFUNDED" && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-2.5 py-1 w-fit">
              <RotateCcw className="size-3" />
              Refunded
            </div>
          )}

          {/* Refund inline form */}
          {refundingOrderId === order.id && (
            <div className="mt-3 space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={isFullRefund}
                    onChange={() => setIsFullRefund(true)}
                  />
                  Full refund ({formatPrice(order.total)})
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFullRefund}
                    onChange={() => setIsFullRefund(false)}
                  />
                  Partial
                </label>
              </div>
              {!isFullRefund && (
                <Input
                  type="number"
                  placeholder="Amount in cents"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="h-8"
                  min={1}
                  max={order.total}
                />
              )}
              <Textarea
                placeholder="Reason for refund (optional)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={
                    refundOrder.isPending ||
                    (!isFullRefund &&
                      (!refundAmount || parseInt(refundAmount) <= 0))
                  }
                  onClick={() => handleRefund(order)}
                >
                  Confirm Refund
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => {
                    setRefundingOrderId(null);
                    setRefundAmount("");
                    setRefundReason("");
                    setIsFullRefund(true);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
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

          {/* Accept with time input */}
          {isAccepting && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`time-${order.id}`} className="text-sm whitespace-nowrap">
                  Prep time (min)
                </Label>
                <Input
                  id={`time-${order.id}`}
                  type="number"
                  min={1}
                  max={180}
                  value={estimatedMinutes || ""}
                  onChange={(e) => setEstimatedMinutes(e.target.value === "" ? 0 : parseInt(e.target.value))}
                  className="w-20 h-8"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAccept(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <Check className="size-4" />
                  Confirm Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setAcceptingOrderId(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isRejecting && !isAccepting && (
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
                <div className="flex gap-2 w-full">
                  {order.orderType === "DELIVERY" && (
                    <Button
                      size="sm"
                      className="flex-1 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => handleOutForDelivery(order.id)}
                      disabled={updateStatus.isPending}
                    >
                      <Truck className="size-4" />
                      Out for Delivery
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 cursor-pointer"
                    onClick={() => handleComplete(order.id)}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="size-4" />
                    Complete
                  </Button>
                </div>
              )}
              {order.status === "DELIVERING" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleComplete(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="size-4" />
                  Delivered
                </Button>
              )}
              {(order.status === "COMPLETED" ||
                order.status === "REJECTED") &&
                order.paymentStatus === "PAID" &&
                order.paymentMethod === "STRIPE" &&
                refundingOrderId !== order.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 cursor-pointer text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950"
                    onClick={() => handleRefund(order)}
                    disabled={refundOrder.isPending}
                  >
                    <RotateCcw className="size-4" />
                    Refund
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
      return <EmptyState icon={Package} title="No orders in this category" />;
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orderList.map(renderOrderCard)}
      </div>
    );
  };

  const renderActiveOrders = () => {
    if (activeOrders.length === 0) {
      return <EmptyState icon={Package} title="No active orders" />;
    }

    const groups: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
      { status: "NEW", label: "New Orders", icon: <Clock className="size-4" /> },
      { status: "ACCEPTED", label: "Accepted", icon: <Check className="size-4" /> },
      { status: "PREPARING", label: "Preparing", icon: <ChefHat className="size-4" /> },
      { status: "READY", label: "Ready", icon: <Bell className="size-4" /> },
      { status: "DELIVERING", label: "Out for Delivery", icon: <Truck className="size-4" /> },
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
      <PageHeader
        title="Orders"
        description="Manage incoming orders and track their status."
      >
        <div className="flex items-center gap-1 border rounded-lg p-0.5">
          <Button
            variant={view === "board" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 cursor-pointer"
            onClick={() => {
              setView("board");
              localStorage.setItem("orders-view", "board");
            }}
          >
            <Columns3 className="size-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="size-8 cursor-pointer"
            onClick={() => {
              setView("list");
              localStorage.setItem("orders-view", "list");
            }}
          >
            <List className="size-4" />
          </Button>
        </div>
      </PageHeader>

      {view === "board" ? (
        (() => {
          if (isLoading) return renderSkeletons();
          return (
            <OrderBoard
              orders={orders}
              onStatusChange={(orderId, status, extras) => {
                updateStatus.mutate({ orderId, status, ...extras });
              }}
              onOrderClick={(order) => setDetailOrder(order)}
              formatPrice={formatPrice}
              isPending={updateStatus.isPending}
            />
          );
        })()
      ) : (
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
      )}

      <OrderDetailSheet
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
        onAccept={() => {
          // The sheet handles the time input internally
        }}
        onConfirmAccept={(orderId, minutes) => {
          updateStatus.mutate({ orderId, status: "ACCEPTED", estimatedMinutes: minutes });
          setDetailOrder(null);
        }}
        onReject={(orderId, reason) => {
          updateStatus.mutate({ orderId, status: "REJECTED", rejectionReason: reason });
          setDetailOrder(null);
        }}
        onStartPreparing={(orderId) => {
          updateStatus.mutate({ orderId, status: "PREPARING" });
          setDetailOrder(null);
        }}
        onMarkReady={(orderId) => {
          updateStatus.mutate({ orderId, status: "READY" });
          setDetailOrder(null);
        }}
        onOutForDelivery={(orderId) => {
          updateStatus.mutate({ orderId, status: "DELIVERING" });
          setDetailOrder(null);
        }}
        onComplete={(orderId) => {
          updateStatus.mutate({ orderId, status: "COMPLETED" });
          setDetailOrder(null);
        }}
        onRefund={(orderId, amount, reason) => {
          refundOrder.mutate({ orderId, amount, reason });
          setDetailOrder(null);
        }}
        formatPrice={formatPrice}
        isPending={updateStatus.isPending}
        storeName={tenant.name}
        currency={tenant.currency}
      />
    </div>
  );
}
