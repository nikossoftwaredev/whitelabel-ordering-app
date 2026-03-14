import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  nameEl: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().int().min(0),
  categoryId: z.string().cuid(),
  image: z.string().url().optional().nullable(),
  isVegan: z.boolean().optional().default(false),
  isVegetarian: z.boolean().optional().default(false),
  isGlutenFree: z.boolean().optional().default(false),
  isDairyFree: z.boolean().optional().default(false),
  containsNuts: z.boolean().optional().default(false),
  isSpicy: z.boolean().optional().default(false),
  allergens: z.string().max(500).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();
