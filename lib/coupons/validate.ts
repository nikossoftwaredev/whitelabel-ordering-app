import type { Coupon } from "@prisma/client";

export interface CouponValidationResult {
  valid: true;
  coupon: Coupon;
  discount: number;
}

export interface CouponValidationError {
  valid: false;
  error: string;
}

/**
 * Validate a single coupon for a customer.
 * Checks: ownership, active, not used, not expired, min order.
 * Returns the calculated discount amount in cents.
 */
export function validateCoupon(
  coupon: Coupon,
  customerId: string,
  subtotal: number,
): CouponValidationResult | CouponValidationError {
  if (coupon.customerId !== customerId) {
    return { valid: false, error: "This coupon does not belong to you" };
  }

  if (!coupon.isActive) {
    return { valid: false, error: "This coupon has been revoked" };
  }

  if (coupon.isUsed) {
    return { valid: false, error: "This coupon has already been used" };
  }

  // Expiry: null means no expiry
  if (coupon.expiresAt !== null && coupon.expiresAt < new Date()) {
    return { valid: false, error: "This coupon has expired" };
  }

  if (coupon.minOrder && subtotal < coupon.minOrder) {
    return {
      valid: false,
      error: `Minimum order of ${(coupon.minOrder / 100).toFixed(2)} EUR required`,
    };
  }

  // Calculate discount
  let discount: number;
  if (coupon.type === "PERCENTAGE") {
    discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.value;
  }
  discount = Math.min(discount, subtotal);

  return { valid: true, coupon, discount };
}

/**
 * Generate a unique coupon code like "LOYAL-X8K2" or "GIFT-9P3M".
 */
export function generateCouponCode(prefix: string = "LOYAL"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 for readability
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${code}`;
}

/**
 * Compute the expiration date for a coupon, or null if no expiry.
 */
export function computeExpiresAt(noExpiry: boolean, validDays: number): Date | null {
  if (noExpiry) return null;
  const d = new Date();
  d.setDate(d.getDate() + validDays);
  return d;
}
