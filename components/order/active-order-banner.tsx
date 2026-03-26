"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Check,
  ChefHat,
  ChevronRight,
  Clock,
  HandPlatter,
  Loader2,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useFormatPrice } from "@/hooks/use-format-price";
import type { OrderStatus } from "@/lib/general/status-config";
import { cn } from "@/lib/general/utils";
import { Link } from "@/lib/i18n/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ActiveOrderStatus = Extract<
  OrderStatus,
  "NEW" | "ACCEPTED" | "PREPARING" | "READY"
>;

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: ActiveOrderStatus;
  total: number;
  createdAt: string;
  estimatedReadyAt: string | null;
}

const STATUS_ICONS: Record<ActiveOrderStatus, typeof Clock> = {
  NEW: Clock,
  ACCEPTED: Check,
  PREPARING: ChefHat,
  READY: HandPlatter,
};

const STATUS_COLORS: Record<ActiveOrderStatus, string> = {
  NEW: "text-amber-500",
  ACCEPTED: "text-blue-500",
  PREPARING: "text-orange-500",
  READY: "text-green-500",
};

export function ActiveOrderBanner() {
  const t = useTranslations("ActiveOrderBanner");
  const { data: session } = useSession();
  const tenant = useTenant();
  const formatPrice = useFormatPrice();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [visible, setVisible] = useState(false);

  // Fetch active order on mount
  useEffect(() => {
    if (!session?.user?.id || !tenant.slug) return;

    fetch(`/api/tenants/${tenant.slug}/orders/active`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) {
          setOrder(data.order);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, [session?.user?.id, tenant.slug]);

  // Subscribe to Supabase Broadcast for live order updates
  useEffect(() => {
    if (!order) return;

    const orderId = order.id;
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`order:${orderId}`)
      .on("broadcast", { event: "status_change" }, ({ payload }) => {
        const newStatus = payload.status as string;

        if (newStatus === "COMPLETED" || newStatus === "REJECTED") {
          setVisible(false);
          setTimeout(() => setOrder(null), 300);
          supabase.removeChannel(channel);
        } else {
          setOrder((prev) =>
            prev ? { ...prev, status: newStatus as ActiveOrderStatus } : prev,
          );
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [order?.id]);

  // Polling fallback in case Supabase Realtime misses an event
  const orderStatusRef = useRef(order?.status);
  useEffect(() => {
    orderStatusRef.current = order?.status;
  }, [order?.status]);

  useEffect(() => {
    if (!order || !tenant.slug) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.slug}/orders/active`);
        const data = await res.json();
        if (data.order && data.order.status !== orderStatusRef.current) {
          const newStatus = data.order.status as string;
          if (newStatus === "COMPLETED" || newStatus === "REJECTED") {
            setVisible(false);
            setTimeout(() => setOrder(null), 300);
          } else {
            setOrder((prev) =>
              prev
                ? { ...prev, status: newStatus as ActiveOrderStatus }
                : prev,
            );
          }
        } else if (!data.order) {
          setVisible(false);
          setTimeout(() => setOrder(null), 300);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 10_000);

    return () => clearInterval(poll);
  }, [order, tenant.slug]);

  if (!order) return null;

  const Icon = STATUS_ICONS[order.status];
  const color = STATUS_COLORS[order.status];

  const statusLabel: Record<ActiveOrderStatus, string> = {
    NEW: t("statusPlaced"),
    ACCEPTED: t("statusAccepted"),
    PREPARING: t("statusPreparing"),
    READY: t("statusReady"),
  };

  const statusMessage: Record<ActiveOrderStatus, string> = {
    NEW: t("waitingConfirmation"),
    ACCEPTED: t("storeConfirmed"),
    PREPARING: t("almostReady"),
    READY: t("pickUpNow"),
  };

  return (
    <Link
      href={`/order/confirmation?orderId=${order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md",
        "bg-card border border-border rounded-2xl shadow-lg px-4 py-3",
        "flex items-center gap-3 transition-all duration-300 group hover:shadow-xl",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none",
      )}
    >
      {/* Animated icon */}
      <div
        className={cn(
          "flex items-center justify-center size-10 rounded-full shrink-0",
          order.status === "READY"
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-muted",
        )}
      >
        {order.status === "READY" ? (
          <Icon className="size-5 text-green-500" />
        ) : (
          <Loader2 className={cn("size-5 animate-spin", color)} />
        )}
      </div>

      {/* Order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            Order #{order.orderNumber}
          </span>
          <span className={cn("text-xs font-medium", color)}>
            {statusLabel[order.status]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPrice(order.total)} — {statusMessage[order.status]}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />

      {/* Dismiss */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisible(false);
          setTimeout(() => setOrder(null), 300);
        }}
        className="shrink-0 size-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200"
      >
        <X className="size-3.5" />
      </button>
    </Link>
  );
}
