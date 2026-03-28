# Checkout UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Polish the checkout screen with a map-thumbnail address card, collapsed order summary with a bottom-sheet breakdown, and a legal/allergen footer band above the submit button.

**Architecture:** Three self-contained component edits — no new files, no new API routes, no new stores. Each task is independently verifiable via screenshot.

**Tech Stack:** Next.js, React, Tailwind CSS 4, shadcn/ui (`Sheet`, `Popover`), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (already in `.env`), next-intl.

---

## Task 1: Address card — map thumbnail layout

**Files:**
- Modify: `components/order/checkout/checkout-address-card.tsx`
- Modify: `messages/en.json` (add keys)
- Modify: `messages/el.json` (add keys)

**Context:**
The current delivery address card shows an icon circle + text + "Change" label. Replace with an efood-style layout: map thumbnail on the left, address text on the right, ChevronRight on the far right.

Map thumbnail URL (Google Maps Static API, already have key):
```
https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size=144x144&scale=2&markers=color:red|{lat},{lng}&key={NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
```

Use `next/image` with `unoptimized` prop (external URL). Size: 72×72px, `rounded-xl object-cover`.

Fallback when no address selected: gray `rounded-xl bg-muted` placeholder with centered `MapPin` icon.

**Step 1: Add translation keys**

In `messages/en.json`, inside `"Checkout"`:
```json
"orderAnalysis": "Order analysis",
"allergenInfo": "Allergen information",
"allergenNotice": "Our products may contain allergens. For a full list please contact the store.",
"legalText": "By placing your order you accept our {termsLink} and {privacyLink}.",
"termsOfService": "Terms of Service",
"privacyPolicy": "Privacy Policy",
"addressDetails": "{floor} · {apartment}"
```

In `messages/el.json`, inside `"Checkout"`:
```json
"orderAnalysis": "Ανάλυση παραγγελίας",
"allergenInfo": "Πληροφορίες αλλεργιογόνων",
"allergenNotice": "Τα προϊόντα μας ενδέχεται να περιέχουν αλλεργιογόνα. Για πλήρη λίστα επικοινωνήστε με το κατάστημα.",
"legalText": "Με την υποβολή της παραγγελίας αποδέχεσαι τους {termsLink} και την {privacyLink} μας.",
"termsOfService": "Όρους Χρήσης",
"privacyPolicy": "Πολιτική Απορρήτου",
"addressDetails": "{floor} · {apartment}"
```

**Step 2: Rewrite `checkout-address-card.tsx` delivery branch**

Replace the delivery `<button>` inner content. The full new file:

