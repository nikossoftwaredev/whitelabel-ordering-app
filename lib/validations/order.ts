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
  isPreset: z.boolean().optional().default(false),
  presetName: z.string().max(100).optional(),
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
  tipAmount: z.number().int().min(0).max(100_00).optional().default(0),
  scheduledFor: z.string().datetime().optional(),
  promoCode: z.string().max(50).optional(),
  couponIds: z.array(z.string().cuid()).max(5).optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  deliveryAddressDetails: z.object({
    street: z.string(),
    city: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    locationType: z.string().nullable().optional(),
    floor: z.string().nullable().optional(),
    apartmentNumber: z.string().nullable().optional(),
    companyName: z.string().nullable().optional(),
    entrance: z.string().nullable().optional(),
    accessDetails: z.string().nullable().optional(),
    deliveryInstructions: z.string().nullable().optional(),
  }).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
