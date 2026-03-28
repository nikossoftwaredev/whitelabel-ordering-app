"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

  const [open, setOpen] = useState(false);

  const tipAmount = computeTip();
  const promoDiscount = appliedPromo?.discount ?? 0;
  const couponDiscount = selectedCoupons.reduce((sum, c) => sum + c.discount, 0);
  const groupDiscountAmount = groupDiscount?.discount ?? 0;
  const totalDiscount = promoDiscount + couponDiscount + groupDiscountAmount;
  const orderTotal = Math.max(0, subtotal - totalDiscount) + tipAmount;

  return (
    <>
      {/* Collapsed total row */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold">{t("summary")}</span>
          <span className="text-base font-bold tabular-nums">
            {formatPrice(orderTotal)}
          </span>
        </div>

        {/* Analysis trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          {t("orderAnalysis")}
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* Bottom sheet breakdown */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-10">
          <SheetHeader>
            <SheetTitle>{t("orderAnalysis")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-6">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("itemSubtotal")}</span>
              <span className="tabular-nums font-medium">{formatPrice(subtotal)}</span>
            </div>

            {/* Promo discount */}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>{t("promoDiscount")}</span>
                <span className="tabular-nums font-medium">-{formatPrice(promoDiscount)}</span>
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
                <span className="tabular-nums font-medium">-{formatPrice(couponDiscount)}</span>
              </div>
            )}

            {/* Group discount */}
            {groupDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>
                  {t("groupDiscount")}
                  {groupDiscount?.groupName ? ` (${groupDiscount.groupName})` : ""}
                </span>
                <span className="tabular-nums font-medium">-{formatPrice(groupDiscountAmount)}</span>
              </div>
            )}

            {/* Tip */}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("tipAmount")}</span>
                <span className="tabular-nums font-medium">{formatPrice(tipAmount)}</span>
              </div>
            )}

            {/* Table */}
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
                <span className="tabular-nums font-medium text-muted-foreground">{t("tbd")}</span>
              </div>
            )}

            {/* Divider + Total */}
            <div className="border-t border-border/50 pt-3 flex justify-between">
              <span className="text-base font-bold">{t("summary")}</span>
              <span className="text-base font-bold tabular-nums">{formatPrice(orderTotal)}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
