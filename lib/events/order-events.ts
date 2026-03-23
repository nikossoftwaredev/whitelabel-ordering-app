import { broadcastEvent } from "@/lib/supabase/server";

export interface OrderEvent {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName: string | null;
  estimatedReadyAt?: string | null;
}

/**
 * Broadcast order events via Supabase Realtime.
 *
 * Two channels per tenant:
 * - `orders:${tenantId}` — admin dashboard listens here (all orders)
 * - `order:${orderId}`   — customer tracks their specific order
 */
export const orderEvents = {
  /** Fired when a new order is created (status: NEW) */
  async emitNewOrder(event: OrderEvent) {
    await broadcastEvent(`orders:${event.tenantId}`, "new_order", event as unknown as Record<string, unknown>);
  },

  /** Fired when an order's status changes */
  async emitStatusChange(event: OrderEvent) {
    // Notify admin dashboard
    await Promise.all([
      broadcastEvent(`orders:${event.tenantId}`, "status_change", event as unknown as Record<string, unknown>),
      // Notify the specific customer tracking this order
      broadcastEvent(`order:${event.orderId}`, "status_change", event as unknown as Record<string, unknown>),
    ]);
  },
};
