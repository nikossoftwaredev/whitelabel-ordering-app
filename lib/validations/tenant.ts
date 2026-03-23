import { z } from "zod";

export const updateTenantSettingsSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  prepTimeMinutes: z.number().int().min(1).max(480).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(50).optional(),
});

export const updateTenantConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  description: z.string().max(500).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  coverImage: z.string().url().optional().nullable(),
  pwaName: z.string().max(100).optional(),
  pwaShortName: z.string().max(12).optional(),
  pwaThemeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  pwaBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
