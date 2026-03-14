"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/stores/cart-store";
import { Link } from "@/lib/i18n/navigation";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const cart = useCartStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl p-0 gap-0">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <SheetHeader className="px-5 pb-3">
          <SheetTitle className="text-lg font-bold text-left">
            Your Cart
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center">
              <ShoppingBag className="size-7 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground text-sm">
              Your cart is empty
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto max-h-[calc(85vh-220px)] px-5">
              {cart.items.map((item, index) => (
                <div key={item.cartItemId}>
                  <div className="flex gap-3 py-3.5">
                    {/* Item image */}
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
                        <button
                          className="shrink-0 size-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200 cursor-pointer"
                          onClick={() => cart.removeItem(item.cartItemId)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1 bg-muted/50 rounded-lg">
                          <button
                            className="size-7 flex items-center justify-center cursor-pointer hover:bg-muted rounded-lg transition-colors duration-200"
                            onClick={() =>
                              cart.updateQuantity(
                                item.cartItemId,
                                item.quantity - 1
                              )
                            }
                          >
                            <Minus className="size-3" />
                          </button>
                          <span className="text-sm font-semibold w-5 text-center tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            className="size-7 flex items-center justify-center cursor-pointer hover:bg-muted rounded-lg transition-colors duration-200"
                            onClick={() =>
                              cart.updateQuantity(
                                item.cartItemId,
                                item.quantity + 1
                              )
                            }
                          >
                            <Plus className="size-3" />
                          </button>
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

            {/* Bottom section */}
            <div className="border-t border-border p-5 pb-6 space-y-4 bg-background">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold tabular-nums">
                  {formatPrice(cart.subtotal())}
                </span>
              </div>
              <Button
                className="w-full h-12 rounded-xl text-[15px] font-semibold cursor-pointer"
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
                  Proceed to checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
