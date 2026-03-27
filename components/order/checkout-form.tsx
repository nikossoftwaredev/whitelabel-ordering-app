"use client";

import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SignInForm } from "@/components/auth/signin-form";
import { PhoneInput } from "@/components/phone-input";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFormatPrice } from "@/hooks/use-format-price";
import { calculateBestGroupDiscount } from "@/lib/groups/discount";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { useCheckoutStore } from "@/lib/stores/checkout-store";

import { CheckoutAddressCard } from "./checkout/checkout-address-card";
import { CheckoutCommentRow } from "./checkout/checkout-comment-row";
import { CheckoutCouponCard } from "./checkout/checkout-coupon-card";
import { CheckoutItemsList } from "./checkout/checkout-items-list";
import { CheckoutOrderTypeToggle } from "./checkout/checkout-order-type-toggle";
import { CheckoutPaymentCard } from "./checkout/checkout-payment-card";
import { CheckoutPersonalDetails } from "./checkout/checkout-personal-details";
import { CheckoutScheduleCard } from "./checkout/checkout-schedule-card";
import { CheckoutSubmitButton } from "./checkout/checkout-submit-button";
import { CheckoutSummaryCard } from "./checkout/checkout-summary-card";
import { CheckoutTipChips } from "./checkout/checkout-tip-chips";

const StripePayment = dynamic(
  () => import("./stripe-payment").then((m) => m.StripePayment),
  {
    ssr: false,
    loading: () => <div className="h-12 animate-pulse bg-muted rounded-2xl" />,
  },
);

