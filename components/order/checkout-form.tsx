"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/stores/cart-store";
import { useTenant } from "@/components/tenant-provider";
import { useRouter, Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, ShoppingBag, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

export const CheckoutForm = () => {
  const cart = useCartStore();
  const tenant = useTenant();
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatPrice = (cents: number) =>
    `${tenant.currency === "EUR" ? "\u20AC" : tenant.currency}${(cents / 100).toFixed(2)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (paymentMethod === "CARD") {
      toast.error("Card payments are not available yet");
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        items: cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          modifiers: item.modifiers.map((m) => ({
            modifierOptionId: m.modifierOptionId,
          })),
          notes: item.notes || undefined,
        })),
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
        throw new Error(data?.error || "Failed to place order");
      }

      const { orderId, orderNumber } = await res.json();

      cart.clearCart();
      toast.success("Order placed successfully!");
      router.push(
        `/order/confirmation?orderId=${orderId}&orderNumber=${orderNumber}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart state
  if (cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <ShoppingBag className="size-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold">Your cart is empty</h2>
        <p className="text-muted-foreground text-sm">
          Add some items before checking out.
        </p>
        <Button asChild>
          <Link href="/order">Back to Menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" asChild className="cursor-pointer">
          <Link href="/order">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Order Summary */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.cartItemId} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {item.quantity}x
                    </span>
                    <span className="text-sm">{item.productName}</span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground ml-7">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium tabular-nums shrink-0">
                  {formatPrice(item.totalPrice)}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(cart.subtotal())}</span>
          </div>
        </section>

        <Separator />

        {/* Customer Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Your Details</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="customerName">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Your full name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerPhone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="Your phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerEmail">Email (optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="your@email.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Payment Method */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors duration-300 ${
                paymentMethod === "CASH"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
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
              <Banknote className="size-6" />
              <span className="text-sm font-medium">Cash</span>
            </label>
            <label
              className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors duration-300 ${
                paymentMethod === "CARD"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CARD"
                checked={paymentMethod === "CARD"}
                onChange={() => setPaymentMethod("CARD")}
                className="sr-only"
              />
              <CreditCard className="size-6" />
              <span className="text-sm font-medium">Card</span>
              <Badge variant="secondary" className="text-[10px] absolute top-1 right-1">
                Coming soon
              </Badge>
            </label>
          </div>
        </section>

        <Separator />

        {/* Order Notes */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Order Notes (optional)</h2>
          <Textarea
            placeholder="Any special instructions for your order..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </section>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full h-12 text-base cursor-pointer"
          disabled={isSubmitting || paymentMethod === "CARD"}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Placing Order...
            </>
          ) : (
            <>Place Order &mdash; {formatPrice(cart.subtotal())}</>
          )}
        </Button>
      </form>
    </div>
  );
};
