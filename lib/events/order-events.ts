import { EventEmitter } from "events";

export interface OrderEvent {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  customerName: string | null;
}

class OrderEventBus extends EventEmitter {
  /** Fired when a new order is created (status: NEW) */
  emitNewOrder(event: OrderEvent) {
    this.emit("order:new", event);
  }

  /** Fired when an order's status changes */
  emitStatusChange(event: OrderEvent) {
    this.emit("order:status", event);
  }
}

// Singleton — survives hot reloads in dev
const globalForEvents = globalThis as unknown as {
  orderEvents: OrderEventBus | undefined;
};

export const orderEvents =
  globalForEvents.orderEvents ?? new OrderEventBus();

if (process.env.NODE_ENV !== "production") {
  globalForEvents.orderEvents = orderEvents;
}

// Prevent MaxListeners warning (many SSE connections)
orderEvents.setMaxListeners(100);
