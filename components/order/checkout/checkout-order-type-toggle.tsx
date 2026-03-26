"use client";

import { Bike, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutOrderTypeToggle() {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const orderType = useCheckoutStore((s) => s.orderType);
  const setOrderType = useCheckoutStore((s) => s.setOrderType);

  if (!tenant.deliveryEnabled) return null;

  return (
    <div className="px-4 py-4">
      <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOrderType("DELIVERY")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold h-auto ${
            orderType === "DELIVERY"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bike className="size-4" />
          {t("delivery")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setOrderType("PICKUP")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold h-auto ${
            orderType === "PICKUP"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Store className="size-4" />
          {t("pickup")}
        </Button>
      </div>
    </div>
  );
}
