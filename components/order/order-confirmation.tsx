"use client";

import { useSearchParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, ClipboardList } from "lucide-react";

export const OrderConfirmation = () => {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") || "---";

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Success icon with pulse animation */}
      <div className="relative mb-6">
        <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
        <CheckCircle className="relative size-20 text-green-500" />
      </div>

      <h1 className="text-2xl font-bold mb-2">
        Order {orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`} Confirmed!
      </h1>
      <p className="text-muted-foreground max-w-sm mb-8">
        Your order has been received and will be prepared shortly.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="flex-1 cursor-pointer">
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            Back to Menu
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1 cursor-pointer">
          <Link href="/order/orders">
            <ClipboardList className="size-4 mr-2" />
            Order History
          </Link>
        </Button>
      </div>
    </div>
  );
};
