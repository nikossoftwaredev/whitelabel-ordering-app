"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useNotificationSound } from "@/hooks/use-notification-sound";
import type { OrderEvent } from "@/lib/events/order-events";
import { useRouter } from "@/lib/i18n/navigation";
import { queryKeys } from "@/lib/query/keys";
import { useOrderNotificationStore } from "@/lib/stores/order-notification-store";
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
  const router = useRouter();
  const setPendingOrderId = useOrderNotificationStore(
    (s) => s.setPendingOrderId,
  );
  const playSoundRef = useRef(playSound);
  const formatPriceRef = useRef(formatPrice);
  const routerRef = useRef(router);
  const setPendingOrderIdRef = useRef(setPendingOrderId);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const chatChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    playSoundRef.current = playSound;
  }, [playSound]);

  useEffect(() => {
    formatPriceRef.current = formatPrice;
  }, [formatPrice]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    setPendingOrderIdRef.current = setPendingOrderId;
  }, [setPendingOrderId]);

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
              setPendingOrderIdRef.current(event.orderId);
              routerRef.current.push("/admin/orders");
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

  useEffect(() => {
    if (!tenantId) return;

    const supabase = getSupabaseBrowserClient();

    const chatChannel = supabase
      .channel(`admin-chat:${tenantId}`)
      .on("broadcast", { event: "new_customer_message" }, () => {
        toast.info("New chat message", {
          description: "A customer sent you a message",
          action: {
            label: "View",
            onClick: () => {
              routerRef.current.push("/admin/chat");
            },
          },
          duration: 6000,
        });
      })
      .subscribe();

    chatChannelRef.current = chatChannel;

    return () => {
      supabase.removeChannel(chatChannel);
      chatChannelRef.current = null;
    };
  }, [tenantId]);

  return null;
}
