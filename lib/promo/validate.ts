import type { PromoCode } from "@prisma/client";

import { prisma } from "@/lib/db";

export interface PromoValidationResult {
  valid: true;
  promo: PromoCode;
  discount: number;
}

export interface PromoValidationError {
  valid: false;
  error: string;
  minOrder?: number;
}

/**
 * Fetch and validate a promo code (active, dates, global usage limits, min order).
 * Does NOT check per-user limits — caller is responsible for that.
 */
export async function validatePromoCode(
  tenantId: string,
  code: string,
  subtotal: number
): Promise<PromoValidationResult | PromoValidationError> {
  const promo = await prisma.promoCode.findUnique({
    where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
  });

  if (!promo || !promo.isActive) {
    return { valid: false, error: "Invalid promo code" };
  }

  const now = new Date();
  if (promo.startDate && now < promo.startDate) {
    return { valid: false, error: "This promo code is not yet active" };
  }
  if (promo.endDate && now > promo.endDate) {
    return { valid: false, error: "This promo code has expired" };
  }

  if (promo.maxUses && promo.usesCount >= promo.maxUses) {
    return { valid: false, error: "This promo code has reached its usage limit" };
  }

  if (promo.minOrder > 0 && subtotal < promo.minOrder) {
    return {
      valid: false,
      error: `Minimum order of ${(promo.minOrder / 100).toFixed(2)} EUR required`,
      minOrder: promo.minOrder,
    };
  }

  // Calculate discount
  let discount: number;
  if (promo.type === "PERCENTAGE") {
    discount = Math.round((subtotal * promo.value) / 100);
    if (promo.maxDiscount && discount > promo.maxDiscount) discount = promo.maxDiscount;
  } else {
    discount = promo.value;
  }
  discount = Math.min(discount, subtotal);

  return { valid: true, promo, discount };
}
