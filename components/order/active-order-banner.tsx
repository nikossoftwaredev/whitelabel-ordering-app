"use client";

import {
  Check,
  ChefHat,
  ChevronRight,
  Clock,
  HandPlatter,
  Loader2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useFormatPrice } from "@/hooks/use-format-price";
import type { OrderStatus } from "@/lib/general/status-config";
import { cn } from "@/lib/general/utils";
import { Link } from "@/lib/i18n/navigation";

type ActiveOrderStatus = Extract<OrderStatus, "NEW" | "ACCEPTED" | "PREPARING" | "READY">;

interface ActiveOrder {
  id: string;
  orderNumber: string;
  status: ActiveOrderStatus;
  total: number;
  createdAt: string;
  estimatedReadyAt: string | null;
}

const STATUS_CONFIG: Record<
  ActiveOrderStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  NEW: { label: "Placed", icon: Clock, color: "text-amber-500" },
  ACCEPTED: { label: "Accepted", icon: Check, color: "text-blue-500" },
  PREPARING: { label: "Preparing", icon: ChefHat, color: "text-orange-500" },
  READY: { label: "Ready!", icon: HandPlatter, color: "text-green-500" },
};

export function ActiveOrderBanner() {
  const { data: session } = useSession();
  const tenant = useTenant();
  const formatPrice = useFormatPrice();
  const [order, setOrder] = useState<ActiveOrder | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
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

  // SSE for live updates on active order
  useEffect(() => {
    if (!order || !tenant.slug) return;

    const orderId = order.id;
    let stopped = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(
        `/api/tenants/${tenant.slug}/orders/${orderId}/stream`
      );
      eventSourceRef.current = es;

      es.addEventListener("status_change", (e) => {
        const data = JSON.parse(e.data);
        const newStatus = data.status as string;

        if (newStatus === "COMPLETED" || newStatus === "REJECTED") {
          stopped = true;
          setVisible(false);
          setTimeout(() => setOrder(null), 300);
          es.close();
        } else {
          setOrder((prev) =>
            prev ? { ...prev, status: newStatus as ActiveOrderStatus } : prev
          );
        }
      });

      es.onerror = () => {
        es.close();
        if (!stopped) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      stopped = true;
      eventSourceRef.current?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [order?.id, tenant.slug]);

  if (!order) return null;

  const config = STATUS_CONFIG[order.status];
  const Icon = config.icon;

  return (
    <Link
      href={`/order/confirmation?orderId=${order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`}
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md",
        "bg-card border border-border rounded-2xl shadow-lg px-4 py-3",
        "flex items-center gap-3 transition-all duration-300 group hover:shadow-xl",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0 pointer-events-none"
      )}
    >
      {/* Animated icon */}
      <div
        className={cn(
          "flex items-center justify-center size-10 rounded-full shrink-0",
          order.status === "READY"
            ? "bg-green-100 dark:bg-green-900/30"
            : "bg-muted"
        )}
      >
        {order.status === "READY" ? (
          <Icon className="size-5 text-green-500" />
        ) : (
          <Loader2 className={cn("size-5 animate-spin", config.color)} />
        )}
      </div>

      {/* Order info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            Order #{order.orderNumber}
          </span>
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPrice(order.total)}
          {order.status === "READY" && " — Pick up now!"}
          {order.status === "PREPARING" && " — Almost ready..."}
          {order.status === "NEW" && " — Waiting for confirmation..."}
          {order.status === "ACCEPTED" && " — Store confirmed your order"}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRight className="size-4 text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
    </Link>
  );
}
