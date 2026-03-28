"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
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
      <div className="max-w-2xl mx-auto px-4 pt-3 pb-4">
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

