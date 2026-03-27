"use client";

import { RotateCcw } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormatPrice } from "@/hooks/use-format-price";
import { useCartStore } from "@/lib/stores/cart-store";
import {
  selectDialogData,
  useDialogStore,
} from "@/lib/stores/dialog-store";

import { QuantityStepper } from "./quantity-stepper";
import type { ReorderItem, ReorderOrder } from "./reorder-carousel";


interface ItemState {
  item: ReorderItem;
  quantity: number;
}

export const ReorderContent = () => {
  const t = useTranslations("Menu");
  const formatPrice = useFormatPrice();
  const addItem = useCartStore((s) => s.addItem);
  const closeAll = useDialogStore((s) => s.closeAll);
  const dialogData = useDialogStore(selectDialogData) as {
    order: ReorderOrder;
    availableProductIds: string[];
  } | null;

  const [items, setItems] = useState<ItemState[]>(() => {
    if (!dialogData?.order) return [];
    const available = new Set(dialogData.availableProductIds);
    return dialogData.order.items
      .filter((item) => available.has(item.productId))
      .map((item) => ({ item, quantity: item.quantity }));
  });

  if (!dialogData?.order) return null;

  const updateQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((entry, i) =>
          i === index
            ? { ...entry, quantity: Math.max(0, entry.quantity + delta) }
            : entry,
        )
        .filter((entry) => entry.quantity > 0),
    );
  };


  const getLineTotal = (entry: ItemState) => {
    const modTotal = entry.item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
    return (entry.item.unitPrice + modTotal) * entry.quantity;
  };

  const totalPrice = items.reduce((sum, entry) => sum + getLineTotal(entry), 0);

  const handleAddToCart = () => {
    for (const entry of items) {
      addItem({
        productId: entry.item.productId,
        productName: entry.item.productName,
        productImage: entry.item.product?.image ?? null,
        basePrice: entry.item.unitPrice,
        quantity: entry.quantity,
        modifiers: entry.item.modifiers.map((m) => ({
          modifierOptionId: m.modifierOptionId,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        })),
        notes: "",
      });
    }
    toast.success(t("addedToCart", { count: items.length }));
    closeAll();
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">

      <DialogHeader>
        <DialogTitle className="text-lg font-bold flex items-center gap-2">
          <RotateCcw className="size-4.5" style={{ color: "var(--brand-primary, hsl(var(--primary)))" }} />
          {t("orderAgain")}
        </DialogTitle>
      </DialogHeader>


      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <p className="text-muted-foreground text-sm">{t("reorderEmpty")}</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 min-h-0"><div className="px-4 py-2">
          {items.map((entry, index) => (
            <div key={entry.item.id} className="flex items-center gap-3 py-3 border-b border-border last:border-b-0">

              <div className="relative shrink-0 size-14 rounded-lg overflow-hidden bg-muted">
                {entry.item.product?.image ? (
                  <Image
                    src={entry.item.product.image}
                    alt={entry.item.productName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <RotateCcw className="size-4 text-muted-foreground/30" />
                  </div>
                )}
              </div>


              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground leading-tight truncate">
                  {entry.item.productName}
                </h4>
                {entry.item.modifiers.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {entry.item.modifiers.map((m) => m.name).join(", ")}
                  </p>
                )}
                <p
                  className="text-sm font-semibold mt-1 tabular-nums"
                  style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                >
                  {formatPrice(getLineTotal(entry))}
                </p>
              </div>


              <QuantityStepper
                quantity={entry.quantity}
                onDecrement={() => updateQuantity(index, -1)}
                onIncrement={() => updateQuantity(index, 1)}
              />
            </div>
          ))}
        </div></ScrollArea>
      )}

      {items.length > 0 && (
        <div className="border-t border-border p-4 pb-6 sm:pb-4 space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {t("reorderItemCount", { count: items.length })}
            </span>
            <span className="text-lg font-bold text-foreground tabular-nums">
              {formatPrice(totalPrice)}
            </span>
          </div>
          <Button
            variant="brand"
            className="w-full h-12 rounded-xl text-[15px] font-semibold"
            onClick={handleAddToCart}
          >
            {t("reorderAddToCart")}
          </Button>
        </div>
      )}
    </div>
  );
};
