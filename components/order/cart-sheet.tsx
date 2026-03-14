"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/stores/cart-store";
import { Link } from "@/lib/i18n/navigation";

interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantSlug: string;
}

export const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
  const cart = useCartStore();
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5" />
            Your Cart ({cart.itemCount()})
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 py-4">
              {cart.items.map((item) => (
                <div key={item.cartItemId} className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{item.productName}</h4>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.modifiers.map((m) => m.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-sm shrink-0 tabular-nums">
                      {formatPrice(item.totalPrice)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 cursor-pointer"
                      onClick={() =>
                        cart.updateQuantity(item.cartItemId, item.quantity - 1)
                      }
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="text-sm font-medium w-6 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7 cursor-pointer"
                      onClick={() =>
                        cart.updateQuantity(item.cartItemId, item.quantity + 1)
                      }
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 cursor-pointer text-destructive hover:text-destructive ml-auto"
                      onClick={() => cart.removeItem(item.cartItemId)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(cart.subtotal())}
                </span>
              </div>
              <Button className="w-full h-12 text-base cursor-pointer" asChild>
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
