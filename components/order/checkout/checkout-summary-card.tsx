"use client";

import { useTranslations } from "next-intl";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutSummaryCard() {
  const t = useTranslations("Checkout");
  const formatPrice = useFormatPrice();
  const subtotal = useCartStore((s) => s.subtotal());
  const orderType = useCheckoutStore((s) => s.orderType);
  const tableNumber = useCheckoutStore((s) => s.tableNumber);
  const appliedPromo = useCheckoutStore((s) => s.appliedPromo);
  const selectedCoupons = useCheckoutStore((s) => s.selectedCoupons);
  const groupDiscount = useCheckoutStore((s) => s.groupDiscount);
  const computeTip = useCheckoutStore((s) => s.computeTip);

  const tipAmount = computeTip();
  const promoDiscount = appliedPromo?.discount ?? 0;
  const couponDiscount = selectedCoupons.reduce((sum, c) => sum + c.discount, 0);
  const groupDiscountAmount = groupDiscount?.discount ?? 0;
  const orderTotal = Math.max(0, subtotal - promoDiscount - couponDiscount - groupDiscountAmount) + tipAmount;

  return (
    <div className="px-4 pb-6">
      <div className="rounded-xl border border-border/50 p-4 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("itemSubtotal")}</span>
          <span className="tabular-nums font-medium">
            {formatPrice(subtotal)}
          </span>
        </div>

        {/* Promo discount */}
        {promoDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>{t("promoDiscount")}</span>
            <span className="tabular-nums font-medium">
              -{formatPrice(promoDiscount)}
            </span>
          </div>
        )}

        {/* Coupon discount */}
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>
              {t("couponDiscount")}
              {selectedCoupons.length > 0
                ? ` (${selectedCoupons.map((c) => c.code).join(", ")})`
                : ""}
            </span>
            <span className="tabular-nums font-medium">
              -{formatPrice(couponDiscount)}
            </span>
          </div>
        )}

        {/* Group discount */}
        {groupDiscountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
            <span>
              {t("groupDiscount")}
              {groupDiscount?.groupName ? ` (${groupDiscount.groupName})` : ""}
            </span>
            <span className="tabular-nums font-medium">
              -{formatPrice(groupDiscountAmount)}
            </span>
          </div>
        )}

        {/* Tip */}
        {tipAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("tipAmount")}</span>
            <span className="tabular-nums font-medium">
              {formatPrice(tipAmount)}
            </span>
          </div>
        )}

        {/* Table number */}
        {orderType === "DINE_IN" && tableNumber && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("table")}</span>
            <span className="tabular-nums font-medium">{tableNumber}</span>
          </div>
        )}

        {/* Delivery fee */}
        {orderType === "DELIVERY" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("deliveryFee")}</span>
            <span className="tabular-nums font-medium text-muted-foreground">
              {t("tbd")}
            </span>
          </div>
        )}

        {/* Total */}
        <div className="border-t border-border/50 pt-2 mt-2 flex justify-between">
          <span className="text-base font-bold">{t("summary")}</span>
          <span className="text-base font-bold tabular-nums">
            {formatPrice(orderTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
