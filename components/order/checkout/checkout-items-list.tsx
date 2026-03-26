"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { PRODUCT_DETAIL_DIALOG } from "@/components/order/product-detail-sheet";
import { QuantityStepper } from "@/components/order/quantity-stepper";
import { useTenant } from "@/components/tenant-provider";
import { Separator } from "@/components/ui/separator";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";
import { type CartItem, useCartStore } from "@/lib/stores/cart-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

export function CheckoutItemsList() {
  const t = useTranslations("Checkout");
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const formatPrice = useFormatPrice();
  const tenant = useTenant();
  const openDialog = useDialogStore((s) => s.openDialog);

  const { data: menuData } = useQuery<{
    categories: { products: { id: string; [key: string]: unknown }[] }[];
  }>({
    queryKey: queryKeys.menu.all(tenant.slug),
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenant.slug}/menu`);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
  });

  const handleItemClick = useCallback(
    (item: CartItem) => {
      if (!menuData) return;
      const product = menuData.categories
        .flatMap((c) => c.products)
        .find((p) => p.id === item.productId);
      if (!product) return;
      openDialog(PRODUCT_DETAIL_DIALOG, {
        product,
        editingCartItem: {
          cartItemId: item.cartItemId,
          quantity: item.quantity,
          modifiers: item.modifiers,
          notes: item.notes,
        },
      });
    },
    [menuData, openDialog],
  );

  return (
    <div className="px-4 pb-2">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("orderItems")}
        </h3>
      </div>

      <div className="space-y-0">
        {items.map((item, index) => (
          <div key={item.cartItemId}>
            <div
              className="flex gap-3 py-3 -mx-2 px-2 rounded-xl cursor-pointer hover:bg-muted/30 transition-colors duration-200"
              onClick={() => handleItemClick(item)}
            >
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
