"use client";

import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { QuantityStepper } from "@/components/order/quantity-stepper";
import { Separator } from "@/components/ui/separator";
import { useFormatPrice } from "@/hooks/use-format-price";
import { Link } from "@/lib/i18n/navigation";
import { useCartStore } from "@/lib/stores/cart-store";

export function CheckoutItemsList() {
  const t = useTranslations("Checkout");
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const formatPrice = useFormatPrice();

  return (
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
        {items.map((item, index) => (
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
                        {item.modifiers.map((m) => m.name).join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Quantity control */}
                  <QuantityStepper
                    quantity={item.quantity}
                    onDecrement={() => {
                      if (item.quantity <= 1)
                        removeItem(item.cartItemId);
                      else
                        updateQuantity(
                          item.cartItemId,
                          item.quantity - 1
                        );
                    }}
                    onIncrement={() => {
                      updateQuantity(
                        item.cartItemId,
                        item.quantity + 1
                      );
                    }}
                    className="shrink-0"
                  />
                </div>

                <p className="text-sm font-semibold mt-1.5 tabular-nums">
                  {formatPrice(item.totalPrice)}
                </p>
              </div>
            </div>
            {index < items.length - 1 && (
              <Separator className="opacity-50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
