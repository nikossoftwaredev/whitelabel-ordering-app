"use client";

import { Minus, Plus, Square, SquareCheck, Store, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";

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

function getRequiredLabel(minSelect: number, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  return minSelect !== 1 ? t("chooseAtLeastPlural", { min: minSelect }) : t("chooseAtLeast", { min: minSelect });
}

function getOptionalLabel(maxSelect: number, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  return maxSelect > 1 ? t("selectUpTo", { max: maxSelect }) : t("optional");
}

interface CartItemEdit {
  cartItemId: string;
  quantity: number;
  modifiers: { modifierOptionId: string; name: string; priceAdjustment: number }[];
}

interface ProductDetailSheetProps {
  product: Product | null;
  editingCartItem?: CartItemEdit | null;
  onClose: () => void;
}

export const ProductDetailSheet = ({
  product,
  editingCartItem,
  onClose,
}: ProductDetailSheetProps) => {
  const t = useTranslations("Product");
  const cart = useCartStore();
  const formatPrice = useFormatPrice();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (product) {
      if (editingCartItem) {
        setIsEditing(true);
        setQuantity(editingCartItem.quantity);
        const modMap = new Map<string, Set<string>>();
        for (const group of product.modifierGroups) {
          const selectedIds = new Set(
            editingCartItem.modifiers
              .filter((m) => group.options.some((o) => o.id === m.modifierOptionId))
              .map((m) => m.modifierOptionId)
          );
          modMap.set(group.id, selectedIds);
        }
        setSelectedModifiers(modMap);
      } else {
        setIsEditing(false);
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
    }
  }, [product, editingCartItem]);

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

  const buildModifiers = () =>
    product.modifierGroups.flatMap((group) => {
      const selected = selectedModifiers.get(group.id) || new Set();
      return group.options
        .filter((o) => selected.has(o.id))
        .map((o) => ({
          modifierOptionId: o.id,
          name: o.name,
          priceAdjustment: o.priceAdjustment,
        }));
    });

  const handleSubmit = () => {
    const modifiers = buildModifiers();

    if (isEditing && editingCartItem) {
      cart.updateItem(editingCartItem.cartItemId, { quantity, modifiers });
    } else {
      cart.addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        basePrice: product.price,
        quantity,
        modifiers,
        notes: "",
      });
    }

    onClose();
  };

  const switchToAddNew = () => {
    setIsEditing(false);
    setQuantity(1);
    const defaults = new Map<string, Set<string>>();
    for (const group of product.modifierGroups) {
      const defaultIds = new Set(
        group.options.filter((o) => o.isDefault).map((o) => o.id)
      );
      defaults.set(group.id, defaultIds);
    }
    setSelectedModifiers(defaults);
  };

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-background text-foreground border-border p-0 sm:max-w-md sm:max-h-[90vh] overflow-hidden"
        showCloseButton={false}
      >
        {/* Hidden accessible title */}
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <div className="overflow-y-auto flex-1">
          {/* Hero image with close button */}
          <div className="relative">
            {product.image ? (
              <div className="w-full aspect-4/3 bg-muted overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-4/3 bg-muted flex items-center justify-center">
                <Store className="size-16 text-muted-foreground/30" />
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 size-9 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200 cursor-pointer"
            >
              <X className="size-5 text-white" />
            </button>
          </div>

          {/* Product info */}
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-lg font-bold"
                style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
              >
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Dietary tags */}
            {(product.isVegan || product.isVegetarian || product.isGlutenFree || product.isDairyFree || product.isSpicy || product.containsNuts) && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {product.isVegan && (
                  <span className="bg-green-500/15 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("vegan")}</span>
                )}
                {product.isVegetarian && (
                  <span className="bg-green-500/15 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("vegetarian")}</span>
                )}
                {product.isGlutenFree && (
                  <span className="bg-amber-500/15 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("glutenFree")}</span>
                )}
                {product.isDairyFree && (
                  <span className="bg-blue-500/15 text-blue-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("dairyFree")}</span>
                )}
                {product.isSpicy && (
                  <span className="bg-red-500/15 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("spicy")}</span>
                )}
                {product.containsNuts && (
                  <span className="bg-orange-500/15 text-orange-400 text-xs font-medium px-2.5 py-1 rounded-full">{t("containsNuts")}</span>
                )}
              </div>
            )}

            {product.allergens && (
              <p className="text-xs text-muted-foreground mt-2">
                {t("allergens", { list: product.allergens })}
              </p>
            )}
          </div>

          {/* Modifier Groups */}
          {product.modifierGroups.length > 0 && (
            <div className="px-5 space-y-5 pb-6">
              <div className="h-px bg-border" />
              {product.modifierGroups.map((group) => {
                const selected = selectedModifiers.get(group.id) || new Set();
                return (
                  <div key={group.id}>
                    <h3 className="text-base font-bold text-foreground">
                      {group.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {group.required
                        ? getRequiredLabel(group.minSelect, t)
                        : getOptionalLabel(group.maxSelect, t)}
                    </p>

                    <div className="mt-3 space-y-0">
                      {group.options.map((opt) => {
                        const isSelected = selected.has(opt.id);
                        return (
                          <button
                            key={opt.id}
                            className="w-full flex items-center gap-3 py-3.5 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted transition-colors duration-200 text-left"
                            onClick={() =>
                              toggleModifier(group.id, opt.id, group.maxSelect)
                            }
                          >
                            {isSelected ? (
                              <SquareCheck
                                className="size-5 shrink-0"
                                style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                              />
                            ) : (
                              <Square className="size-5 shrink-0 text-muted-foreground/50" />
                            )}

                            <span className={`flex-1 text-sm ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                              {opt.name}
                            </span>

                            {opt.priceAdjustment > 0 && (
                              <span className="text-sm text-muted-foreground">
                                +{formatPrice(opt.priceAdjustment)}
                              </span>
                            )}
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

        {/* ── Bottom bar ── */}
        <div className="border-t border-border bg-background shrink-0">
          {/* Editing banner */}
          {isEditing && (
            <div className="px-4 py-3 bg-muted border-b border-border">
              <p className="text-sm text-muted-foreground">{t("editingNote")}</p>
              <button
                className="text-sm font-medium mt-0.5 cursor-pointer"
                style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                onClick={switchToAddNew}
              >
                {t("addAnother")}
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 p-4 pb-6 sm:pb-4">
            {/* Quantity */}
            <div className="flex items-center gap-0 bg-muted rounded-xl overflow-hidden">
              <button
                className="size-11 flex items-center justify-center hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
                style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="size-5" />
              </button>
              <span className="text-base font-bold w-8 text-center tabular-nums text-foreground">
                {quantity}
              </span>
              <button
                className="size-11 flex items-center justify-center hover:bg-muted/80 transition-colors duration-200 cursor-pointer"
                style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="size-5" />
              </button>
            </div>

            {/* Submit button */}
            <button
              className="flex-1 h-11 rounded-xl font-semibold text-[15px] flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-[0.98]"
              style={{
                background: "var(--brand-primary, hsl(var(--primary)))",
                color: "white",
              }}
              onClick={handleSubmit}
            >
              {isEditing ? t("updateOrder") : t("addToOrder")}&nbsp;&nbsp;{formatPrice(totalPrice)}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
