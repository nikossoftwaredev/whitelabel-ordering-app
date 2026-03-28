"use client";

import {
  ChevronRight,
  FileText,
  ShoppingBag,
  Tag,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function IconCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="size-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
      {children}
    </div>
  );
}

export function CheckoutSummaryCard() {
  const t = useTranslations("Checkout");
  const formatPrice = useFormatPrice();
  const items = useCartStore((s) => s.items);
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
      {/* Collapsed rows */}
      <div className="px-4 pb-2">
        {/* Discount row — always visible when there's a discount */}
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-green-600 dark:text-green-400">
              {t("totalDiscount")}
            </span>
            <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
              -{formatPrice(totalDiscount)}
            </span>
          </div>
        )}

        {/* Total row */}
        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold">{t("orderTotal")}</span>
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

      {/* Bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-10"
        >
          <SheetHeader>
            <SheetTitle>{t("orderAnalysis")}</SheetTitle>
          </SheetHeader>

          {/* Cart items */}
          <div className="space-y-0 mb-4">
            {items.map((item, index) => (
              <div key={item.cartItemId}>
                <div className="flex items-start gap-3 py-3">
                  {/* Quantity badge */}
                  <span className="size-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {item.quantity}
                  </span>
                  {/* Name */}
                  <span className="flex-1 text-sm font-medium leading-snug">
                    {item.productName}
                    {item.modifiers.length > 0 && (
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </span>
                    )}
                  </span>
                  {/* Price */}
                  <span className="text-sm font-semibold tabular-nums shrink-0">
                    {formatPrice(item.totalPrice)}
                  </span>
                </div>
                {index < items.length - 1 && (
                  <Separator className="opacity-40" />
                )}
              </div>
            ))}
          </div>

          <Separator className="mb-4" />

          {/* Fee rows with icons */}
          <div className="space-y-2.5 pb-4">
            {/* Delivery fee */}
            {orderType === "DELIVERY" && (
              <div className="flex items-center gap-3">
                <IconCell>
                  <ShoppingBag className="size-4 text-muted-foreground" />
                </IconCell>
                <span className="flex-1 text-sm text-muted-foreground">
                  {t("deliveryFee")}
                </span>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {t("tbd")}
                </span>
              </div>
            )}

            {/* Tip */}
            {tipAmount > 0 && (
              <div className="flex items-center gap-3">
                <IconCell>
                  <UtensilsCrossed className="size-4 text-muted-foreground" />
                </IconCell>
                <span className="flex-1 text-sm text-muted-foreground">
                  {t("tipAmount")}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {formatPrice(tipAmount)}
                </span>
              </div>
            )}

            {/* Table */}
            {orderType === "DINE_IN" && tableNumber && (
              <div className="flex items-center gap-3">
                <IconCell>
                  <UtensilsCrossed className="size-4 text-muted-foreground" />
                </IconCell>
                <span className="flex-1 text-sm text-muted-foreground">
                  {t("table")}
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {tableNumber}
                </span>
              </div>
            )}

            {/* Total discount — aggregated, always shown if > 0 */}
            {totalDiscount > 0 && (
              <div className="flex items-center gap-3">
                <IconCell>
                  <Tag className="size-4 text-green-600 dark:text-green-400" />
                </IconCell>
                <span className="flex-1 text-sm text-green-600 dark:text-green-400">
                  {t("totalDiscount")}
                </span>
                <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                  -{formatPrice(totalDiscount)}
                </span>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center gap-3 pt-1">
              <IconCell>
                <FileText className="size-4 text-muted-foreground" />
              </IconCell>
              <span className="flex-1 text-base font-bold">{t("orderTotal")}</span>
              <span className="text-base font-bold tabular-nums">
                {formatPrice(orderTotal)}
              </span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
