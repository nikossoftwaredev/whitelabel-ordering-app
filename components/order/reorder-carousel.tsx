"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";

import { DIALOG_KEYS } from "@/components/dialog-provider";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatPrice } from "@/hooks/use-format-price";
import { queryKeys } from "@/lib/query/keys";
import { useDialogStore } from "@/lib/stores/dialog-store";

export interface ReorderItem {
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

export interface ReorderOrder {
  id: string;
  total: number;
  items: ReorderItem[];
}

interface ReorderCarouselProps {
  tenantSlug: string;
  availableProductIds: Set<string>;
}

export function ReorderCarousel({
  tenantSlug,
  availableProductIds,
}: ReorderCarouselProps) {
  const t = useTranslations("Menu");
  const formatPrice = useFormatPrice();
  const openDialog = useDialogStore((s) => s.openDialog);

  const { data, isLoading } = useQuery<{ orders: ReorderOrder[] }>({
    queryKey: [...queryKeys.orders.history(tenantSlug), "reorder"],
    queryFn: () =>
      fetch(
        `/api/tenants/${tenantSlug}/orders/history?limit=5&forReorder=true`,
      ).then((r) => r.json()),
  });

  const orders = data?.orders;

  const formatItemsSummary = (items: ReorderItem[]) => {
    const maxShow = 2;
    const shown = items
      .slice(0, maxShow)
      .map((item) => `${item.quantity}x ${item.productName}`);
    const remaining = items.length - maxShow;
    if (remaining > 0) {
      shown.push(t("andMore", { count: remaining }));
    }
    return shown;
  };

  return (
    <section className="px-4 pt-6">
      <h2 className="text-xl font-bold tracking-tight mb-1">
        {t("orderAgain")}
      </h2>
      <div className="h-px bg-border mb-3" />

      {isLoading ? (
        /* Skeleton cards while loading */
        <div className="flex gap-3 pb-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-48 shrink-0 rounded-xl border border-border/60 bg-card p-3.5 space-y-2"
            >
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3.5 w-24 rounded" />
              <div className="flex items-center justify-between mt-3">
                <Skeleton className="h-4 w-14 rounded" />
                <Skeleton className="size-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : !orders?.length ? (
        /* Empty state */
        <div className="flex items-center gap-3 py-6 text-muted-foreground">
          <ShoppingBag className="size-5 shrink-0" />
          <p className="text-sm">{t("noOrdersYet")}</p>
        </div>
      ) : (
        /* Order cards */
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-3">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() =>
                  openDialog(DIALOG_KEYS.REORDER, {
                    order,
                    availableProductIds: [...availableProductIds],
                  })
                }
                className="group inline-flex w-48 shrink-0 flex-col justify-between rounded-xl border border-border/60 bg-card p-3.5 text-left transition-all duration-300 hover:border-(--brand-primary,hsl(var(--primary)))/40 hover:shadow-[0_0_20px_-4px_var(--brand-primary,hsl(var(--primary)))/15] active:scale-[0.97] cursor-pointer"
              >
                {/* Items list */}
                <div className="min-h-13 space-y-0.5">
                  {formatItemsSummary(order.items).map((line, i) => (
                    <p
                      key={i}
                      className="truncate text-[13px] text-muted-foreground whitespace-normal leading-snug"
                    >
                      {line}
                    </p>
                  ))}
                </div>

                {/* Footer: price + reorder icon */}
                <div className="mt-3 flex items-center justify-between">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                  >
                    {formatPrice(order.total)}
                  </span>
                  <div
                    className="flex size-8 items-center justify-center rounded-full transition-colors duration-300 bg-(--brand-primary,hsl(var(--primary)))/10 group-hover:bg-(--brand-primary,hsl(var(--primary)))/20"
                  >
                    <RotateCcw
                      className="size-3.5 transition-transform duration-300 group-hover:-rotate-45"
                      style={{ color: "var(--brand-primary, hsl(var(--primary)))" }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </section>
  );
}
