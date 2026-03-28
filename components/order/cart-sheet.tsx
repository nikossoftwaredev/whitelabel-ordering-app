"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Home, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const tProduct = useTranslations("Product");
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
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header */}
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">
          {t("title")}
        </DialogTitle>
      </DialogHeader>

      {/* Address picker */}
      <button
        onClick={() => openDialog("address-manager")}
        className="mx-4 mt-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
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
          <ScrollArea className="flex-1 min-h-0" viewportClassName="!overflow-y-scroll">
          <div className="px-4 py-2">
            <AnimatePresence initial={false}>
            {cart.items.map((item) => (
              <motion.div
                key={item.cartItemId}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
              <div
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
                      {item.isPreset
                        ? (item.presetName || tProduct("withEverything"))
                        : t("addIngredients", { items: item.modifiers.map((m) => m.name).join(", ") })}
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
                        cart.removeItem(item.cartItemId);
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
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
          </ScrollArea>

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
