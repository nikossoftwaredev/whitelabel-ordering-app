"use client";

import { ChevronRight, MapPin, Store } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { useTenant } from "@/components/tenant-provider";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function staticMapUrl(lat: number, lng: number) {
  const center = `${lat},${lng}`;
  return (
    `https://maps.googleapis.com/maps/api/staticmap` +
    `?center=${center}&zoom=15&size=144x144&scale=2` +
    `&markers=color:red|${center}` +
    `&key=${MAPS_KEY}`
  );
}

export function CheckoutAddressCard() {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const orderType = useCheckoutStore((s) => s.orderType);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const openDialog = useDialogStore((s) => s.openDialog);

  if (orderType === "PICKUP") {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
          <div
            className="size-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}
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

  const hasCoords =
    selectedAddress?.lat != null && selectedAddress?.lng != null;

  return (
    <div className="px-4 pb-4">
      <button
        type="button"
        onClick={() => openDialog("address-manager")}
        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-300 text-left ${
          selectedAddress
            ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
            : "border-destructive/50 bg-destructive/5"
        }`}
      >
        {/* Map thumbnail */}
        {hasCoords ? (
          <Image
            src={staticMapUrl(selectedAddress!.lat!, selectedAddress!.lng!)}
            alt="map"
            width={72}
            height={72}
            unoptimized
            className="size-18 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className={`size-18 rounded-xl flex items-center justify-center shrink-0 ${
              selectedAddress ? "bg-muted" : "bg-destructive/10"
            }`}
          >
            <MapPin
              className={`size-6 ${
                selectedAddress ? "text-muted-foreground" : "text-destructive"
              }`}
            />
          </div>
        )}

        {/* Text */}
        <div className="min-w-0 flex-1">
          {selectedAddress ? (
            <>
              <p className="text-sm font-semibold leading-tight">
                {selectedAddress.street}
              </p>
              {selectedAddress.city && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedAddress.city}
                </p>
              )}
              {(selectedAddress.floor || selectedAddress.apartmentNumber) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[selectedAddress.floor, selectedAddress.apartmentNumber]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-destructive">
                {t("noAddressSelected")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("tapToSelectAddress")}
              </p>
            </>
          )}
        </div>

        <ChevronRight className="size-5 text-muted-foreground shrink-0" />
      </button>
    </div>
  );
}
