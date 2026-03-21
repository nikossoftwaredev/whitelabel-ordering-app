import type { OrderStatus } from "@/lib/general/status-config";

export const ORDER_TYPE_LABELS: Record<string, string> = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
  DINE_IN: "Dine-in",
};

export interface OrderItemModifier {
  name: string;
  priceAdjustment: number;
}

export interface KdsOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
}

export interface KdsOrder {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
  createdAt: string;
  customerName: string | null;
  customerNote: string | null;
  items: KdsOrderItem[];
}
