"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useStoreStatus } from "@/hooks/use-store-status";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

interface CheckoutSubmitButtonProps {
  orderTotal: number;
}

export function CheckoutSubmitButton({ orderTotal }: CheckoutSubmitButtonProps) {
  const t = useTranslations("Checkout");
  const formatPrice = useFormatPrice();
  const isSubmitting = useCheckoutStore((s) => s.isSubmitting);
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const { isClosed: storeClosed } = useStoreStatus();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 space-y-3">
        {/* Legal band */}
        <div className="flex items-start gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
                aria-label={t("allergenInfo")}
              >
                <Info className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="max-w-xs text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">{t("allergenInfo")}</p>
              <p>{t("allergenNotice")}</p>
            </PopoverContent>
          </Popover>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t.rich("legalText", {
              termsLink: (chunks) => (
                <a
                  href="#"
                  className="font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {chunks}
                </a>
              ),
              privacyLink: (chunks) => (
                <a
                  href="#"
                  className="font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>

        {/* Submit button */}
        <Button
          variant="brand"
          type="submit"
          form="checkout-form"
          disabled={storeClosed}
          loading={isSubmitting}
          className="w-full flex items-center h-13 px-5 rounded-2xl font-semibold text-[15px]"
        >
          {isSubmitting ? (
            <span>{t("placingOrder")}</span>
          ) : (
            <>
              <span className="flex-1 text-left">
                {paymentMethod === "STRIPE" ? t("payWithCard") : t("placeOrder")}
              </span>
              <span className="font-bold tabular-nums">{formatPrice(orderTotal)}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
