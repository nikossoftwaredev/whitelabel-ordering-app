"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useTenant } from "@/components/tenant-provider";
import { useCartStore } from "@/lib/stores/cart-store";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ShoppingBag,
  RotateCcw,
  Package,
} from "lucide-react";

type OrderStatus =
  | "NEW"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "REJECTED";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderHistoryResponse {
  orders: Order[];
}

const statusConfig: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: "New",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  ACCEPTED: {
    label: "Accepted",
    className:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  PREPARING: {
    label: "Preparing",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  READY: {
    label: "Ready",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  COMPLETED: {
    label: "Completed",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  },
  REJECTED: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const OrderHistory = () => {
  const tenant = useTenant();
  const addItem = useCartStore((s) => s.addItem);

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
              <Button variant="ghost" size="icon" className="shrink-0 cursor-pointer">
                <ArrowLeft className="size-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-bold">Order History</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading ? (
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
        ) : !data?.orders?.length ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <Package className="size-16 text-muted-foreground/30" />
            <div>
              <h2 className="text-xl font-semibold">No orders yet</h2>
              <p className="text-muted-foreground mt-1">
                Your order history will appear here once you place an order.
              </p>
            </div>
            <Link href="/order">
              <Button className="cursor-pointer">
                <ShoppingBag className="size-4" />
                Browse Menu
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {data.orders.map((order) => {
              const status = statusConfig[order.status];
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    {/* Order header */}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        #{order.orderNumber}
                      </span>
                      <Badge
                        variant="secondary"
                        className={status.className}
                      >
                        {status.label}
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
                        {formatPrice(order.totalAmount)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => handleReorder(order)}
                      >
                        <RotateCcw className="size-4" />
                        Reorder
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
