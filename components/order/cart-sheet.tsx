"use client";

import { ChevronDown, Home, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useStoreStatus } from "@/hooks/use-store-status";
import { Link } from "@/lib/i18n/navigation";
import { useAddressStore } from "@/lib/stores/address-store";
import { useCartStore } from "@/lib/stores/cart-store";

import { AddressManagerSheet } from "./address-manager-sheet";
import { AuthDialog } from "./auth-dialog";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}

const CartContents = ({
  onOpenChange,
  setShowAuthDialog,
}: {
  onOpenChange: (open: boolean) => void;
  setShowAuthDialog: (open: boolean) => void;
}) => {
  const t = useTranslations("Cart");
  const cart = useCartStore();
  const { data: session } = useSession();
  const formatPrice = useFormatPrice();
  const { isClosed: storeClosed } = useStoreStatus();

  return (
    <>
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
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between bg-background/80 backdrop-blur-sm rounded-lg overflow-hidden border border-border">
                    <button
                      className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer"
                      style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                      onClick={() =>
                        cart.updateQuantity(item.cartItemId, item.quantity - 1)
                      }
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      className="size-8 flex items-center justify-center hover:bg-muted transition-colors duration-200 cursor-pointer"
                      style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                      onClick={() =>
                        cart.updateQuantity(item.cartItemId, item.quantity + 1)
                      }
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
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
              <button
                className="w-full h-12 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "var(--brand-primary, hsl(var(--primary)))",
                  color: "white",
                }}
              >
                <Link
                  href="/order/checkout"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-center w-full h-full"
                >
                  {t("proceedToCheckout")}
                </Link>
              </button>
            )}
            {!storeClosed && !session && (
              <button
                className="w-full h-12 rounded-xl text-[15px] font-semibold cursor-pointer transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "var(--brand-primary, hsl(var(--primary)))",
                  color: "white",
                }}
                onClick={() => {
                  onOpenChange(false);
                  setShowAuthDialog(true);
                }}
              >
                {t("proceedToCheckout")}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};

export const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const t = useTranslations("Cart");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const selectedAddress = useAddressStore((s) => s.selectedAddress);
  const items = useCartStore((s) => s.items);
  const prevItemCount = useRef(items.length);

  // Auto-close dialog when cart becomes empty (item removed via minus)
  useEffect(() => {
    if (open && prevItemCount.current > 0 && items.length === 0) {
      onOpenChange(false);
    }
    prevItemCount.current = items.length;
  }, [items.length, open, onOpenChange]);

  const addressLabel = selectedAddress
    ? selectedAddress.label || "Home"
    : "Add address";
  const addressStreet = selectedAddress?.street || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-background text-foreground border-border p-0 sm:max-w-md sm:max-h-[85vh] overflow-hidden"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
            <DialogTitle className="text-lg font-bold text-foreground">
              {t("title")}
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="size-8 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
            >
              <X className="size-4 text-foreground" />
            </button>
          </div>

          {/* Address picker */}
          <button
            onClick={() => setAddressOpen(true)}
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

          <CartContents
            onOpenChange={onOpenChange}
            setShowAuthDialog={setShowAuthDialog}
          />
        </DialogContent>
      </Dialog>

      <AddressManagerSheet open={addressOpen} onOpenChange={setAddressOpen} />
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};
