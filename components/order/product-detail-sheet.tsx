"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Store, Check } from "lucide-react";
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

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

export const ProductDetailSheet = ({
  product,
  onClose,
}: ProductDetailSheetProps) => {
  const cart = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Map<string, Set<string>>
  >(new Map());

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
            return prev;
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
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-3xl p-0 gap-0">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Hero image */}
          {product.image ? (
            <div className="relative mx-4 rounded-2xl overflow-hidden aspect-[16/10] bg-muted">
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="mx-4 rounded-2xl bg-muted flex items-center justify-center h-32">
              <Store className="size-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Product info */}
          <div className="px-5 pt-4 pb-2">
            <SheetHeader className="text-left p-0">
              <SheetTitle className="text-xl font-bold leading-tight">
                {product.name}
              </SheetTitle>
            </SheetHeader>

            <p className="text-lg font-semibold mt-1" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}>
              {formatPrice(product.price)}
            </p>

            {product.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Dietary tags */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {product.isVegan && (
                <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Vegan
                </span>
              )}
              {product.isVegetarian && (
                <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Vegetarian
                </span>
              )}
              {product.isGlutenFree && (
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Gluten Free
                </span>
              )}
              {product.isDairyFree && (
                <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Dairy Free
                </span>
              )}
              {product.isSpicy && (
                <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Spicy 🌶
                </span>
              )}
              {product.containsNuts && (
                <span className="bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  Contains Nuts
                </span>
              )}
            </div>

            {product.allergens && (
              <p className="text-xs text-muted-foreground mt-2">
                Allergens: {product.allergens}
              </p>
            )}
          </div>

          {/* Modifier Groups */}
          {product.modifierGroups.length > 0 && (
            <div className="px-5 space-y-4 pb-4">
              <Separator />
              {product.modifierGroups.map((group) => {
                const selected = selectedModifiers.get(group.id) || new Set();
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <h3 className="text-[15px] font-bold">{group.name}</h3>
                      {group.required && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                          Required
                        </span>
                      )}
                    </div>
                    {group.maxSelect > 1 && (
                      <p className="text-xs text-muted-foreground -mt-1 mb-2">
                        Select {group.minSelect > 0 ? `${group.minSelect}–` : "up to "}
                        {group.maxSelect}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {group.options.map((opt) => {
                        const isSelected = selected.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            className={`w-full flex items-center justify-between rounded-xl p-3.5 cursor-pointer transition-all duration-200 ${
                              isSelected
                                ? "bg-[var(--brand-primary,hsl(var(--primary)))]/8 ring-1.5 ring-[var(--brand-primary,hsl(var(--primary)))]"
                                : "bg-muted/30 hover:bg-muted/50"
                            }`}
                            onClick={() =>
                              toggleModifier(group.id, opt.id, group.maxSelect)
                            }
                          >
                            <span className="text-sm font-medium">{opt.name}</span>
                            <div className="flex items-center gap-2">
                              {opt.priceAdjustment > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  +{formatPrice(opt.priceAdjustment)}
                                </span>
                              )}
                              <div
                                className={`size-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? "bg-[var(--brand-primary,hsl(var(--primary)))] text-white"
                                    : "border-2 border-muted-foreground/20"
                                }`}
                              >
                                {isSelected && <Check className="size-3" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bottom bar: quantity + add to cart ── */}
        <div className="border-t border-border p-4 pb-6 bg-background">
          <div className="flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg cursor-pointer"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="text-base font-bold w-6 text-center tabular-nums">
                {quantity}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-lg cursor-pointer"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>

            {/* Add to cart button */}
            <button
              className="flex-1 h-12 rounded-xl font-semibold text-[15px] cursor-pointer transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
              onClick={handleAddToCart}
            >
              Add to cart — {formatPrice(totalPrice)}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
