"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import type { OrderEvent } from "@/lib/events/order-events";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface OrderNotificationProviderProps {
  tenantId: string;
}

export function OrderNotificationProvider({
  tenantId,
}: OrderNotificationProviderProps) {
  const queryClient = useQueryClient();
  const formatPrice = useFormatPrice();
  const { playSound } = useNotificationSound();
  const playSoundRef = useRef(playSound);
  const formatPriceRef = useRef(formatPrice);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  useEffect(() => {
    formatPriceRef.current = formatPrice;
  }, [formatPrice]);

  useEffect(() => {
    if (!tenantId) return;

    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel(`orders:${tenantId}`)
      .on("broadcast", { event: "new_order" }, ({ payload }) => {
        const event = payload as OrderEvent;

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
      })
      .on("broadcast", { event: "status_change" }, () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.all(tenantId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats.dashboard(tenantId),
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tenantId, queryClient]);

  return null;
}
