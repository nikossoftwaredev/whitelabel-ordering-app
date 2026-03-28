"use client";

import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function useOrderTotal() {
  const subtotal = useCartStore((s) => s.subtotal());
  const appliedPromo = useCheckoutStore((s) => s.appliedPromo);
  const selectedCoupons = useCheckoutStore((s) => s.selectedCoupons);
  const groupDiscount = useCheckoutStore((s) => s.groupDiscount);
  const computeTip = useCheckoutStore((s) => s.computeTip);

  const tipAmount = computeTip();
  const promoDiscount = appliedPromo?.discount ?? 0;
  const couponDiscount = selectedCoupons.reduce((sum, c) => sum + c.discount, 0);
  const groupDiscountAmount = groupDiscount?.discount ?? 0;
  const totalDiscount = promoDiscount + couponDiscount + groupDiscountAmount;
  const orderTotal = Math.max(0, subtotal - totalDiscount) + tipAmount;

  return { subtotal, tipAmount, promoDiscount, couponDiscount, groupDiscountAmount, totalDiscount, orderTotal };
}
