"use client";

import { Banknote, Check, CreditCard } from "lucide-react";
import { useTranslations } from "next-intl";

import { dialogPanelHeaderClass, DialogTitle } from "@/components/ui/dialog";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export const PAYMENT_MODAL = "payment-modal";

export const PaymentModalContent = () => {
  const t = useTranslations("Checkout");
  const paymentMethod = useCheckoutStore((s) => s.paymentMethod);
  const setPaymentMethod = useCheckoutStore((s) => s.setPaymentMethod);
  const closeDialog = useDialogStore((s) => s.goBack);

  const handleSelect = (method: "CASH" | "STRIPE") => {
    setPaymentMethod(method);
    closeDialog();
  };

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* Header */}
      <div className={dialogPanelHeaderClass}>
        <DialogTitle className="text-lg font-bold text-foreground">
          {t("paymentMethod")}
        </DialogTitle>
      </div>

      <div className="px-5 pb-6 space-y-2">
        {/* Cash option */}
        <button
          type="button"
          onClick={() => handleSelect("CASH")}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
            paymentMethod === "CASH"
              ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
              : "border-border/50 hover:border-border"
          }`}
        >
          <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <Banknote className="size-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("cash")}</p>
            <p className="text-xs text-muted-foreground">{t("payAtPickup")}</p>
          </div>
          {paymentMethod === "CASH" && (
            <div
              className="size-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--brand-primary, hsl(var(--primary)))",
              }}
            >
              <Check className="size-3.5 text-white" />
            </div>
          )}
        </button>

        {/* Card option */}
        <button
          type="button"
          onClick={() => handleSelect("STRIPE")}
          className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
            paymentMethod === "STRIPE"
              ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
              : "border-border/50 hover:border-border"
          }`}
        >
          <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <CreditCard className="size-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t("card")}</p>
            <p className="text-xs text-muted-foreground">{t("cardBrands")}</p>
          </div>
          {paymentMethod === "STRIPE" && (
            <div
              className="size-6 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--brand-primary, hsl(var(--primary)))",
              }}
            >
              <Check className="size-3.5 text-white" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
};
