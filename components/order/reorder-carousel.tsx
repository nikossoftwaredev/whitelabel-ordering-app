"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";

interface ReorderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: {
    modifierOptionId: string;
    name: string;
    priceAdjustment: number;
  }[];
  product: { image: string | null } | null;
}

interface ReorderOrder {
  id: string;
  total: number;
  items: ReorderItem[];
}

interface ReorderCarouselProps {
  tenantSlug: string;
  availableProductIds: Set<string>;
}

export function ReorderCarousel({ tenantSlug, availableProductIds }: ReorderCarouselProps) {
  const t = useTranslations("OrderMenu");
  const formatPrice = useFormatPrice();
  const addItem = useCartStore((s) => s.addItem);

  const { data } = useQuery<{ orders: ReorderOrder[] }>({
    queryKey: [...queryKeys.orders.history(tenantSlug), "reorder"],
    queryFn: () =>
      fetch(`/api/tenants/${tenantSlug}/orders/history?limit=5&forReorder=true`).then(
        (r) => r.json()
      ),
  });

  const orders = data?.orders;

  if (!orders?.length) return null;

  const handleReorder = (order: ReorderOrder) => {
    let added = 0;
    const total = order.items.length;

    for (const item of order.items) {
      if (!availableProductIds.has(item.productId)) continue;

      addItem({
        productId: item.productId,
        productName: item.productName,
        productImage: item.product?.image ?? null,
        basePrice: item.unitPrice,
        quantity: item.quantity,
        modifiers: item.modifiers.map((m) => ({
          modifierOptionId: m.modifierOptionId,
          name: m.name,
          priceAdjustment: m.priceAdjustment,
        })),
        notes: "",
      });
      added++;
    }

    if (added === total) {
      toast.success(t("addedToCart", { count: added }));
    } else if (added > 0) {
      toast.success(t("addedToCartPartial", { added, total }));
    }
  };

  const formatItemsSummary = (items: ReorderItem[]) => {
    const maxShow = 2;
    const shown = items.slice(0, maxShow).map(
      (item) => `${item.quantity}x ${item.productName}`
    );
    const remaining = items.length - maxShow;
    if (remaining > 0) {
      shown.push(t("andMore", { count: remaining }));
    }
    return shown;
  };

  return (
    <section className="px-4 pt-6">
      <h2 className="text-xl font-bold tracking-tight mb-1">{t("orderAgain")}</h2>
      <div className="h-px bg-border mb-3" />
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="inline-flex w-[180px] shrink-0 flex-col justify-between rounded-lg border bg-card p-3"
            >
              <div className="min-h-[52px]">
                {formatItemsSummary(order.items).map((line, i) => (
                  <p
                    key={i}
                    className="truncate text-sm text-muted-foreground whitespace-normal leading-tight"
                  >
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {formatPrice(order.total)}
                </span>
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => handleReorder(order)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}
