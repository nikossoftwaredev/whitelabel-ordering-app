"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ChefHat,
  ClipboardList,
  Clock,
  HandPlatter,
  Loader2,
  Truck,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/lib/general/status-config";
import { cn } from "@/lib/general/utils";
import { Link } from "@/lib/i18n/navigation";

// Step indices for pickup orders (4 steps)
const PICKUP_STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERING: 3,
  COMPLETED: 4,
  REJECTED: -1,
  CANCELLED: -1,
};

// Step indices for delivery orders (5 steps)
const DELIVERY_STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERING: 4,
  COMPLETED: 5,
  REJECTED: -1,
  CANCELLED: -1,
};

export const OrderConfirmation = () => {
  const t = useTranslations("OrderConfirmation");
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const orderNumber = searchParams.get("orderNumber") || "---";
  const tenant = useTenant();
  const [status, setStatus] = useState<OrderStatus>("NEW");
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY" | "DINE_IN">("PICKUP");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/tenants/${tenant.slug}/orders/${orderId}/cancel`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to cancel order");
    },
    onSuccess: () => {
      setStatus("CANCELLED");
      toast.success(t("cancelSuccess"));
    },
    onError: () => {
      toast.error(t("cancelError"));
    },
  });

  const handleCancel = () => {
    if (window.confirm(t("cancelConfirm"))) {
      cancelMutation.mutate();
    }
  };

  const isDelivery = orderType === "DELIVERY";
  const STATUS_ORDER = isDelivery ? DELIVERY_STATUS_ORDER : PICKUP_STATUS_ORDER;

  const STEPS = isDelivery
    ? [
        { status: "NEW" as const, label: t("stepReceived"), icon: Clock },
        { status: "ACCEPTED" as const, label: t("stepAccepted"), icon: Check },
        { status: "PREPARING" as const, label: t("stepPreparing"), icon: ChefHat },
        { status: "READY" as const, label: t("stepReady"), icon: HandPlatter },
        { status: "DELIVERING" as const, label: t("stepDelivering"), icon: Truck },
      ]
    : [
        { status: "NEW" as const, label: t("stepReceived"), icon: Clock },
        { status: "ACCEPTED" as const, label: t("stepAccepted"), icon: Check },
        { status: "PREPARING" as const, label: t("stepPreparing"), icon: ChefHat },
        { status: "READY" as const, label: t("stepReady"), icon: HandPlatter },
      ];

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
        if (data.orderType) setOrderType(data.orderType);
        if (data.scheduledFor) setScheduledFor(data.scheduledFor);
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
  const isCancelled = status === "CANCELLED";
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
          {t("orderDeclined", { number: displayNumber })}
        </h1>
        <p className="text-muted-foreground max-w-sm mb-8">
          {t("declinedDesc")}
        </p>
        <Button asChild>
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            {t("backToMenu")}
          </Link>
        </Button>
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="relative mb-6">
          <XCircle className="size-20 text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {t("orderCancelled", { number: displayNumber })}
        </h1>
        <p className="text-muted-foreground max-w-sm mb-8">
          {t("cancelledDesc")}
        </p>
        <Button asChild>
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            {t("backToMenu")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Header */}
      <h1 className="text-2xl font-bold mb-1">{t("orderTitle", { number: displayNumber })}</h1>
      <p className="text-muted-foreground mb-4">
        {isCompleted ? t("orderComplete") : t("trackingLive")}
      </p>

      {/* Scheduled badge */}
      {scheduledFor && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-2 mb-6 text-sm font-medium">
          <CalendarClock className="size-4 shrink-0" />
          <span>
            {t("scheduledForTime", {
              time: new Date(scheduledFor).toLocaleString(undefined, {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </span>
        </div>
      )}

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
              {status === "NEW" && t("waitingForStore")}
              {status === "ACCEPTED" && t("storeAccepted")}
              {status === "PREPARING" && t("preparing")}
              {status === "READY" && (isDelivery ? t("readyForDelivery") : t("readyForPickup"))}
              {status === "DELIVERING" && t("outForDelivery")}
            </span>
          </>
        )}
        {!isCompleted && !connected && !orderId && (
          <span>{t("orderSubmitted")}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Button asChild className="flex-1">
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            {t("backToMenu")}
          </Link>
        </Button>
        <Button variant="outline" asChild className="flex-1">
          <Link href="/order/orders">
            <ClipboardList className="size-4 mr-2" />
            {t("orderHistory")}
          </Link>
        </Button>
      </div>

      {/* Cancel button - only for NEW orders */}
      {status === "NEW" && (
        <div className="mt-4 w-full max-w-xs">
          <Button
            variant="outline"
            className="w-full text-destructive border-destructive/50 hover:bg-destructive/10 cursor-pointer"
            onClick={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="size-4 mr-2" />
            )}
            {t("cancelOrder")}
          </Button>
        </div>
      )}
    </div>
  );
};
