"use client";

import {
  ArrowLeft,
  Check,
  ChefHat,
  ClipboardList,
  Clock,
  HandPlatter,
  Loader2,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/general/status-config";
import { cn } from "@/lib/general/utils";
import { Link } from "@/lib/i18n/navigation";

const STEPS = [
  { status: "NEW" as const, label: "Received", icon: Clock },
  { status: "ACCEPTED" as const, label: "Accepted", icon: Check },
  { status: "PREPARING" as const, label: "Preparing", icon: ChefHat },
  { status: "READY" as const, label: "Ready", icon: HandPlatter },
] as const;

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
  REJECTED: -1,
};

export const OrderConfirmation = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const orderNumber = searchParams.get("orderNumber") || "---";
  const tenant = useTenant();
  const [status, setStatus] = useState<OrderStatus>("NEW");
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orderId || !tenant.slug) return;

    let stopped = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(
        `/api/tenants/${tenant.slug}/orders/${orderId}/stream`
      );
      eventSourceRef.current = es;

      es.addEventListener("connected", (e) => {
        const data = JSON.parse(e.data);
        setStatus(data.status);
        setConnected(true);
      });

      es.addEventListener("status_change", (e) => {
        const data = JSON.parse(e.data);
        setStatus(data.status);
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        if (!stopped) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      stopped = true;
      eventSourceRef.current?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [orderId, tenant.slug]);

  const isRejected = status === "REJECTED";
  const isCompleted = status === "COMPLETED";
  const currentStepIndex = STATUS_ORDER[status];

  const displayNumber = orderNumber.startsWith("#")
    ? orderNumber
    : `#${orderNumber}`;

  if (isRejected) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-6">
          <XCircle className="size-20 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          Order {displayNumber} Declined
        </h1>
        <p className="text-muted-foreground max-w-sm mb-8">
          Unfortunately, the store was unable to accept your order. Please try
          again or contact the store.
        </p>
        <Button asChild>
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            Back to Menu
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-1">Order {displayNumber}</h1>
      <p className="text-muted-foreground mb-8">
        {isCompleted
          ? "Your order is complete! Thank you."
          : "Tracking your order live..."}
      </p>

      {/* Status stepper */}
      <div className="w-full max-w-md mb-10">
        <div className="flex items-center justify-between relative">
          {/* Progress line behind icons */}
          <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-muted" />
          <div
            className="absolute top-5 left-[10%] h-0.5 bg-primary transition-all duration-500"
            style={{
              width: `${Math.min(currentStepIndex / (STEPS.length - 1), 1) * 80}%`,
            }}
          />

          {STEPS.map((step, idx) => {
            const isDone = currentStepIndex > idx;
            const isCurrent = currentStepIndex === idx;
            const Icon = step.icon;

            return (
              <div
                key={step.status}
                className="flex flex-col items-center relative z-10"
              >
                <div
                  className={cn(
                    "flex items-center justify-center size-10 rounded-full border-2 transition-all duration-300",
                    isDone &&
                      "bg-primary border-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary/10 border-primary text-primary animate-pulse",
                    !isDone &&
                      !isCurrent &&
                      "bg-background border-muted text-muted-foreground"
                  )}
                >
                  {isDone && <Check className="size-5" />}
                  {!isDone && isCurrent && <Icon className="size-5" />}
                  {!isDone && !isCurrent && <Icon className="size-4" />}
                </div>
                <span
                  className={cn(
                    "text-xs mt-2 font-medium",
                    isDone && "text-primary",
                    isCurrent && "text-primary",
                    !isDone && !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current status message */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        {!isCompleted && connected && (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>
              {status === "NEW" && "Waiting for the store to accept..."}
              {status === "ACCEPTED" && "The store accepted your order!"}
              {status === "PREPARING" && "Your order is being prepared..."}
              {status === "READY" && "Your order is ready for pickup!"}
            </span>
          </>
        )}
        {!isCompleted && !connected && !orderId && (
          <span>Order submitted successfully.</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="flex-1">
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            Back to Menu
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/order/orders">
            <ClipboardList className="size-4 mr-2" />
            Order History
          </Link>
        </Button>
      </div>
    </div>
  );
};
