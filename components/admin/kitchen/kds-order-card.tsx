"use client";

import { Bike, Loader2, Store, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { Order } from "@/components/admin/orders/types";
import { PresetBadge } from "@/components/preset-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ORDER_TYPE_LABELS } from "@/lib/general/order-types";
import type { OrderStatus } from "@/lib/general/status-config";

interface KdsOrderCardProps {
  order: Order;
  onAdvance: (orderId: string, nextStatus: OrderStatus) => void;
  onClick: () => void;
  isPending: boolean;
}

const ORDER_TYPE_ICON = {
  PICKUP: Store,
  DELIVERY: Bike,
  DINE_IN: UtensilsCrossed,
};

function getNextStatus(current: OrderStatus): OrderStatus | null {
  const flow: Partial<Record<OrderStatus, OrderStatus>> = {
    NEW: "ACCEPTED",
    ACCEPTED: "PREPARING",
    PREPARING: "READY",
    READY: "COMPLETED",
  };
  return flow[current] || null;
}

export function KdsOrderCard({ order, onAdvance, onClick, isPending }: KdsOrderCardProps) {
  const t = useTranslations("Kitchen");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(order.createdAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [order.createdAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timerDisplay = `${mins}:${String(secs).padStart(2, "0")}`;

  let timerColor = "text-green-600 dark:text-green-400";
  if (mins >= 20) timerColor = "text-red-600 dark:text-red-400";
  else if (mins >= 10) timerColor = "text-amber-600 dark:text-amber-400";

  let borderColor = "border-green-500/30";
  if (mins >= 20) borderColor = "border-red-500/50";
  else if (mins >= 10) borderColor = "border-amber-500/40";

  const nextStatus = getNextStatus(order.status);
  const TypeIcon = ORDER_TYPE_ICON[order.orderType] || Store;

  const actionLabels: Partial<Record<OrderStatus, string>> = {
    ACCEPTED: t("tapToAccept"),
    PREPARING: t("tapToPrepare"),
    READY: t("tapToReady"),
    COMPLETED: t("tapToComplete"),
  };

  return (
    <div
      className={`rounded-2xl border-2 bg-card shadow-sm transition-all duration-300 cursor-pointer ${borderColor}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tabular-nums">
            #{order.orderNumber}
          </span>
          <Badge variant="outline" className="text-xs gap-1">
            <TypeIcon className="size-3" />
            {ORDER_TYPE_LABELS[order.orderType]}
          </Badge>
        </div>
        <span className={`text-lg font-mono font-bold tabular-nums ${timerColor}`}>
          {timerDisplay}
        </span>
      </div>

      {/* Customer */}
      {order.customerName && (
        <div className="px-4 pt-2 text-sm text-muted-foreground">
          {order.customerName}
        </div>
      )}

      {/* Items */}
      <div className="px-4 py-3 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-2">
            <span className="text-lg font-bold tabular-nums shrink-0 w-7 text-right">
              {item.quantity}x
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold text-[15px] leading-tight">
                  {item.productName}
                </p>
                {item.isPreset && <PresetBadge label={item.presetName || undefined} />}
              </div>
              {item.modifiers.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.modifiers.map((m) => m.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.customerNote && (
        <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-300">{order.customerNote}</p>
        </div>
      )}

      {/* Action Button */}
      {nextStatus && (
        <div className="px-4 pb-4">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdvance(order.id, nextStatus);
            }}
            disabled={isPending}
            className="w-full h-12 text-[15px] font-bold rounded-xl cursor-pointer"
            style={{
              background: "var(--brand-primary, hsl(var(--primary)))",
              color: "white",
            }}
          >
            {isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              actionLabels[nextStatus] || nextStatus
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