export const CheckoutForm = () => {
  const t = useTranslations("Checkout");
  const { data: session, status } = useSession();
  const cart = useCartStore();
  const tenant = useTenant();
  const router = useRouter();
  const formatPrice = useFormatPrice();
  const selectedAddress = useAddressStore((s) => s.selectedAddress);

  const checkout = useCheckoutStore();

  // Auth dialog states
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Show auth dialog if not logged in
  useEffect(() => {
    if (status === "loading") return;
    if (!session && cart.items.length > 0) {
      setAuthDialogOpen(true);
    }
  }, [status, session, cart.items.length]);

  // Prefill from session + saved phone, and check profile completeness
  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  useEffect(() => {
    if (!userId) return;
    if (userName) checkout.setCustomerName(checkout.customerName || userName);
    if (userEmail)
      checkout.setCustomerEmail(checkout.customerEmail || userEmail);

    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.phone) {
          checkout.setCustomerPhone(
            checkout.customerPhone || (data.phone as string),
          );
        }
        const hasName = (data?.name || userName || "").trim().length > 0;
        const hasPhone = (data?.phone || "").trim().length > 0;
        if (!hasName || !hasPhone) {
          setProfileName(data?.name || userName || "");
          setProfilePhone(data?.phone || "");
          setProfileDialogOpen(true);
        }
        checkout.setProfileChecked(true);
      })
      .catch(() => {
        checkout.setProfileChecked(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName, userEmail]);

  const handleProfileSave = async () => {
    if (!profileName.trim() || !profilePhone.trim()) return;
    setProfileSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          phone: profilePhone.trim(),
        }),
      });
      checkout.setCustomerName(profileName.trim());
      checkout.setCustomerPhone(profilePhone.trim());
      sessionStorage.setItem("profile-prompt-shown", "1");
      setProfileDialogOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  // Auto-apply group discount
  const subtotal = cart.subtotal();
  const [groupDiscountConfigs, setGroupDiscountConfigs] = useState<
    { id: string; name: string; discountType: "FIXED" | "PERCENTAGE"; discountValue: number; minOrder: number | null; maxDiscount: number | null; discountEnabled: boolean }[]
  >([]);

  useEffect(() => {
    if (!session || !tenant?.slug) return;
    fetch(`/api/tenants/${tenant.slug}/coupons`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.groupDiscounts) {
          setGroupDiscountConfigs(
            data.groupDiscounts.map((g: Record<string, unknown>) => ({
              id: g.id as string,
              name: g.name as string,
              discountType: g.discountType as "FIXED" | "PERCENTAGE",
              discountValue: g.discountValue as number,
              minOrder: g.minOrder as number | null,
              maxDiscount: g.maxDiscount as number | null,
              discountEnabled: true,
            })),
          );
        }
      })
      .catch(() => {});
     
  }, [session, tenant?.slug]);

  useEffect(() => {
    if (groupDiscountConfigs.length === 0) {
      if (checkout.groupDiscount !== null) checkout.setGroupDiscount(null);
      return;
    }
    const best = calculateBestGroupDiscount(groupDiscountConfigs, subtotal);
    checkout.setGroupDiscount(best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupDiscountConfigs, subtotal]);

  const buildScheduledISO = () => {
    const now = new Date();
    const target = new Date(now);
    if (checkout.scheduledDate === "tomorrow")
      target.setDate(target.getDate() + 1);
    const [h, m] = checkout.scheduledTime.split(":").map(Number);
    target.setHours(h, m, 0, 0);
    return target.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkout.orderType === "DELIVERY" && !selectedAddress) {
      toast.error(t("selectAddress"));
      return;
    }
    if (!checkout.customerName.trim()) {
      toast.error(t("enterName"));
      return;
    }
    if (!checkout.customerPhone.trim()) {
      toast.error(t("enterPhone"));
      return;
    }
    if (
      checkout.scheduleMode &&
      (!checkout.scheduledDate || !checkout.scheduledTime)
    ) {
      toast.error(t("selectTime"));
      return;
    }

    checkout.setIsSubmitting(true);

    try {
      const tipAmount = checkout.computeTip();
      const body = {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => ({
            modifierOptionId: m.modifierOptionId,
          })),
          notes: item.notes || undefined,
          isPreset: item.isPreset ?? false,
          presetName: item.presetName || undefined,
        })),
        orderType: checkout.orderType,
        paymentMethod: checkout.paymentMethod,
        customerName: checkout.customerName.trim(),
        customerPhone: checkout.customerPhone.trim(),
        customerEmail: checkout.customerEmail.trim() || undefined,
        notes: checkout.notes.trim() || undefined,
        deliveryAddress:
          checkout.orderType === "DELIVERY" && selectedAddress
            ? `${selectedAddress.street}${selectedAddress.city ? `, ${selectedAddress.city}` : ""}${selectedAddress.postalCode ? ` ${selectedAddress.postalCode}` : ""}`
            : undefined,
        deliveryLat:
          checkout.orderType === "DELIVERY" && selectedAddress?.lat != null
            ? selectedAddress.lat
            : undefined,
        deliveryLng:
          checkout.orderType === "DELIVERY" && selectedAddress?.lng != null
            ? selectedAddress.lng
            : undefined,
        deliveryAddressDetails:
          checkout.orderType === "DELIVERY" && selectedAddress
            ? {
                street: selectedAddress.street,
                city: selectedAddress.city,
                lat: selectedAddress.lat,
                lng: selectedAddress.lng,
                locationType: selectedAddress.locationType,
                floor: selectedAddress.floor,
                apartmentNumber: selectedAddress.apartmentNumber,
                companyName: selectedAddress.companyName,
                entrance: selectedAddress.entrance,
                accessDetails: selectedAddress.accessDetails,
                deliveryInstructions: selectedAddress.deliveryInstructions,
              }
            : undefined,
        tipAmount,
        scheduledFor:
          checkout.scheduleMode &&
          checkout.scheduledDate &&
          checkout.scheduledTime
            ? buildScheduledISO()
            : undefined,
        promoCode: checkout.appliedPromo?.code || undefined,
        couponIds: checkout.selectedCoupons.length > 0
          ? checkout.selectedCoupons.map((c) => c.id)
          : undefined,
      };

      const res = await fetch(`/api/tenants/${tenant.slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || t("somethingWentWrong"));
      }

      const { orderId, orderNumber } = await res.json();

      if (checkout.paymentMethod === "STRIPE") {
        const checkoutRes = await fetch(
          `/api/tenants/${tenant.slug}/checkout`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          },
        );

        if (!checkoutRes.ok) {
          const data = await checkoutRes.json().catch(() => null);
          throw new Error(data?.error || t("somethingWentWrong"));
        }

        const { clientSecret } = await checkoutRes.json();
        checkout.setStripePayment(clientSecret, orderId, orderNumber);
        return;
      }

      cart.clearCart();
      checkout.reset();
      toast.success(t("orderPlacedSuccess"));
      router.push(
        `/order/confirmation?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      checkout.setIsSubmitting(false);
    }
  };

  // Empty cart state
  if (cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="size-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">{t("cartEmpty")}</h2>
        <p className="text-muted-foreground text-sm">{t("cartEmptyDesc")}</p>
        <Button asChild>
          <Link href="/order">{t("backToMenu")}</Link>
        </Button>
      </div>
    );
  }

  // Auth loading state
  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isBlocked = !session || (session && !checkout.profileChecked);
  const isNotLoggedIn = !session;
  const tipAmount = checkout.computeTip();
  const promoDiscount = checkout.appliedPromo?.discount ?? 0;
  const couponDiscount = checkout.selectedCoupons.reduce((sum, c) => sum + c.discount, 0);
  const groupDiscountAmount = checkout.groupDiscount?.discount ?? 0;
  const totalDiscount = promoDiscount + couponDiscount + groupDiscountAmount;
  const orderTotal = Math.max(0, subtotal - totalDiscount) + tipAmount;

  return (
    <div
      className={`max-w-2xl mx-auto pt-14 pb-32 ${isBlocked ? "pointer-events-none select-none" : ""}`}
    >
      <form id="checkout-form" onSubmit={handleSubmit}>
        {/* Order Type Toggle */}
        <CheckoutOrderTypeToggle />

        {/* Address/Store Card */}
        <CheckoutAddressCard />

        {/* Schedule Card */}
        <CheckoutScheduleCard />

        {/* Coupon (1/3) + Payment (2/3) side by side */}
        <div className="px-4 pb-3 flex gap-2.5">
          <CheckoutCouponCard />
          <CheckoutPaymentCard />
        </div>

        {/* Order Items */}
        <CheckoutItemsList />

        {/* Personal Details (compact one-liner, expands inline) */}
        <CheckoutPersonalDetails />

        {/* Comment Row */}
        <CheckoutCommentRow />

        {/* Tip Chips (only for card payment) */}
        {checkout.paymentMethod === "STRIPE" && <CheckoutTipChips />}

        {/* Summary Card */}
        <CheckoutSummaryCard />
      </form>

      {/* Fixed Submit Button */}
      <CheckoutSubmitButton orderTotal={orderTotal} />

      {/* Stripe Payment Dialog */}
      <Dialog
        open={!!checkout.stripeClientSecret}
        onOpenChange={(open) => {
          if (!open && !checkout.isSubmitting) {
            checkout.clearStripePayment();
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 gap-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t("pay", { amount: formatPrice(orderTotal) })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("payWithCard")}
            </DialogDescription>
          </DialogHeader>
          {checkout.stripeClientSecret && checkout.pendingOrderId && (
            <StripePayment
              clientSecret={checkout.stripeClientSecret}
              orderId={checkout.pendingOrderId}
              returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}${window.location.pathname.split("/order")[0]}/order/confirmation?orderId=${checkout.pendingOrderId}&orderNumber=${encodeURIComponent(checkout.pendingOrderNumber || "")}`}
              onSuccess={() => {
                const oid = checkout.pendingOrderId;
                const onum = checkout.pendingOrderNumber;
                cart.clearCart();
                checkout.reset();
                toast.success(t("paymentSuccessful"));
                router.push(
                  `/order/confirmation?orderId=${oid}&orderNumber=${encodeURIComponent(onum || "")}`,
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <Dialog open={isNotLoggedIn && authDialogOpen}>
        <DialogContent
          className="sm:max-w-sm p-6 gap-6"
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {t("signInToContinue")}
            </DialogTitle>
            <DialogDescription>{t("signInDesc")}</DialogDescription>
          </DialogHeader>
          <SignInForm callbackUrl="/order/checkout" />
          <Button variant="ghost" asChild className="mt-2">
            <Link href="/order">
              <ArrowLeft className="size-4 mr-2" />
              {t("backToMenu")}
            </Link>
          </Button>
        </DialogContent>
      </Dialog>

      {/* Profile Completion Dialog */}
      <Dialog open={profileDialogOpen && !!session}>
        <DialogContent
          className="sm:max-w-sm p-6 gap-6"
          onInteractOutside={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-bold">
              {t("completeProfile")}
            </DialogTitle>
            <DialogDescription>{t("completeProfileDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-profile-name">
                {t("fullNameLabel")}
              </Label>
              <Input
                id="checkout-profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout-profile-phone">{t("phoneLabel")}</Label>
              <PhoneInput
                id="checkout-profile-phone"
                value={profilePhone}
                onChange={setProfilePhone}
                placeholder={t("phonePlaceholder")}
                className="[&_button]:h-11 [&_input]:h-11"
              />
            </div>
            <Button
              variant="brand"
              onClick={handleProfileSave}
              disabled={!profileName.trim() || !profilePhone.trim()}
              loading={profileSaving}
              className="w-full h-11 font-semibold"
            >
              {t("continueToCheckout")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
