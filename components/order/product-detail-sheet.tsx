"use client";

import { Circle, CircleCheck, MessageSquare, Square, SquareCheck, Store } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { resolvePresetLabel } from "@/lib/orders/resolve-preset-label";
import { ProductBadge } from "@/components/product-badge";
import { Button } from "@/components/ui/button";
import { DialogTitle } from "@/components/ui/dialog";
import { useFormatPrice } from "@/hooks/use-format-price";
import { applyFreeCount } from "@/lib/orders/free-count";
import { calcBogoTotal, hasActiveOffer } from "@/lib/orders/offers";
import { useCartStore } from "@/lib/stores/cart-store";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";

import { QuantityStepper } from "./quantity-stepper";

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
  freeCount?: number;
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
  hasPreset?: boolean;
  presetOptionIds?: string[];
  presetName?: string | null;
  presetNameEl?: string | null;
  offerType?: string | null;
  offerPrice?: number | null;
  offerStart?: string | null;
  offerEnd?: string | null;
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
  notes?: string;
  isPreset?: boolean;
}

/** Build a map of modifier group → selected option IDs for default/preset selections */
function buildDefaultModifiers(
  groups: ModifierGroup[],
  presetOptionIds?: string[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  const presetSet = presetOptionIds?.length ? new Set(presetOptionIds) : null;

  for (const group of groups) {
    if (presetSet) {
      // Use per-product preset IDs
      map.set(group.id, new Set(group.options.filter((o) => presetSet.has(o.id)).map((o) => o.id)));
    } else {
      // Fallback to isDefault on each option
      map.set(group.id, new Set(group.options.filter((o) => o.isDefault).map((o) => o.id)));
    }
  }
  return map;
}

export const PRODUCT_DETAIL_DIALOG = "product-detail";

export const ProductDetailContent = () => {
  const dialogData = useDialogStore(selectDialogData) as { product: Product; editingCartItem?: CartItemEdit } | null;
  const product = dialogData?.product ?? null;
  const editingCartItem = dialogData?.editingCartItem ?? null;
  const closeAll = useDialogStore((s) => s.closeAll);
  const locale = useLocale();
  const t = useTranslations("Product");
  const cart = useCartStore();
  const formatPrice = useFormatPrice();
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Map<string, Set<string>>
  >(new Map());
  const [isEditing, setIsEditing] = useState(false);
  const [presetMode, setPresetMode] = useState<"preset" | "custom">("preset");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    if (product) {
      if (editingCartItem) {
        setIsEditing(true);
        setQuantity(editingCartItem.quantity);
        setNotes(editingCartItem.notes || "");
        setShowNotes(!!editingCartItem.notes);
        // Restore preset mode when editing
        if (product.hasPreset && editingCartItem.isPreset) {
          setPresetMode("preset");
          setSelectedModifiers(buildDefaultModifiers(product.modifierGroups, product.presetOptionIds));
        } else {
          setPresetMode(product.hasPreset ? "custom" : "preset");
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
        }
      } else {
        setIsEditing(false);
        // Default to 2 for BOGO products so they get the deal
        setQuantity(hasActiveOffer(product) ? 2 : 1);
        setNotes("");
        setShowNotes(false);
        setPresetMode("preset");
        setSelectedModifiers(buildDefaultModifiers(product.modifierGroups, product.presetOptionIds));
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

  const handlePresetModeChange = useCallback(
    (mode: "preset" | "custom") => {
      if (!product) return;
      setPresetMode(mode);
      if (mode === "preset") {
        setSelectedModifiers(buildDefaultModifiers(product.modifierGroups, product.presetOptionIds));
      } else {
        const empty = new Map<string, Set<string>>();
        for (const group of product.modifierGroups) {
          empty.set(group.id, new Set());
        }
        setSelectedModifiers(empty);
      }
    },
    [product]
  );

  const showPresetToggle = !!product?.hasPreset && (product.modifierGroups?.length ?? 0) > 0;

  const resolvedPresetName = useMemo(() => {
    if (!product) return t("withEverything");
    return resolvePresetLabel(product, locale, t("withEverything"));
  }, [product, locale, t]);

  const defaultOptionNames = useMemo(() => {
    if (!showPresetToggle || !product) return [];
    const ps = product.presetOptionIds?.length ? new Set(product.presetOptionIds) : null;
    return product.modifierGroups
      .flatMap((g) => g.options.filter((o) => (ps ? ps.has(o.id) : o.isDefault)))
      .map((o) => o.name);
  }, [showPresetToggle, product]);

  const modifierTotal = useMemo(() => {
    if (!product) return 0;
    return product.modifierGroups.reduce((sum, group) => {
      const selected = selectedModifiers.get(group.id) || new Set();
      const selectedOpts = group.options
        .filter((o) => selected.has(o.id))
        .map((o) => ({ modifierOptionId: o.id, name: o.name, priceAdjustment: o.priceAdjustment }));
      const effective = applyFreeCount(selectedOpts, group.freeCount ?? 0);
      return sum + effective.reduce((s, m) => s + m.priceAdjustment, 0);
    }, 0);
  }, [product, selectedModifiers]);

  if (!product) return null;

  const isBogoActive = hasActiveOffer(product);

  let totalPrice: number;
  if (isBogoActive && quantity >= 2) {
    totalPrice = calcBogoTotal(quantity, product.offerPrice!, product.price, modifierTotal);
  } else {
    totalPrice = (product.price + modifierTotal) * quantity;
  }

  const buildModifiers = () =>
    product.modifierGroups.flatMap((group) => {
      const selected = selectedModifiers.get(group.id) || new Set();
      const selectedOpts = group.options
        .filter((o) => selected.has(o.id))
        .map((o) => ({ modifierOptionId: o.id, name: o.name, priceAdjustment: o.priceAdjustment }));
      return applyFreeCount(selectedOpts, group.freeCount ?? 0);
    });

  const handleSubmit = () => {
    const modifiers = buildModifiers();
    const isPresetSelection = showPresetToggle && presetMode === "preset";

    if (isEditing && editingCartItem) {
      cart.updateItem(editingCartItem.cartItemId, { quantity, modifiers, notes: notes.trim() });
    } else {
      cart.addItem({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        basePrice: product.price,
        quantity,
        modifiers,
        notes: notes.trim(),
        isPreset: isPresetSelection,
        ...(isPresetSelection && { presetName: resolvedPresetName }),
        ...(isBogoActive && {
          offerType: product.offerType,
          offerPrice: product.offerPrice,
        }),
      });
    }

    closeAll();
  };

  const switchToAddNew = () => {
    setIsEditing(false);
    setQuantity(1);
    setNotes("");
    setShowNotes(false);
    setSelectedModifiers(buildDefaultModifiers(product.modifierGroups, product.presetOptionIds));
  };

  return (
    <div className="flex flex-col overflow-y-auto flex-1">
      {/* Hidden accessible title */}
      <DialogTitle className="sr-only">{product.name}</DialogTitle>

      <div className="overflow-y-auto flex-1 scrollbar-hide">
          {/* Hero image */}
          <div className="relative">
            {product.image ? (
              <div className="relative w-full aspect-4/3 bg-muted overflow-hidden">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 500px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-4/3 bg-muted flex items-center justify-center">
                <Store className="size-16 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-2xl font-bold leading-tight text-foreground">
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-center gap-2 mt-2">
              {isBogoActive ? (
                <>
                  <ProductBadge variant="offer">1+1</ProductBadge>
                  <span
                    className="text-lg font-bold"
                    style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                  >
                    {formatPrice(product.offerPrice!)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.price * 2)}
                  </span>
                </>
              ) : (
                <span
                  className="text-lg font-bold"
                  style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                >
                  {formatPrice(product.price)}
                </span>
              )}
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

          {/* Preset Toggle */}
          {showPresetToggle && (
            <div className="px-5 pb-2">
              <div className="h-px bg-border mb-5" />
              <div className="space-y-2">
                {/* Απ' όλα option */}
                <button
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl border transition-colors duration-200 cursor-pointer text-left ${
                    presetMode === "preset"
                      ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => handlePresetModeChange("preset")}
                >
                  {presetMode === "preset" ? (
                    <CircleCheck
                      className="size-5 shrink-0 mt-0.5"
                      style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                    />
                  ) : (
                    <Circle className="size-5 shrink-0 mt-0.5 text-muted-foreground/50" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-sm font-semibold ${presetMode === "preset" ? "text-foreground" : "text-muted-foreground"}`}>
                      {resolvedPresetName}
                    </span>
                    {defaultOptionNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ({defaultOptionNames.join(", ")})
                      </p>
                    )}
                  </div>
                </button>

                {/* Επιλέξτε υλικά option */}
                <button
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-colors duration-200 cursor-pointer text-left ${
                    presetMode === "custom"
                      ? "border-(--brand-primary,hsl(var(--primary))) bg-(--brand-primary,hsl(var(--primary)))/5"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => handlePresetModeChange("custom")}
                >
                  {presetMode === "custom" ? (
                    <CircleCheck
                      className="size-5 shrink-0"
                      style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                    />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground/50" />
                  )}
                  <span className={`text-sm font-semibold ${presetMode === "custom" ? "text-foreground" : "text-muted-foreground"}`}>
                    {t("chooseIngredients")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {product.modifierGroups.length > 0 && (!showPresetToggle || presetMode === "custom") && (
            <div className="px-5 space-y-5 pb-6">
              {!showPresetToggle && <div className="h-px bg-border" />}
              {product.modifierGroups.map((group) => {
                const selected = selectedModifiers.get(group.id) || new Set();
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-foreground">
                        {group.name}
                      </h3>
                      {(group.freeCount ?? 0) > 0 && (
                        <span
                          className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: "color-mix(in srgb, var(--brand-primary, hsl(var(--primary))) 15%, transparent)",
                            color: "var(--brand-primary, hsl(var(--primary)))",
                          }}
                        >
                          {t("freeIncluded", { count: group.freeCount! })}
                        </span>
                      )}
                    </div>
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

          {/* Order notes */}
          <div className="px-5 pb-5">
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
              >
                <MessageSquare className="size-4" />
                <span>{t("addNote")}</span>
              </button>
            ) : (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  {t("orderNote")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("notePlaceholder")}
                  maxLength={200}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            )}
          </div>
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
            <QuantityStepper
              variant="detail"
              quantity={quantity}
              onDecrement={(e) => { e.stopPropagation(); setQuantity(Math.max(isBogoActive ? 2 : 1, quantity - 1)); }}
              onIncrement={(e) => { e.stopPropagation(); setQuantity(quantity + 1); }}
            />

            {/* Submit button */}
            <Button
              variant="brand"
              className="flex-1 h-11 rounded-xl font-semibold text-[15px]"
              onClick={handleSubmit}
            >
              {isEditing ? t("updateOrder") : t("addToOrder")}&nbsp;&nbsp;{formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
    </div>
  );
};
