"use client";

import { ChevronDown, Home, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useStoreStatus } from "@/hooks/use-store-status";
import { Link } from "@/lib/i18n/navigation";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

import { QuantityStepper } from "./quantity-stepper";

export const CART_DIALOG = "cart";

export const CartContent = () => {
  const t = useTranslations("Cart");
  const cart = useCartStore();
  const { data: session } = useSession();
  const formatPrice = useFormatPrice();
  const { isClosed: storeClosed } = useStoreStatus();
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const items = useCartStore((s) => s.items);
  const openDialog = useDialogStore((s) => s.openDialog);
  const closeAll = useDialogStore((s) => s.closeAll);

  // Auto-close when cart becomes empty
  useEffect(() => {
    if (items.length === 0) {
      closeAll();
    }
  }, [items.length, closeAll]);

  const addressLabel = selectedAddress
    ? selectedAddress.label || "Home"
    : "Add address";
  const addressStreet = selectedAddress?.street || null;

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
        <DialogTitle className="text-lg font-bold text-foreground">
          {t("title")}
        </DialogTitle>
      </div>

      {/* Address picker */}
      <button
        onClick={() => openDialog("address-manager")}
        className="mx-4 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
      >
        <Home className="size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{addressLabel}</p>
          {addressStreet && (
            <p className="text-xs text-muted-foreground truncate">{addressStreet}</p>
          )}
        </div>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      </button>

      {/* Cart items */}
      {cart.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center flex-1">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center">
            <ShoppingCart className="size-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="overflow-y-auto flex-1 px-4 py-2">
            {cart.items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-3 py-3 border-b border-border last:border-b-0"
              >
                {/* Left: text info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
                    {item.productName}
                  </h4>

                  {/* Modifier summary */}
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {t("addIngredients", { items: item.modifiers.map((m) => m.name).join(", ") })}
                    </p>
                  )}

                  {/* Price */}
                  <p
                    className="text-sm font-semibold mt-1.5"
                    style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                  >
                    {formatPrice(item.totalPrice)}
                  </p>
                </div>

                {/* Right: image with quantity overlay */}
                <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-muted">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="size-5 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Quantity controls overlaid at bottom */}
                  <QuantityStepper
                    quantity={item.quantity}
                    onDecrement={() => {
                      if (item.quantity <= 1) {
                        openDialog(
                          CONFIRM_DIALOG,
                          {
                            title: t("removeTitle"),
                            description: t("removeDescription", { item: item.productName }),
                            actionLabel: t("remove"),
                          },
                          () => cart.removeItem(item.cartItemId),
                        );
                      } else {
                        cart.updateQuantity(item.cartItemId, item.quantity - 1);
                      }
                    }}
                    onIncrement={() => {
                      cart.updateQuantity(item.cartItemId, item.quantity + 1);
                    }}
                    className="absolute bottom-1 left-1 right-1 justify-between"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div className="border-t border-border p-4 pb-6 sm:pb-4 space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("subtotal")}
              </span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {formatPrice(cart.subtotal())}
              </span>
            </div>
            {storeClosed && (
              <Button
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
                disabled
              >
                {t("storeClosed")}
              </Button>
            )}
            {!storeClosed && session && (
              <Button
                variant="brand"
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
                asChild
              >
                <Link
                  href="/order/checkout"
                  onClick={() => {
                    // Clear stack without history.go() since Link navigates away
                    useDialogStore.setState({ stack: [] });
                  }}
                >
                  {t("proceedToCheckout")}
                </Link>
              </Button>
            )}
            {!storeClosed && !session && (
              <Button
                variant="brand"
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
                onClick={() => openDialog("auth")}
              >
                {t("proceedToCheckout")}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};
