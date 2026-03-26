"use client";

import { ChevronDown, Phone, User } from "lucide-react";
import { useTranslations } from "next-intl";

import { PhoneInput } from "@/components/phone-input";
import { Input } from "@/components/ui/input";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

export function CheckoutPersonalDetails() {
  const t = useTranslations("Checkout");
  const customerName = useCheckoutStore((s) => s.customerName);
  const customerPhone = useCheckoutStore((s) => s.customerPhone);
  const customerEmail = useCheckoutStore((s) => s.customerEmail);
  const detailsExpanded = useCheckoutStore((s) => s.detailsExpanded);
  const setCustomerName = useCheckoutStore((s) => s.setCustomerName);
  const setCustomerPhone = useCheckoutStore((s) => s.setCustomerPhone);
  const setCustomerEmail = useCheckoutStore((s) => s.setCustomerEmail);
  const setDetailsExpanded = useCheckoutStore((s) => s.setDetailsExpanded);

  return (
    <div className="px-4 pb-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        {t("yourDetails")}
      </h3>

      {!detailsExpanded ? (
        /* Collapsed: name with user icon, phone with phone icon */
        <button
          type="button"
          onClick={() => setDetailsExpanded(true)}
          className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 transition-all duration-300 text-left"
        >
          <div className="flex-1 flex items-center justify-center gap-5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium truncate">
                {customerName.trim() || t("fullNamePlaceholder")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <Phone className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium truncate">
                {customerPhone.trim() || t("phonePlaceholder")}
              </span>
            </div>
          </div>
          <span
            className="text-xs font-semibold shrink-0"
            style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
          >
            {t("edit")}
          </span>
        </button>
      ) : (
        /* Expanded input fields */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setDetailsExpanded(false)}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className="size-3.5 rotate-180" />
              {t("done")}
            </button>
          </div>
          <Input
            placeholder={t("fullNamePlaceholder")}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            className="h-11 rounded-xl bg-muted/30 border-border/50"
          />
          <PhoneInput
            value={customerPhone}
            onChange={setCustomerPhone}
            placeholder={t("phonePlaceholder")}
            required
            className="[&_button]:h-11 [&_button]:rounded-l-xl [&_button]:bg-muted/30 [&_button]:border-border/50 [&_input]:h-11 [&_input]:rounded-r-xl [&_input]:bg-muted/30 [&_input]:border-border/50"
          />
          <Input
            type="email"
            placeholder={t("emailOptionalPlaceholder")}
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="h-11 rounded-xl bg-muted/30 border-border/50"
          />
        </div>
      )}
    </div>
  );
}
