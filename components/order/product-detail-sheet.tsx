"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Minus, Plus, Store } from "lucide-react";
import { useCartStore } from "@/lib/stores/cart-store";
import { toast } from "sonner";

interface ModifierOption {
  id: string;
  name: string;
  nameEl: string | null;
  priceAdjustment: number;
  isDefault: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  nameEl: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

interface Product {
  id: string;
  name: string;
  nameEl: string | null;
  description: string | null;
  image: string | null;
  price: number;
  isVegan: boolean;
  isVegetarian: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  containsNuts: boolean;
  isSpicy: boolean;
  allergens: string | null;
  modifierGroups: ModifierGroup[];
}

interface ProductDetailSheetProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductDetailSheet = ({
  product,
  onClose,
}: ProductDetailSheetProps) => {
  const cart = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Map<string, Set<string>>
  >(new Map());

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(1);
      const defaults = new Map<string, Set<string>>();
      for (const group of product.modifierGroups) {
        const defaultIds = new Set(
          group.options.filter((o) => o.isDefault).map((o) => o.id)
        );
        defaults.set(group.id, defaultIds);
      }
      setSelectedModifiers(defaults);
    }
  }, [product]);

  const toggleModifier = useCallback(
    (groupId: string, optionId: string, maxSelect: number) => {
      setSelectedModifiers((prev) => {
        const next = new Map(prev);
        const current = new Set(next.get(groupId) || []);

        if (current.has(optionId)) {
          current.delete(optionId);
        } else {
          if (maxSelect === 1) {
            current.clear();
          } else if (current.size >= maxSelect) {
            return prev; // max reached
          }
          current.add(optionId);
        }

        next.set(groupId, current);
        return next;
      });
    },
    []
  );

  if (!product) return null;

  const modifierTotal = product.modifierGroups.reduce((sum, group) => {
    const selected = selectedModifiers.get(group.id) || new Set();
    for (const opt of group.options) {
      if (selected.has(opt.id)) sum += opt.priceAdjustment;
    }
    return sum;
  }, 0);

  const totalPrice = (product.price + modifierTotal) * quantity;
  const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const handleAddToCart = () => {
    const modifiers = product.modifierGroups.flatMap((group) => {
      const selected = selectedModifiers.get(group.id) || new Set();
      return group.options
        .filter((o) => selected.has(o.id))
        .map((o) => ({
          modifierOptionId: o.id,
          name: o.name,
          priceAdjustment: o.priceAdjustment,
        }));
    });

    cart.addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      basePrice: product.price,
      quantity,
      modifiers,
      notes: "",
    });

    toast.success(`${product.name} added to cart`);
    onClose();
  };

  return (
    <Sheet open={!!product} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="text-left">
          <SheetTitle>{product.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] pb-4">
          {/* Image */}
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 rounded-xl object-cover"
            />
          ) : (
            <div className="w-full h-32 rounded-xl bg-muted flex items-center justify-center">
              <Store className="size-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Description & tags */}
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-1">
            {product.isVegan && <Badge variant="secondary">Vegan</Badge>}
            {product.isVegetarian && <Badge variant="secondary">Vegetarian</Badge>}
            {product.isGlutenFree && <Badge variant="secondary">Gluten Free</Badge>}
            {product.isDairyFree && <Badge variant="secondary">Dairy Free</Badge>}
            {product.isSpicy && <Badge variant="destructive">Spicy 🌶</Badge>}
            {product.containsNuts && <Badge variant="outline">Contains Nuts</Badge>}
          </div>

          {product.allergens && (
            <p className="text-xs text-muted-foreground">
              Allergens: {product.allergens}
            </p>
          )}

          <Separator />

          {/* Modifier Groups */}
          {product.modifierGroups.map((group) => {
            const selected = selectedModifiers.get(group.id) || new Set();
            return (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{group.name}</Label>
                  {group.required && (
                    <Badge variant="destructive" className="text-[10px]">
                      Required
                    </Badge>
                  )}
                </div>
                {group.maxSelect > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Select {group.minSelect > 0 ? `${group.minSelect}-` : "up to "}
                    {group.maxSelect}
                  </p>
                )}
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const isSelected = selected.has(opt.id);
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors duration-300 ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          toggleModifier(group.id, opt.id, group.maxSelect)
                        }
                      >
                        <span className="text-sm">{opt.name}</span>
                        {opt.priceAdjustment > 0 && (
                          <span className="text-xs text-muted-foreground">
                            +{formatPrice(opt.priceAdjustment)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quantity */}
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm font-semibold">Quantity</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="size-8 cursor-pointer"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="text-lg font-semibold w-8 text-center tabular-nums">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8 cursor-pointer"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Add to Cart Button */}
        <div className="pt-4 border-t">
          <Button
            className="w-full h-12 text-base cursor-pointer"
            onClick={handleAddToCart}
          >
            Add to cart — {formatPrice(totalPrice)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
