"use client";

import { Banknote, ChevronRight, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export function CheckoutPaymentCard() {
  const t = useTranslations("Checkout");
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const openDialog = useDialogStore((s) => s.openDialog);

  const isCash = paymentMethod === "CASH";

  return (
    <button
      type="button"
      onClick={() => openDialog("payment-modal")}
      className="flex-2 flex items-center gap-2.5 p-3.5 rounded-xl border-2 border-border/50 hover:border-border transition-all duration-200 text-left cursor-pointer"
    >
      <div
        className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
          isCash ? "bg-green-500/10" : "bg-blue-500/10"
        }`}
      >
        {isCash ? (
          <Banknote className="size-4 text-green-500" />
        ) : (
          <CreditCard className="size-4 text-blue-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{t("paymentMethod")}</p>
        <p className="text-sm font-semibold truncate">
          {isCash ? t("cash") : t("card")}
        </p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
    </button>
  );
}
