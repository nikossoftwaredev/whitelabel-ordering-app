import { z } from "zod";

export const orderItemModifierSchema = z.object({
  modifierOptionId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99).optional().default(1),
});

export const orderItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(99),
  modifiers: z.array(orderItemModifierSchema).optional().default([]),
  notes: z.string().max(500).optional().default(""),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  orderType: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(5).max(20),
  customerEmail: z.string().email().optional(),
  notes: z.string().max(1000).optional().default(""),
  paymentMethod: z.enum(["STRIPE", "CASH"]),
  deliveryAddress: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
