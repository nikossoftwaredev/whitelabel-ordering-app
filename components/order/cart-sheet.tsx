"use client";

import { Minus, Plus, ShoppingBag,Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useIsMobile } from "@/hooks/use-mobile";
import { useStoreStatus } from "@/hooks/use-store-status";
import { Link } from "@/lib/i18n/navigation";
import { useCartStore } from "@/lib/stores/cart-store";

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
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
          <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
            <ShoppingBag className="size-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <>
          <div className="overflow-y-auto flex-1 px-5">
            {cart.items.map((item, index) => (
              <div key={item.cartItemId}>
                <div className="flex gap-3 py-3.5">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="size-16 rounded-xl object-cover shrink-0"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <ShoppingBag className="size-5 text-muted-foreground/20" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm leading-tight">
                          {item.productName}
                        </h4>
                        {item.modifiers.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.modifiers.map((m) => m.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="shrink-0 size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => cart.removeItem(item.cartItemId)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 bg-muted/50 rounded-lg">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 rounded-lg hover:bg-muted"
                          onClick={() =>
                            cart.updateQuantity(
                              item.cartItemId,
                              item.quantity - 1
                            )
                          }
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="text-sm font-semibold w-5 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="size-7 rounded-lg hover:bg-muted"
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
                      <span className="font-semibold text-sm tabular-nums">
                        {formatPrice(item.totalPrice)}
                      </span>
                    </div>
                  </div>
                </div>
                {index < cart.items.length - 1 && (
                  <div className="h-px bg-border/50" />
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-5 pb-6 space-y-4 bg-background">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {t("subtotal")}
              </span>
              <span className="text-lg font-bold tabular-nums">
                {formatPrice(cart.subtotal())}
              </span>
            </div>
            {storeClosed ? (
              <Button
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
                disabled
              >
                Store is closed
              </Button>
            ) : session ? (
              <Button
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
                style={{
                  background: "var(--brand-primary, hsl(var(--primary)))",
                  color: "white",
                }}
                asChild
              >
                <Link
                  href="/order/checkout"
                  onClick={() => onOpenChange(false)}
                >
                  {t("proceedToCheckout")}
                </Link>
              </Button>
            ) : (
              <Button
                className="w-full h-12 rounded-xl text-[15px] font-semibold"
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
              </Button>
            )}
          </div>
        </>
      )}
    </>
  );
};

export const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const t = useTranslations("Cart");
  const isMobile = useIsMobile();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "max-h-[85vh] rounded-t-3xl p-0 gap-0 flex flex-col"
              : "flex flex-col w-100 p-0 gap-0"
          }
        >
          {isMobile && (
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>
          )}
          <SheetHeader className={`px-5 pb-3 ${isMobile ? "" : "pt-5"}`}>
            <SheetTitle className="text-lg font-bold text-left">
              {t("title")}
            </SheetTitle>
          </SheetHeader>
          <CartContents
            onOpenChange={onOpenChange}
            setShowAuthDialog={setShowAuthDialog}
          />
        </SheetContent>
      </Sheet>

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </>
  );
};
