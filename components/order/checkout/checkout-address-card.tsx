"use client";

import { MapPin, Store } from "lucide-react";

import { getAddressLabelIcon } from "@/lib/address/label-icon";
import { useTranslations } from "next-intl";

import { useTenant } from "@/components/tenant-provider";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export function CheckoutAddressCard() {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const orderType = useCheckoutStore((s) => s.orderType);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const openDialog = useDialogStore((s) => s.openDialog);

  if (orderType === "PICKUP") {
    return (
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {t("pickupLocation")}
        </h3>
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
          <div
            className="size-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor:
                "var(--brand-primary, hsl(var(--primary)))",
            }}
          >
            <Store className="size-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{tenant.name}</p>
            <p className="text-xs text-muted-foreground">
              {t("readyIn", { minutes: tenant.prepTimeMinutes })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // DELIVERY
  return (
    <div className="px-4 pb-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t("deliveryAddress")}
      </h3>
      <button
        type="button"
        onClick={() => openDialog("address-manager")}
        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
          selectedAddress
            ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
            : "border-destructive/50 bg-destructive/5"
        }`}
      >
        <div
          className="size-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            backgroundColor: selectedAddress
              ? "var(--brand-primary, hsl(var(--primary)))"
              : "hsl(var(--destructive))",
          }}
        >
          {selectedAddress
            ? getAddressLabelIcon(selectedAddress.label, "size-5 text-white")
            : <MapPin className="size-5 text-white" />
          }
        </div>
        <div className="min-w-0 flex-1">
          {selectedAddress ? (
            <>
              <p className="text-sm font-semibold">{selectedAddress.label}</p>
              <p className="text-xs text-muted-foreground truncate">
                {selectedAddress.street}
                {selectedAddress.city ? `, ${selectedAddress.city}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-destructive">
                {t("noAddressSelected")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("tapToSelectAddress")}
              </p>
            </>
          )}
        </div>
        <span
          className="text-xs font-semibold shrink-0"
          style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
        >
          {selectedAddress ? t("change") : t("select")}
        </span>
      </button>
    </div>
  );
}
