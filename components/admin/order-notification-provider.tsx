"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query/keys";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import type { OrderEvent } from "@/lib/events/order-events";

interface OrderNotificationProviderProps {
  tenantId: string;
}

export function OrderNotificationProvider({
  tenantId,
}: OrderNotificationProviderProps) {
  const queryClient = useQueryClient();
  const formatPrice = useFormatPrice();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { playSound } = useNotificationSound();
  const playSoundRef = useRef(playSound);
  const formatPriceRef = useRef(formatPrice);

  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  useEffect(() => {
    formatPriceRef.current = formatPrice;
  }, [formatPrice]);

  useEffect(() => {
    if (!tenantId) return;

    let stopped = false;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/admin/${tenantId}/orders/stream`);
      eventSourceRef.current = es;

      es.addEventListener("new_order", (e) => {
        const event: OrderEvent = JSON.parse(e.data);

        playSoundRef.current();

        toast.info(`New order #${event.orderNumber}`, {
          description: `${event.customerName || "Guest"} — ${formatPriceRef.current(event.total)}`,
          duration: 8000,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = `/admin/orders`;
            },
          },
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(tenantId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.dashboard(tenantId),
        });
      });

      es.addEventListener("status_change", () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(tenantId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.dashboard(tenantId),
        });
      });

      es.onerror = () => {
        es.close();
        if (!stopped) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      stopped = true;
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [tenantId, queryClient]);

  return null;
}
