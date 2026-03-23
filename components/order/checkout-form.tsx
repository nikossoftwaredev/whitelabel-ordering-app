"use client";

import {
  ArrowLeft,
  Banknote,
  Bike,
  CalendarClock,
  Check,
  Clock,
  CreditCard,
  Gift,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Store,
  Tag,
  X,
} from "lucide-react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { SignInForm } from "@/components/auth/signin-form";
import { useTenant } from "@/components/tenant-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { PhoneInput } from "@/components/phone-input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useStoreStatus } from "@/hooks/use-store-status";
import { Link,useRouter } from "@/lib/i18n/navigation";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";

import dynamic from "next/dynamic";

import { useDialogStore } from "@/lib/stores/dialog-store";
import { QuantityStepper } from "./quantity-stepper";

const StripePayment = dynamic(() =>
  import("./stripe-payment").then((m) => m.StripePayment),
  { ssr: false, loading: () => <div className="h-12 animate-pulse bg-muted rounded-2xl" /> }
);

type OrderType = "PICKUP" | "DELIVERY";

export const CheckoutForm = () => {
  const t = useTranslations("Checkout");
  const { data: session, status } = useSession();
  const cart = useCartStore();
  const tenant = useTenant();
  const router = useRouter();

  const formatPrice = useFormatPrice();
  const { isClosed: storeClosed } = useStoreStatus();
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const openDialog = useDialogStore((s) => s.openDialog);
  const [orderType, setOrderType] = useState<OrderType>("PICKUP");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "STRIPE">("CASH");
  const [notes, setNotes] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(""); // "today" or "tomorrow"
  const [scheduledTime, setScheduledTime] = useState(""); // "HH:MM"
  const [showNotes, setShowNotes] = useState(false);
  const [tipOption, setTipOption] = useState<"none" | "50" | "100" | "150" | "200" | "custom">("none");
  const [customTipValue, setCustomTipValue] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [loyaltyData, setLoyaltyData] = useState<{
    enabled: boolean;
    requiredOrders: number;
    rewardAmount: number;
    currentProgress: number;
    isEligible: boolean;
  } | null>(null);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(false);

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
    if (userName) setCustomerName((prev) => prev || userName);
    if (userEmail) setCustomerEmail((prev) => prev || userEmail);

    // Fetch saved phone from profile and check completeness
    fetch("/api/user/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.phone) {
          setCustomerPhone((prev) => prev || (data.phone as string));
        }
        const hasName = (data?.name || userName || "").trim().length > 0;
        const hasPhone = (data?.phone || "").trim().length > 0;
        if (!hasName || !hasPhone) {
          setProfileName(data?.name || userName || "");
          setProfilePhone(data?.phone || "");
          setProfileDialogOpen(true);
        }
        setProfileChecked(true);
      })
      .catch(() => { setProfileChecked(true); });
  }, [userId, userName, userEmail]);

  // Fetch loyalty status
  useEffect(() => {
    if (!userId || !tenant.slug) return;
    fetch(`/api/tenants/${tenant.slug}/loyalty`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setLoyaltyData(data); })
      .catch(() => {});
  }, [userId, tenant.slug]);

  // Save phone to profile on blur
  const handlePhoneBlur = () => {
    if (session?.user) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim() || null }),
      }).catch(() => {});
    }
  };

  const handleProfileSave = async () => {
    if (!profileName.trim() || !profilePhone.trim()) return;
    setProfileSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim(), phone: profilePhone.trim() }),
      });
      setCustomerName(profileName.trim());
      setCustomerPhone(profilePhone.trim());
      // Suppress the old ProfilePromptSheet since profile is now complete
      sessionStorage.setItem("profile-prompt-shown", "1");
      setProfileDialogOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orderType === "DELIVERY" && !selectedAddress) {
      toast.error(t("selectAddress"));
      return;
    }
    if (!customerName.trim()) {
      toast.error(t("enterName"));
      return;
    }
    if (!customerPhone.trim()) {
      toast.error(t("enterPhone"));
      return;
    }
    if (scheduleMode && (!scheduledDate || !scheduledTime)) {
      toast.error(t("selectTime"));
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Create the order (prices calculated server-side)
      const body = {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => ({
            modifierOptionId: m.modifierOptionId,
          })),
          notes: item.notes || undefined,
        })),
        orderType,
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        notes: notes.trim() || undefined,
        deliveryAddress:
          orderType === "DELIVERY" && selectedAddress
            ? `${selectedAddress.street}${selectedAddress.city ? `, ${selectedAddress.city}` : ""}${selectedAddress.postalCode ? ` ${selectedAddress.postalCode}` : ""}`
            : undefined,
        deliveryLat:
          orderType === "DELIVERY" && selectedAddress?.lat != null
            ? selectedAddress.lat
            : undefined,
        deliveryLng:
          orderType === "DELIVERY" && selectedAddress?.lng != null
            ? selectedAddress.lng
            : undefined,
        deliveryAddressDetails:
          orderType === "DELIVERY" && selectedAddress
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
        scheduledFor: scheduleMode && scheduledDate && scheduledTime
          ? buildScheduledISO()
          : undefined,
        promoCode: appliedPromo?.code || undefined,
        loyaltyRedeem: loyaltyRedeem || undefined,
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

      // Step 2: If card, get PaymentIntent and show Stripe payment form
      if (paymentMethod === "STRIPE") {
        const checkoutRes = await fetch(
          `/api/tenants/${tenant.slug}/checkout`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          }
        );

        if (!checkoutRes.ok) {
          const data = await checkoutRes.json().catch(() => null);
          throw new Error(
            data?.error || t("somethingWentWrong")
          );
        }

        const { clientSecret } = await checkoutRes.json();
        setPendingOrderId(orderId);
        setPendingOrderNumber(orderNumber);
        setStripeClientSecret(clientSecret);
        return;
      }

      // Step 3: For cash, complete immediately
      cart.clearCart();
      toast.success(t("orderPlacedSuccess"));
      router.push(
        `/order/confirmation?orderId=${orderId}&orderNumber=${encodeURIComponent(orderNumber)}`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("somethingWentWrong")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart state
  if (cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="size-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">{t("cartEmpty")}</h2>
        <p className="text-muted-foreground text-sm">
          {t("cartEmptyDesc")}
        </p>
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

  // If not logged in or profile not checked yet, show checkout as blurred/disabled
  const isBlocked = !session || (session && !profileChecked);
  const isNotLoggedIn = !session;

  const subtotal = cart.subtotal();
  const computeTip = () => {
    if (tipOption === "none") return 0;
    if (tipOption === "custom") return Math.round((parseFloat(customTipValue) || 0) * 100);
    return parseInt(tipOption); // fixed amounts in cents (50, 100, 150, 200)
  };
  const tipAmount = computeTip();
  const loyaltyDiscount = loyaltyRedeem && loyaltyData?.isEligible
    ? Math.min(loyaltyData.rewardAmount, subtotal)
    : 0;
  const discount = loyaltyRedeem ? loyaltyDiscount : (appliedPromo?.discount ?? 0);
  const orderTotal = subtotal - discount + tipAmount;

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
      }
    } catch {
      setPromoError(t("somethingWentWrong"));
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const toggleLoyaltyRedeem = (redeem: boolean) => {
    setLoyaltyRedeem(redeem);
    if (redeem) {
      // Clear promo code when using loyalty
      removePromo();
    }
  };

  const buildScheduledISO = () => {
    const now = new Date();
    const target = new Date(now);
    if (scheduledDate === "tomorrow") target.setDate(target.getDate() + 1);
    const [h, m] = scheduledTime.split(":").map(Number);
    target.setHours(h, m, 0, 0);
    return target.toISOString();
  };

  // Generate time slots (every 30 min) from now+30min to end of day
  const generateTimeSlots = () => {
    const now = new Date();
    const slots: string[] = [];
    const isToday = scheduledDate === "today";

    const minHour = isToday ? now.getHours() : 0;
    const minMinute = isToday ? now.getMinutes() + 30 : 0;

    for (let h = Math.max(minHour, 0); h < 24; h++) {
      for (const m of [0, 30]) {
        if (isToday && (h < minHour || (h === minHour && m < minMinute))) continue;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  };

  return (
    <div className={`max-w-2xl mx-auto pt-14 pb-32 ${isBlocked ? "pointer-events-none select-none" : ""}`}>
      <form onSubmit={handleSubmit}>
        {/* ═══ Order Type Toggle ═══ */}
        {tenant.deliveryEnabled && (
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
        )}

        {/* ═══ Pickup Location ═══ */}
        {orderType === "PICKUP" && (
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
        )}

        {/* ═══ Delivery Address ═══ */}
        {orderType === "DELIVERY" && (
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
                <MapPin className="size-5 text-white" />
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
        )}

        {/* ═══ When? ═══ */}
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("when")}
          </h3>
          <div className="space-y-2">
            {/* Standard option */}
            <button
              type="button"
              onClick={() => { setScheduleMode(false); setScheduledDate(""); setScheduledTime(""); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                !scheduleMode
                  ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <Clock className="size-5" style={{ color: !scheduleMode ? "var(--brand-primary, hsl(var(--primary)))" : "var(--muted-foreground)" }} />
              <div>
                <p className="text-sm font-semibold">{t("standard")}</p>
                <p className="text-xs text-muted-foreground">
                  {tenant.prepTimeMinutes}-{tenant.prepTimeMinutes + 10} min
                </p>
              </div>
            </button>

            {/* Schedule for later option */}
            <button
              type="button"
              onClick={() => { setScheduleMode(true); if (!scheduledDate) setScheduledDate("today"); }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                scheduleMode
                  ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <CalendarClock className="size-5" style={{ color: scheduleMode ? "var(--brand-primary, hsl(var(--primary)))" : "var(--muted-foreground)" }} />
              <div>
                <p className="text-sm font-semibold">{t("scheduleForLater")}</p>
                <p className="text-xs text-muted-foreground">{t("selectTime")}</p>
              </div>
            </button>

            {/* Date + Time selectors */}
            {scheduleMode && (
              <div className="space-y-3 pt-2">
                {/* Day toggle */}
                <div className="flex gap-2">
                  {(["today", "tomorrow"] as const).map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => { setScheduledDate(day); setScheduledTime(""); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 cursor-pointer active:scale-[0.97] ${
                        scheduledDate === day
                          ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/10 text-foreground"
                          : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {t(day)}
                    </button>
                  ))}
                </div>

                {/* Time slots grid */}
                {scheduledDate && (
                  <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                    {generateTimeSlots().map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setScheduledTime(slot)}
                        className={`py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer active:scale-[0.97] ${
                          scheduledTime === slot
                            ? "text-white"
                            : "bg-muted/50 text-foreground hover:bg-muted"
                        }`}
                        style={scheduledTime === slot ? { background: "var(--brand-primary, hsl(var(--primary)))" } : undefined}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Order Items ═══ */}
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t("orderItems")}
            </h3>
            <Link
              href="/order"
              className="text-xs font-semibold flex items-center gap-0.5 hover:opacity-80 transition-opacity"
              style={{
                color: "var(--brand-primary, hsl(var(--primary)))",
              }}
            >
              {t("addMore")}
            </Link>
          </div>

          <div className="space-y-0">
            {cart.items.map((item, index) => (
              <div key={item.cartItemId}>
                <div className="flex gap-3 py-3">
                  {/* Product image */}
                  {item.productImage ? (
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      width={56}
                      height={56}
                      className="size-14 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-14 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-5 text-muted-foreground/20" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                          {item.productName}
                        </h4>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {item.modifiers
                              .map((m) => m.name)
                              .join(", ")}
                          </p>
                        )}
                      </div>

                      {/* Quantity control */}
                      <QuantityStepper
                        quantity={item.quantity}
                        onDecrement={() => {
                          if (item.quantity <= 1)
                            cart.removeItem(item.cartItemId);
                          else
                            cart.updateQuantity(item.cartItemId, item.quantity - 1);
                        }}
                        onIncrement={() => {
                          cart.updateQuantity(item.cartItemId, item.quantity + 1);
                        }}
                        className="shrink-0"
                      />
                    </div>

                    <p className="text-sm font-semibold mt-1.5 tabular-nums">
                      {formatPrice(item.totalPrice)}
                    </p>
                  </div>
                </div>
                {index < cart.items.length - 1 && (
                  <Separator className="opacity-50" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Your Details ═══ */}
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("yourDetails")}
          </h3>
          <div className="space-y-3">
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
              onBlur={handlePhoneBlur}
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
        </div>

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Comment for venue ═══ */}
        <div className="px-4 pb-2">
          {!showNotes ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowNotes(true)}
              className="flex items-center gap-3 w-full py-3 h-auto group"
            >
              <MessageSquare className="size-5 text-muted-foreground" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{t("addCommentForVenue")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("specialRequests")}
                </p>
              </div>
              <span
                className="text-sm font-semibold"
                style={{
                  color: "var(--brand-primary, hsl(var(--primary)))",
                }}
              >
                {t("edit")}
              </span>
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("commentForVenue")}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setNotes("");
                    setShowNotes(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground h-auto py-0.5 px-1"
                >
                  {t("remove")}
                </Button>
              </div>
              <Textarea
                placeholder={t("specialInstructions")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl bg-muted/30 border-border/50 resize-none"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Payment ═══ */}
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("payment")}
          </h3>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                paymentMethod === "CASH"
                  ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CASH"
                checked={paymentMethod === "CASH"}
                onChange={() => setPaymentMethod("CASH")}
                className="sr-only"
              />
              <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Banknote className="size-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("cash")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("payAtPickup")}
                </p>
              </div>
            </label>

            <label
              className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                paymentMethod === "STRIPE"
                  ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                  : "border-border/50 hover:border-border"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="STRIPE"
                checked={paymentMethod === "STRIPE"}
                onChange={() => setPaymentMethod("STRIPE")}
                className="sr-only"
              />
              <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <CreditCard className="size-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{t("card")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("cardBrands")}
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Tip ═══ */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="size-4" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }} />
            <div>
              <h3 className="text-sm font-semibold">{t("tip")}</h3>
              <p className="text-xs text-muted-foreground">{t("tipDescription")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(["none", "50", "100", "150", "200", "custom"] as const).map((opt) => {
              const isActive = tipOption === opt;
              const fixedLabels: Record<string, string> = { "50": "0.50", "100": "1.00", "150": "1.50", "200": "2.00" };
              const labelMap: Record<string, string> = { none: t("noTip"), custom: t("customTip"), ...fixedLabels };
              const label = labelMap[opt] || opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setTipOption(opt);
                    if (opt !== "custom") setCustomTipValue("");
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 cursor-pointer active:scale-[0.97] ${
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
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">EUR</span>
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

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Promo Code ═══ */}
        <div className={`px-4 pb-4 ${loyaltyRedeem ? "opacity-50 pointer-events-none" : ""}`}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("promoCode")}
          </h3>
          {appliedPromo ? (
            <div className="flex items-center justify-between bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="size-4 text-green-600" />
                <code className="font-mono font-bold text-sm">{appliedPromo.code}</code>
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
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); validatePromoCode(); } }}
                  placeholder={t("promoCodePlaceholder")}
                  className="pl-10 font-mono uppercase"
                  disabled={loyaltyRedeem}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={validatePromoCode}
                disabled={promoLoading || !promoInput.trim() || loyaltyRedeem}
                className="cursor-pointer"
              >
                {promoLoading ? <Loader2 className="size-4 animate-spin" /> : t("promoApply")}
              </Button>
            </div>
          )}
          {promoError && (
            <p className="text-xs text-destructive mt-1.5">{promoError}</p>
          )}
        </div>

        {/* ═══ Loyalty Reward ═══ */}
        {loyaltyData?.enabled && (
          <>
            <div className="my-4 mx-4">
              <Separator />
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="size-4" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }} />
                <h3 className="text-sm font-semibold">{t("loyaltyReward")}</h3>
              </div>

              {loyaltyData.isEligible ? (
                <button
                  type="button"
                  onClick={() => toggleLoyaltyRedeem(!loyaltyRedeem)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer ${
                    loyaltyRedeem
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                    loyaltyRedeem ? "bg-green-500" : "bg-muted"
                  }`}>
                    {loyaltyRedeem ? (
                      <Check className="size-5 text-white" />
                    ) : (
                      <Gift className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {loyaltyRedeem ? t("loyaltyApplied") : t("loyaltyUseReward")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("loyaltyRewardValue", { amount: formatPrice(loyaltyData.rewardAmount) })}
                    </p>
                  </div>
                  {loyaltyRedeem && (
                    <span className="text-sm font-bold text-green-600">
                      -{formatPrice(Math.min(loyaltyData.rewardAmount, subtotal))}
                    </span>
                  )}
                </button>
              ) : (
                <div className="rounded-xl border border-border/50 p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{t("loyaltyProgress")}</p>
                    <p className="text-xs text-muted-foreground">
                      {loyaltyData.currentProgress}/{loyaltyData.requiredOrders}
                    </p>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (loyaltyData.currentProgress / loyaltyData.requiredOrders) * 100)}%`,
                        backgroundColor: "var(--brand-primary, hsl(var(--primary)))",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("loyaltyOrdersLeft", {
                      count: loyaltyData.requiredOrders - loyaltyData.currentProgress,
                      amount: formatPrice(loyaltyData.rewardAmount),
                    })}
                  </p>
                </div>
              )}
              {loyaltyRedeem && appliedPromo && (
                <p className="text-xs text-amber-600 mt-1.5">{t("loyaltyExclusive")}</p>
              )}
            </div>
          </>
        )}

        <div className="my-4 mx-4">
          <Separator />
        </div>

        {/* ═══ Summary ═══ */}
        <div className="px-4 pb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("summary")}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("itemSubtotal")}</span>
              <span className="tabular-nums font-medium">
                {formatPrice(subtotal)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>{t("discount")}</span>
                <span className="tabular-nums font-medium">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("tipAmount")}</span>
                <span className="tabular-nums font-medium">
                  {formatPrice(tipAmount)}
                </span>
              </div>
            )}
            {orderType === "DELIVERY" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("deliveryFee")}</span>
                <span className="tabular-nums font-medium text-muted-foreground">
                  {t("tbd")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ═══ Store Closed Warning ═══ */}
        {storeClosed && (
          <div className="px-4 pb-4">
            <Alert variant="destructive">
              <Clock className="size-4" />
              <AlertDescription>
                {t("storeClosed")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* ═══ Fixed Bottom CTA ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Button
              variant="brand"
              type="submit"
              disabled={storeClosed || isBlocked}
              loading={isSubmitting}
              className="w-full flex items-center h-13 px-5 rounded-2xl font-semibold text-[15px]"
            >
              {isSubmitting ? (
                <span>{t("placingOrder")}</span>
              ) : (
                <>
                  <span className="flex-1 text-left">{paymentMethod === "STRIPE" ? t("payWithCard") : t("placeOrder")}</span>
                  <span className="font-bold tabular-nums">
                    {formatPrice(orderTotal)}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>


      {/* Stripe Payment Dialog */}
      <Dialog
        open={!!stripeClientSecret}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setStripeClientSecret(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md p-6 gap-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {t("pay", { amount: formatPrice(orderTotal) })}
            </DialogTitle>
          </DialogHeader>
          {stripeClientSecret && pendingOrderId && (
            <StripePayment
              clientSecret={stripeClientSecret}
              orderId={pendingOrderId}
              returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}${window.location.pathname.split("/order")[0]}/order/confirmation?orderId=${pendingOrderId}&orderNumber=${encodeURIComponent(pendingOrderNumber || "")}`}
              onSuccess={() => {
                const oid = pendingOrderId;
                const onum = pendingOrderNumber;
                cart.clearCart();
                setStripeClientSecret(null);
                setPendingOrderId(null);
                setPendingOrderNumber(null);
                toast.success(t("paymentSuccessful"));
                router.push(
                  `/order/confirmation?orderId=${oid}&orderNumber=${encodeURIComponent(onum || "")}`
                );
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Auth Dialog — blocking, cannot be dismissed */}
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
            <DialogDescription>
              {t("signInDesc")}
            </DialogDescription>
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

      {/* Profile Completion Dialog — blocking after login */}
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
            <DialogDescription>
              {t("completeProfileDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-profile-name">{t("fullNameLabel")}</Label>
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
