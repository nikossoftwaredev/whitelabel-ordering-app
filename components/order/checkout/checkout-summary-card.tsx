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
import { useOrderTotal } from "@/hooks/use-order-total";
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
  const orderType = useCheckoutStore((s) => s.orderType);
  const tableNumber = useCheckoutStore((s) => s.tableNumber);
  const { tipAmount, totalDiscount, orderTotal } = useOrderTotal();

  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="px-4 pb-2">
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

        <div className="flex items-center gap-3 py-1">
          <IconCell>
            <FileText className="size-4 text-muted-foreground" />
          </IconCell>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">{t("orderTotal")}</span>
              <span className="text-base font-bold tabular-nums">
                {formatPrice(orderTotal)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 mt-0.5"
            >
              {t("orderAnalysis")}
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[85vh] overflow-y-auto pb-10"
        >
          <SheetHeader>
            <SheetTitle>{t("orderAnalysis")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-0 mb-4">
            {items.map((item, index) => (
              <div key={item.cartItemId}>
                <div className="flex items-start gap-3 py-3">
                  <span className="size-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {item.quantity}
                  </span>
                  <span className="flex-1 text-sm font-medium leading-snug">
                    {item.productName}
                    {item.modifiers.length > 0 && (
                      <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </span>
                    )}
                  </span>
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

          <div className="space-y-2.5 pb-4">
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

            {/* Aggregated — shown instead of per-source discount rows */}
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
