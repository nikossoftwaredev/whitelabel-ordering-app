"use client";

import {
  ArrowLeft,
  Banknote,
  Bike,
  Clock,
  CreditCard,
  Loader2,
  MessageSquare,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { SignInForm } from "@/components/auth/signin-form";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useFormatPrice } from "@/hooks/use-format-price";
import { Link,useRouter } from "@/lib/i18n/navigation";
import { useCartStore } from "@/lib/stores/cart-store";

import { StripePayment } from "./stripe-payment";

type OrderType = "PICKUP" | "DELIVERY";

export const CheckoutForm = () => {
  const t = useTranslations("Checkout");
  const { data: session, status } = useSession();
  const cart = useCartStore();
  const tenant = useTenant();
  const router = useRouter();

  const formatPrice = useFormatPrice();
  const [orderType, setOrderType] = useState<OrderType>("PICKUP");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "STRIPE">("CASH");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);

  // Prefill from session + saved phone
  const userId = session?.user?.id;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  useEffect(() => {
    if (!userId) return;
    if (userName) setCustomerName((prev) => prev || userName);
    if (userEmail) setCustomerEmail((prev) => prev || userEmail);

    // Fetch saved phone from profile
    fetch("/api/user/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.phone) setCustomerPhone((prev) => prev || data.phone);
      })
      .catch(() => {});
  }, [userId, userName, userEmail]);

  // Save phone to profile on blur
  const handlePhoneBlur = () => {
    if (session?.user && customerPhone.trim()) {
      fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: customerPhone.trim() }),
      }).catch(() => {});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error(t("enterName"));
      return;
    }
    if (!customerPhone.trim()) {
      toast.error(t("enterPhone"));
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

  // Not logged in — show sign-in form
  if (!session) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">{t("signInToContinue")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("signInDesc")}
          </p>
        </div>
        <SignInForm callbackUrl="/order" />
        <Button variant="ghost" asChild>
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            {t("backToMenu")}
          </Link>
        </Button>
      </div>
    );
  }

  const subtotal = cart.subtotal();

  return (
    <div className="max-w-2xl mx-auto pb-32">
      {/* ═══ Header ═══ */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/order"
            className="flex items-center justify-center size-9 rounded-full hover:bg-muted transition-colors duration-200"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{tenant.name}</p>
          </div>
        </div>
      </div>

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

        {/* ═══ Estimated Time ═══ */}
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {t("when")}
          </h3>
          <div className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-[var(--brand-primary,hsl(var(--primary)))] bg-[var(--brand-primary,hsl(var(--primary)))]/5">
            <Clock className="size-5 text-[var(--brand-primary,hsl(var(--primary)))]" />
            <div>
              <p className="text-sm font-semibold">{t("standard")}</p>
              <p className="text-xs text-muted-foreground">
                {tenant.prepTimeMinutes}-{tenant.prepTimeMinutes + 10} min
              </p>
            </div>
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
                    <img
                      src={item.productImage}
                      alt={item.productName}
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
                      <div className="flex items-center border border-border rounded-lg shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 rounded-l-lg rounded-r-none hover:bg-muted"
                          onClick={() => {
                            if (item.quantity <= 1)
                              cart.removeItem(item.cartItemId);
                            else
                              cart.updateQuantity(
                                item.cartItemId,
                                item.quantity - 1
                              );
                          }}
                        >
                          {item.quantity <= 1 ? (
                            <Trash2 className="size-3 text-destructive" />
                          ) : (
                            <Minus className="size-3" />
                          )}
                        </Button>
                        <span className="text-xs font-bold w-6 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 rounded-r-lg rounded-l-none hover:bg-muted"
                          onClick={() =>
                            cart.updateQuantity(
                              item.cartItemId,
                              item.quantity + 1
                            )
                          }
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
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
            <Input
              type="tel"
              placeholder={t("phonePlaceholder")}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              required
              className="h-11 rounded-xl bg-muted/30 border-border/50"
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

        {/* ═══ Fixed Bottom CTA ═══ */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center h-13 px-5 rounded-2xl font-semibold text-[15px] active:scale-[0.98]"
              style={{
                background:
                  "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center w-full gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>{t("placingOrder")}</span>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-left">{paymentMethod === "STRIPE" ? t("payWithCard") : t("placeOrder")}</span>
                  <span className="font-bold tabular-nums">
                    {formatPrice(subtotal)}
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
              {t("pay", { amount: formatPrice(subtotal) })}
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
    </div>
  );
};