```tsx
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
            className="size-[72px] rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className={`size-[72px] rounded-xl flex items-center justify-center shrink-0 ${
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
```

**Step 3: Verify — screenshot**

Ensure `pnpm dev` is running, then:
```bash
node screenshot.mjs http://localhost:3000/en/order/checkout checkout-address
```
Read the PNG. Confirm:
- Map thumbnail shows when address with coords is selected
- Placeholder shows when no address
- Layout matches reference (thumbnail left, text middle, chevron right)

**Step 4: Commit**
```bash
git add components/order/checkout/checkout-address-card.tsx messages/en.json messages/el.json
git commit -m "feat: checkout address card with Google Maps static thumbnail"
```

---

## Task 2: Order summary — collapsed total + bottom-sheet breakdown

**Files:**
- Modify: `components/order/checkout/checkout-summary-card.tsx`

**Context:**
Replace the always-visible bordered card with two inline rows:
1. `Σύνολο πληρωμής` | `{total}` (bold)
2. `Ανάλυση παραγγελίας >` (small, muted) — tapping opens a shadcn `Sheet` (side=bottom) with the full breakdown.

`Sheet` and `SheetContent` etc. are already installed at `components/ui/sheet.tsx`.

**Step 1: Rewrite `checkout-summary-card.tsx`**

```tsx
"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function CheckoutSummaryCard() {
  const t = useTranslations("Checkout");
  const formatPrice = useFormatPrice();
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
      {/* Collapsed total row */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between py-2">
          <span className="text-base font-bold">{t("summary")}</span>
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

      {/* Bottom sheet breakdown */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle>{t("orderAnalysis")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-6">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("itemSubtotal")}</span>
              <span className="tabular-nums font-medium">{formatPrice(subtotal)}</span>
            </div>

            {/* Promo discount */}
            {promoDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>{t("promoDiscount")}</span>
                <span className="tabular-nums font-medium">-{formatPrice(promoDiscount)}</span>
              </div>
            )}

            {/* Coupon discount */}
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>
                  {t("couponDiscount")}
                  {selectedCoupons.length > 0
                    ? ` (${selectedCoupons.map((c) => c.code).join(", ")})`
                    : ""}
                </span>
                <span className="tabular-nums font-medium">-{formatPrice(couponDiscount)}</span>
              </div>
            )}

            {/* Group discount */}
            {groupDiscountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>
                  {t("groupDiscount")}
                  {groupDiscount?.groupName ? ` (${groupDiscount.groupName})` : ""}
                </span>
                <span className="tabular-nums font-medium">-{formatPrice(groupDiscountAmount)}</span>
              </div>
            )}

            {/* Tip */}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("tipAmount")}</span>
                <span className="tabular-nums font-medium">{formatPrice(tipAmount)}</span>
              </div>
            )}

            {/* Table */}
            {orderType === "DINE_IN" && tableNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("table")}</span>
                <span className="tabular-nums font-medium">{tableNumber}</span>
              </div>
            )}

            {/* Delivery fee */}
            {orderType === "DELIVERY" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("deliveryFee")}</span>
                <span className="tabular-nums font-medium text-muted-foreground">{t("tbd")}</span>
              </div>
            )}

            {/* Divider + Total */}
            <div className="border-t border-border/50 pt-3 flex justify-between">
              <span className="text-base font-bold">{t("summary")}</span>
              <span className="text-base font-bold tabular-nums">{formatPrice(orderTotal)}</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
```

**Step 2: Verify — screenshot**

```bash
node screenshot.mjs http://localhost:3000/en/order/checkout checkout-summary
```
Read the PNG. Confirm:
- Only "Σύνολο" row + "Ανάλυση παραγγελίας >" visible (no card box)
- Tapping "Ανάλυση" opens a bottom sheet with full breakdown
- Sheet closes on backdrop tap

**Step 3: Commit**
```bash
git add components/order/checkout/checkout-summary-card.tsx
git commit -m "feat: checkout summary collapsed to total row + order analysis bottom sheet"
```

---

## Task 3: Submit footer — legal text + allergen popover

**Files:**
- Modify: `components/order/checkout/checkout-submit-button.tsx`

**Context:**
Add a legal text band inside the fixed footer, above the submit button. The band shows:
- Left: info icon (ⓘ) that opens a `Popover` with allergen notice
- Right: "Με την υποβολή αποδέχεσαι τους **Όρους Χρήσης** και την **Πολιτική Απορρήτου** μας."

`Popover` is already installed at `components/ui/popover.tsx`.

The Terms / Privacy links use `href="#"` as placeholders (URLs to be configured later by the tenant admin).

**Step 1: Rewrite `checkout-submit-button.tsx`**

```tsx
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
```

**Step 2: Run lint + tsc**
```bash
pnpm lint && pnpm tsc --noEmit
```
Expected: no errors.

**Step 3: Verify — screenshot**

```bash
node screenshot.mjs http://localhost:3000/en/order/checkout checkout-footer
```
Read the PNG. Confirm:
- Legal text visible above button in fixed footer
- ⓘ icon present on the left
- Tapping ⓘ shows allergen popover
- Button layout unchanged

**Step 4: Commit**
```bash
git add components/order/checkout/checkout-submit-button.tsx
git commit -m "feat: checkout footer with legal text and allergen info popover"
```

---

## Final check

Run lint + tsc across everything:
```bash
pnpm lint && pnpm tsc --noEmit
```

Take a full-page screenshot:
```bash
node screenshot.mjs http://localhost:3000/en/order/checkout checkout-final
```

Verify all three changes look correct together.
