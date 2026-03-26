"use client";

import {
  Check,
  Gift,
  Loader2,
  Tag,
  Ticket,
  X,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { dialogPanelHeaderClass, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export const COUPON_MODAL = "coupon-modal";

interface CouponItem {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  description: string | null;
  expiresAt: string | null;
  isUsed: boolean;
  name?: string | null;
}

export const CouponModalContent = () => {
  const t = useTranslations("Checkout");
  const tenant = useTenant();
  const { data: session } = useSession();
  const formatPrice = useFormatPrice();
  const subtotal = useCartStore((s) => s.subtotal)();

  const selectedCoupons = useCheckoutStore((s) => s.selectedCoupons);
  const setSelectedCoupons = useCheckoutStore((s) => s.setSelectedCoupons);
  const appliedPromo = useCheckoutStore((s) => s.appliedPromo);
  const setAppliedPromo = useCheckoutStore((s) => s.setAppliedPromo);
  const promoInput = useCheckoutStore((s) => s.promoInput);
  const setPromoInput = useCheckoutStore((s) => s.setPromoInput);
  const promoLoading = useCheckoutStore((s) => s.promoLoading);
  const setPromoLoading = useCheckoutStore((s) => s.setPromoLoading);
  const promoError = useCheckoutStore((s) => s.promoError);
  const setPromoError = useCheckoutStore((s) => s.setPromoError);
  const removePromo = useCheckoutStore((s) => s.removePromo);
  const closeDialog = useDialogStore((s) => s.goBack);

  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSelectedCoupons, setLocalSelectedCoupons] = useState<CouponItem[]>([]);
  const [maxPerOrder, setMaxPerOrder] = useState(1);
  const [redeemMinOrder, setRedeemMinOrder] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const belowMinOrder = redeemMinOrder !== null && subtotal < redeemMinOrder;

  // Sync initial state from store
  useEffect(() => {
    if (selectedCoupons.length > 0) {
      setLocalSelectedCoupons(
        selectedCoupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          description: c.description,
          expiresAt: "",
          isUsed: false,
        })),
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const fetchCoupons = async () => {
      try {
        const res = await fetch(`/api/tenants/${tenant.slug}/coupons`);
        if (!res.ok) {
          if (mountedRef.current) setLoading(false);
          return;
        }
        const data = await res.json();
        if (mountedRef.current) {
          setCoupons(data.coupons ?? []);
          setMaxPerOrder(data.maxPerOrder ?? 1);
          setRedeemMinOrder(data.redeemMinOrder ?? null);
          setLoading(false);
        }
      } catch {
        if (mountedRef.current) setLoading(false);
      }
    };

    fetchCoupons();
  }, [session?.user, tenant.slug]);

  const validatePromoCode = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}/promo-codes/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoError(data.error || t("somethingWentWrong"));
        setAppliedPromo(null);
      } else {
        setAppliedPromo({ code: data.code, discount: data.discount });
        setPromoError("");
        // Clear coupon selection when promo is applied
        setLocalSelectedCoupons([]);
      }
    } catch {
      setPromoError(t("somethingWentWrong"));
    } finally {
      setPromoLoading(false);
    }
  };

  const handleSelectCoupon = (coupon: CouponItem) => {
    if (belowMinOrder) return;

    const isSelected = localSelectedCoupons.some((c) => c.id === coupon.id);

    if (isSelected) {
      // Deselect
      setLocalSelectedCoupons(localSelectedCoupons.filter((c) => c.id !== coupon.id));
    } else if (maxPerOrder === 1) {
      // Radio-style: replace selection
      setLocalSelectedCoupons([coupon]);
      if (appliedPromo) removePromo();
    } else {
      // Multi-select: add if under limit
      if (localSelectedCoupons.length < maxPerOrder) {
        setLocalSelectedCoupons([...localSelectedCoupons, coupon]);
        if (appliedPromo) removePromo();
      }
    }
  };

  const calculateCouponDiscount = (coupon: CouponItem) => {
    if (coupon.type === "FIXED") return coupon.value;
    // PERCENTAGE — value is whole number (e.g. 10 = 10%)
    return Math.round(subtotal * (coupon.value / 100));
  };

  const formatCouponValue = (coupon: CouponItem) => {
    if (coupon.type === "FIXED") return formatPrice(coupon.value);
    return `${coupon.value}%`;
  };

  const formatExpiryDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalCouponSavings = localSelectedCoupons.reduce(
    (sum, c) => sum + calculateCouponDiscount(c),
    0,
  );
  const totalSavings = totalCouponSavings > 0
    ? totalCouponSavings
    : appliedPromo?.discount ?? 0;

  const handleApply = () => {
    if (localSelectedCoupons.length > 0) {
      setSelectedCoupons(
        localSelectedCoupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          description: c.description,
          discount: calculateCouponDiscount(c),
        })),
      );
      // Clear any promo
      if (appliedPromo) removePromo();
    } else if (!appliedPromo) {
      // Neither coupon nor promo — clear everything
      setSelectedCoupons([]);
    }
    closeDialog();
  };

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* Header */}
      <div className={dialogPanelHeaderClass}>
        <DialogTitle className="text-lg font-bold text-foreground">
          {t("couponsAndPromos")}
        </DialogTitle>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
        {/* ═══ My Coupons ═══ */}
        {session?.user && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t("myCoupons")}
              </h3>
              {maxPerOrder > 1 && coupons.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {localSelectedCoupons.length}/{maxPerOrder}
                </span>
              )}
            </div>

            {belowMinOrder && coupons.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                {t("couponMinOrder", { amount: formatPrice(redeemMinOrder!) })}
              </p>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!loading && coupons.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="size-12 rounded-full bg-muted flex items-center justify-center">
                  <Ticket className="size-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">{t("noCoupons")}</p>
              </div>
            )}
            {!loading && coupons.length > 0 && (
              <div className="space-y-2">
                {coupons.map((coupon) => {
                  const isSelected = localSelectedCoupons.some((c) => c.id === coupon.id);
                  const discount = calculateCouponDiscount(coupon);
                  const isDisabled = belowMinOrder || (!isSelected && localSelectedCoupons.length >= maxPerOrder);

                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      onClick={() => handleSelectCoupon(coupon)}
                      disabled={isDisabled && !isSelected}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                        isDisabled && !isSelected
                          ? "border-border/30 opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <div
                        className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-green-500/10" : "bg-muted"
                        }`}
                      >
                        <Gift
                          className={`size-5 ${
                            isSelected ? "text-green-500" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate">
                            {coupon.name || coupon.description || coupon.code}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs font-bold"
                            style={{
                              color: "var(--brand-primary, hsl(var(--primary)))",
                            }}
                          >
                            -{formatCouponValue(coupon)} ({formatPrice(discount)})
                          </span>
                          {coupon.expiresAt ? (
                            <span className="text-xs text-muted-foreground">
                              {t("expires")} {formatExpiryDate(coupon.expiresAt)}
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {t("noExpiry")}
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          className="size-6 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor:
                              "var(--brand-primary, hsl(var(--primary)))",
                          }}
                        >
                          <Check className="size-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Promo Code ═══ */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("promoCode")}
          </h3>

          {appliedPromo ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-green-600" />
                <code className="font-mono font-bold text-sm">
                  {appliedPromo.code}
                </code>
                <span className="text-sm text-green-700 dark:text-green-400">
                  -{formatPrice(appliedPromo.discount)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 cursor-pointer"
                onClick={removePromo}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase());
                    setPromoError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      validatePromoCode();
                    }
                  }}
                  placeholder={t("promoCodePlaceholder")}
                  className="pl-10 font-mono uppercase"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={validatePromoCode}
                disabled={promoLoading || !promoInput.trim()}
                className="cursor-pointer"
              >
                {promoLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  t("promoApply")
                )}
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-xs text-destructive mt-1.5">{promoError}</p>
          )}
        </div>

        {/* ═══ Applied Savings Summary ═══ */}
        {totalSavings > 0 && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
            <Gift className="size-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              {t("totalSavings", { amount: formatPrice(totalSavings) })}
            </span>
          </div>
        )}
      </div>

      {/* Apply button */}
      <div className="px-5 py-4 border-t border-border shrink-0">
        <Button
          type="button"
          className="w-full h-12 rounded-xl text-base font-semibold cursor-pointer"
          style={{
            backgroundColor: "var(--brand-primary, hsl(var(--primary)))",
            color: "white",
          }}
          onClick={handleApply}
        >
          {t("promoApply")}
        </Button>
      </div>
    </div>
  );
};
