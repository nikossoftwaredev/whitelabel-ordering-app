"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChefHat, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { OrderNotificationProvider } from "@/components/admin/order-notification-provider";
import { OrderDetailSheet } from "@/components/admin/orders/order-detail-sheet";
import type { Order, OrdersResponse } from "@/components/admin/orders/types";
import { Button } from "@/components/ui/button";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useSoundSettings } from "@/hooks/use-notification-sound";
import type { OrderStatus } from "@/lib/general/status-config";
import { orderStatusConfig } from "@/lib/general/status-config";
import { Link } from "@/lib/i18n/navigation";
import { queryKeys } from "@/lib/query/keys";

import { KdsOrderCard } from "./kds-order-card";

interface KitchenDisplayProps {
  tenantId: string;
}

const KDS_STATUSES: OrderStatus[][] = [
  ["NEW"],
  ["ACCEPTED", "PREPARING"],
  ["READY"],
];

const COLUMN_KEYS = ["new", "preparing", "ready"] as const;

export function KitchenDisplay({ tenantId }: KitchenDisplayProps) {
  const t = useTranslations("Kitchen");
  const queryClient = useQueryClient();
  const muted = useSoundSettings((s) => s.muted);
  const toggleMute = useSoundSettings((s) => s.toggleMute);
  const formatPrice = useFormatPrice();
  const [clock, setClock] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  // Live clock
  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch orders
  const { data } = useQuery<OrdersResponse>({
    queryKey: queryKeys.orders.all(tenantId),
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/${tenantId}/orders?limit=200&offset=0`
      );
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  // Status mutation
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
      setPendingId(null);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.orders.all(tenantId),
          context.previous
        );
      }
      toast.error("Failed to update order");
      setPendingId(null);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      });
    },
  });

  const handleAdvance = (orderId: string, nextStatus: OrderStatus) => {
    setPendingId(orderId);
    updateStatus.mutate({ orderId, status: nextStatus });
  };

  // Refund mutation
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
        },
      );
      if (!res.ok) throw new Error("Failed to refund order");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Order refunded successfully");
    },
    onError: () => {
      toast.error("Failed to refund order");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.all(tenantId),
      });
    },
  });

  const orders = data?.orders || [];

  // Group into columns
  const columns = KDS_STATUSES.map((statuses) =>
    orders
      .filter((o) => statuses.includes(o.status))
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
  );

  const columnTitles = [t("newOrders"), t("preparing"), t("readyForPickup")];
  const columnColors = [
    "border-blue-500/50",
    "border-amber-500/50",
    "border-green-500/50",
  ];
  const columnBgColors = [
    "bg-blue-500/10",
    "bg-amber-500/10",
    "bg-green-500/10",
  ];

  return (
    <>
      {/* SSE provider for real-time updates */}
      <OrderNotificationProvider tenantId={tenantId} />

      {/* Fullscreen overlay */}
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="size-9">
              <Link href="/admin">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <ChefHat className="size-5" />
            <h1 className="text-lg font-bold">{t("title")}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-lg font-mono tabular-nums text-muted-foreground">
              {clock}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="size-9"
            >
              {muted ? (
                <VolumeX className="size-5 text-muted-foreground" />
              ) : (
                <Volume2 className="size-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Columns */}
        <div className="flex-1 grid grid-cols-3 gap-0 min-h-0">
          {columns.map((col, i) => (
            <div
              key={COLUMN_KEYS[i]}
              className="flex flex-col min-h-0 border-r last:border-r-0 border-border"
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between px-4 py-3 border-b ${columnBgColors[i]}`}
              >
                <h2 className="text-sm font-bold uppercase tracking-wide">
                  {columnTitles[i]}
                </h2>
                <span
                  className={`flex items-center justify-center size-7 rounded-full text-xs font-bold ${columnBgColors[i]} ${columnColors[i]} border-2`}
                >
                  {col.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {col.length === 0 && (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    {t("noOrders")}
                  </div>
                )}
                {col.map((order) => (
                  <KdsOrderCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    onClick={() => setDetailOrder(order)}
                    isPending={pendingId === order.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order detail drawer */}
      <OrderDetailSheet
        order={detailOrder}
        open={!!detailOrder}
        onOpenChange={(open) => {
          if (!open) setDetailOrder(null);
        }}
        onAccept={() => {}}
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
      />
    </>
  );
}
