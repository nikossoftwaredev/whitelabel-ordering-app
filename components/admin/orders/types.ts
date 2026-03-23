import type { OrderStatus } from "@/lib/general/status-config";

export interface OrderItemModifier {
  name: string;
  priceAdjustment: number;
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
}

export interface OrderCustomer {
  name: string | null;
  phone: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED" | "FAILED" | "DISPUTED";
  paymentMethod: "STRIPE" | "CASH";
  tipAmount: number;
  discount: number;
  promoCode: string | null;
  total: number;
  scheduledFor: string | null;
  createdAt: string;
  estimatedReadyAt: string | null;
  rejectionReason: string | null;
  deliveryAddress: string | null;
  deliveryAddressDetails: Record<string, unknown> | null;
  items: OrderItem[];
  customer: OrderCustomer | null;
}

export interface OrdersResponse {
  orders: Order[];
  total: number;
}
