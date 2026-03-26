"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutTipChips() {
  const t = useTranslations("Checkout");
  const tipOption = useCheckoutStore((s) => s.tipOption);
  const customTipValue = useCheckoutStore((s) => s.customTipValue);
  const setTipOption = useCheckoutStore((s) => s.setTipOption);
  const setCustomTipValue = useCheckoutStore((s) => s.setCustomTipValue);

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2 mb-3">
        <Heart
          className="size-4"
          style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
        />
        <div>
          <h3 className="text-sm font-semibold">{t("tip")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("tipDescription")}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {(
          ["none", "50", "100", "150", "200", "custom"] as const
        ).map((opt) => {
          const isActive = tipOption === opt;
          const fixedLabels: Record<string, string> = {
            "50": "0.50",
            "100": "1.00",
            "150": "1.50",
            "200": "2.00",
          };
          const labelMap: Record<string, string> = {
            none: t("noTip"),
            custom: t("customTip"),
            ...fixedLabels,
          };
          const label = labelMap[opt] || opt;

          return (
            <button
              key={opt}
              type="button"
              onClick={() => setTipOption(opt)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 border cursor-pointer active:scale-[0.97] ${
                isActive
                  ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/10 text-foreground"
                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tipOption === "custom" && (
        <div className="mt-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
              EUR
            </span>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.50"
              placeholder={t("tipCustomPlaceholder")}
              value={customTipValue}
              onChange={(e) => setCustomTipValue(e.target.value)}
              className="h-11 rounded-xl bg-muted/30 border-border/50 pl-12"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
