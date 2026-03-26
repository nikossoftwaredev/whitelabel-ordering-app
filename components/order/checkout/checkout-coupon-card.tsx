"use client";

import { Tag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export function CheckoutCouponCard() {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const { data: session } = useSession();
  const selectedCoupon = useCheckoutStore((s) => s.selectedCoupon);
  const appliedPromo = useCheckoutStore((s) => s.appliedPromo);
  const openDialog = useDialogStore((s) => s.openDialog);

  const [couponCount, setCouponCount] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.slug}/coupons`);
        if (!res.ok) return;
        const data = await res.json();
        if (mountedRef.current) {
          setCouponCount(data.coupons?.length ?? 0);
        }
      } catch {
        // Silently fail — badge just won't show
      }
    };

    fetchCount();
  }, [session?.user, tenant.slug]);

  const hasSelection = !!selectedCoupon || !!appliedPromo;

  return (
    <button
      type="button"
      onClick={() => openDialog("coupon-modal")}
      className={`relative flex-1 flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
        hasSelection
          ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
          : "border-border/50 hover:border-border"
      }`}
    >
      <div
        className="size-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          backgroundColor: hasSelection
            ? "var(--brand-primary, hsl(var(--primary)))"
            : "hsl(var(--muted))",
        }}
      >
        <Tag
          className="size-4"
          style={{
            color: hasSelection ? "white" : "var(--muted-foreground)",
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{t("coupon")}</p>
        {hasSelection && (
          <p className="text-xs text-muted-foreground truncate">
            {selectedCoupon ? selectedCoupon.code : appliedPromo?.code}
          </p>
        )}
      </div>

      {/* Badge with available count */}
      {couponCount > 0 && !hasSelection && (
        <span className="absolute -top-1.5 -right-1.5 size-5 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
          {couponCount}
        </span>
      )}
    </button>
  );
}
