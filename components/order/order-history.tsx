"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Package,
  RotateCcw,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { useTenant } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useFormatPrice } from "@/hooks/use-format-price";
import { formatDate } from "@/lib/general/formatters";
import { ACTIVE_ORDER_STATUSES, OrderStatus, orderStatusConfig } from "@/lib/general/status-config";
import { Link } from "@/lib/i18n/navigation";
import { queryKeys } from "@/lib/query/keys";
import { useCartStore } from "@/lib/stores/cart-store";
import { useDialogStore } from "@/lib/stores/dialog-store";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderHistoryResponse {
  orders: Order[];
}

export const OrderHistory = () => {
  const t = useTranslations("OrderHistory");
  const tStatus = useTranslations("OrderStatus");
  const openDialog = useDialogStore((s) => s.openDialog);
  const tenant = useTenant();
  const formatPrice = useFormatPrice();
  const addItem = useCartStore((s) => s.addItem);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<OrderHistoryResponse>({
    queryKey: queryKeys.orders.history(tenant.slug),
    queryFn: async () => {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/orders/history?limit=20&offset=0`
      );
      if (!res.ok) throw new Error("Failed to fetch order history");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/orders/${orderId}/cancel`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to cancel order");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.history(tenant.slug),
      });
      toast.success(t("cancelSuccess"));
    },
    onError: () => {
      toast.error(t("cancelError"));
    },
  });

  const handleCancel = (orderId: string) => {
    openDialog(
      CONFIRM_DIALOG,
      {
        title: t("cancelConfirm"),
        description: t("cancelConfirm"),
        actionLabel: t("cancelOrder"),
      },
      () => cancelMutation.mutate(orderId)
    );
  };

  const handleReorder = (order: Order) => {
    for (const item of order.items) {
      addItem({
        productId: "",
        productName: item.productName,
        productImage: null,
        basePrice: item.unitPrice,
        quantity: item.quantity,
        modifiers: [],
        notes: "",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/order">
              <Button variant="ghost" size="icon" className="shrink-0">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">{t("title")}</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-40" />
                  <Separator />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-9 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!isLoading && !data?.orders?.length && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Package className="size-16 text-muted-foreground/30" />
            <div>
              <h2 className="text-xl font-semibold">{t("noOrders")}</h2>
              <p className="text-muted-foreground mt-1">
                {t("noOrdersDesc")}
              </p>
            </div>
            <Link href="/order">
              <Button className="cursor-pointer">
                <ShoppingBag className="size-4" />
                {t("browseMenu")}
              </Button>
            </Link>
          </div>
        )}
        {!isLoading && (data?.orders?.length ?? 0) > 0 && (
          <div className="space-y-4">
            {data!.orders.map((order) => {
              const statusCfg = orderStatusConfig[order.status];
              const isActive = ACTIVE_ORDER_STATUSES.includes(order.status);
              const isNew = order.status === "NEW";
              const isCancelling =
                cancelMutation.isPending &&
                cancelMutation.variables === order.id;
              const card = (
                <Card>
                  <CardContent className="p-4">
                    {/* Order header */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{order.orderNumber}
                      </span>
                      <Badge
                        variant="secondary"
                        className={statusCfg.className}
                      >
                        {tStatus(order.status)}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(order.createdAt)}
                    </p>

                    <Separator className="my-3" />

                    {/* Items */}
                    <ul className="space-y-1">
                      {order.items.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {item.productName}{" "}
                            <span className="text-muted-foreground">
                              x{item.quantity}
                            </span>
                          </span>
                          <span className="text-muted-foreground">
                            {formatPrice(item.unitPrice * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Separator className="my-3" />

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {formatPrice(order.total)}
                      </span>
                      {isActive && isNew && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer text-destructive border-destructive/50 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancel(order.id);
                          }}
                          disabled={isCancelling}
                        >
                          {isCancelling ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <XCircle className="size-4" />
                          )}
                          {t("cancel")}
                        </Button>
                      )}
                      {isActive && !isNew && (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer"
                          onClick={() => handleReorder(order)}
                        >
                          <RotateCcw className="size-4" />
                          {t("reorder")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              return isActive ? (
                <Link
                  key={order.id}
                  href={`/order/confirmation?orderId=${order.id}&orderNumber=${encodeURIComponent(order.orderNumber)}`}
                  className="block"
                >
                  {card}
                </Link>
              ) : (
                <div key={order.id}>{card}</div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
