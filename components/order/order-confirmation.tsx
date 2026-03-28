"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
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
  MapPin,
  MessageCircle,
  PartyPopper,
  Truck,
  XCircle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { CONFIRM_DIALOG } from "@/components/confirm-dialog";
import { DIALOG_KEYS } from "@/components/dialog-provider";
import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import type { OrderStatus } from "@/lib/general/status-config";
import { cn } from "@/lib/general/utils";
import { Link } from "@/lib/i18n/navigation";
import { buildMapUrl, MAPS_KEY } from "@/lib/maps/static-map";
import { useDialogStore } from "@/lib/stores/dialog-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const RING_SIZE = 200;
const STROKE_WIDTH = 10;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const PICKUP_PROGRESS: Record<string, number> = {
  NEW: 0.1, ACCEPTED: 0.35, PREPARING: 0.65, READY: 1.0, COMPLETED: 1.0,
};
const DELIVERY_PROGRESS: Record<string, number> = {
  NEW: 0.08, ACCEPTED: 0.25, PREPARING: 0.5, READY: 0.75, DELIVERING: 0.9, COMPLETED: 1.0,
};

const PICKUP_STEPS = ["NEW", "ACCEPTED", "PREPARING", "READY"] as const;
const DELIVERY_STEPS = ["NEW", "ACCEPTED", "PREPARING", "READY", "DELIVERING"] as const;

const STEP_ICONS: Record<string, typeof Clock> = {
  NEW: Clock, ACCEPTED: Check, PREPARING: ChefHat,
  READY: HandPlatter, DELIVERING: Truck, COMPLETED: PartyPopper,
};

const RING_COLORS: Record<string, string> = {
  NEW: "#f59e0b", ACCEPTED: "#3b82f6", PREPARING: "#f97316",
  READY: "#22c55e", DELIVERING: "#8b5cf6", COMPLETED: "#22c55e",
};

export const OrderConfirmation = () => {
  const t = useTranslations("OrderConfirmation");
  const openDialog = useDialogStore((s) => s.openDialog);
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const orderNumber = searchParams.get("orderNumber") || "---";
  const tenant = useTenant();
  const { resolvedTheme } = useTheme();

  const [status, setStatus] = useState<OrderStatus>("NEW");
  const [orderType, setOrderType] = useState<"PICKUP" | "DELIVERY" | "DINE_IN">("PICKUP");
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [orderCreatedAt, setOrderCreatedAt] = useState<string | null>(null);
  const [estimatedReadyAt, setEstimatedReadyAt] = useState<string | null>(null);
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const { isSupported: pushSupported, permission, isSubscribed, subscribe } = usePushSubscription("customer");
  const [pushDismissed, setPushDismissed] = useState(false);
  const showPushPrompt = pushSupported && permission === "default" && !isSubscribed && !pushDismissed;

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tenants/${tenant.slug}/orders/${orderId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to cancel order");
    },
    onSuccess: () => { setStatus("CANCELLED"); toast.success(t("cancelSuccess")); },
    onError: () => { toast.error(t("cancelError")); },
  });

  const handleCancel = () => {
    openDialog(CONFIRM_DIALOG, {
      title: t("cancelConfirm"),
      description: t("cancelConfirm"),
      actionLabel: t("cancelOrder"),
    }, () => cancelMutation.mutate());
  };

  // Fetch initial order state
  useEffect(() => {
    if (!orderId || !tenant.slug) return;
    fetch(`/api/tenants/${tenant.slug}/orders/active`)
      .then((r) => r.json())
      .then((data) => {
        if (data.order) {
          setStatus(data.order.status);
          if (data.order.orderType) setOrderType(data.order.orderType);
          if (data.order.scheduledFor) setScheduledFor(data.order.scheduledFor);
          if (data.order.createdAt) setOrderCreatedAt(data.order.createdAt);
          if (data.order.estimatedReadyAt) setEstimatedReadyAt(data.order.estimatedReadyAt);
          if (data.order.deliveryAddress) setDeliveryAddress(data.order.deliveryAddress);
          // Extract delivery coordinates from the JSON details field
          const details = data.order.deliveryAddressDetails as Record<string, unknown> | null;
          if (details?.lat != null && details?.lng != null) {
            setDeliveryLat(Number(details.lat));
            setDeliveryLng(Number(details.lng));
          }
        }
        setConnected(true);
      })
      .catch(() => {});
  }, [orderId, tenant.slug]);

  // Supabase Realtime + reconnect refetch (no polling)
  useEffect(() => {
    if (!orderId) return;
    const supabase = getSupabaseBrowserClient();
    let everSubscribed = false;
    const channel = supabase
      .channel(`order:${orderId}`)
      .on("broadcast", { event: "status_change" }, ({ payload }) => {
        setStatus(payload.status as OrderStatus);
        if (payload.estimatedReadyAt) setEstimatedReadyAt(payload.estimatedReadyAt as string);
      })
      .subscribe(async (realtimeStatus) => {
        if (realtimeStatus !== "SUBSCRIBED") return;
        if (everSubscribed) {
          try {
            const res = await fetch(`/api/tenants/${tenant.slug}/orders/active`);
            const data = await res.json();
            if (data.order) {
              setStatus(data.order.status);
              if (data.order.estimatedReadyAt) setEstimatedReadyAt(data.order.estimatedReadyAt);
            }
          } catch {}
        }
        everSubscribed = true;
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, [orderId, tenant.slug]);

  const isDelivery = orderType === "DELIVERY";
  const isRejected = status === "REJECTED";
  const isCancelled = status === "CANCELLED";
  const isCompleted = status === "COMPLETED";
  const isReady = status === "READY";
  const isTerminal = isCompleted || isRejected || isCancelled;

  const progressMap = isDelivery ? DELIVERY_PROGRESS : PICKUP_PROGRESS;
  const progress = progressMap[status] ?? 0;
  const strokeOffset = CIRCUMFERENCE * (1 - progress);
  const ringColor = RING_COLORS[status] ?? RING_COLORS.NEW;
  const steps = isDelivery ? DELIVERY_STEPS : PICKUP_STEPS;
  const currentStepIdx = (steps as readonly string[]).indexOf(status);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isTerminal || isReady || !estimatedReadyAt) return;
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [isTerminal, isReady, estimatedReadyAt]);

  const estimatedMinutes = useMemo(() => {
    if (isTerminal || isReady) return 0;
    if (estimatedReadyAt) {
      const remaining = Math.round((new Date(estimatedReadyAt).getTime() - now) / 60_000);
      return Math.max(1, remaining);
    }
    return tenant.prepTimeMinutes || 20;
  }, [status, estimatedReadyAt, now, tenant.prepTimeMinutes, isTerminal, isReady]);

  const friendlyTitle = useMemo(() => {
    if (isCompleted) return t("friendlyCompleted");
    if (status === "NEW") return t("friendlyNew");
    if (status === "ACCEPTED") return t("friendlyAccepted");
    if (status === "PREPARING") return t("friendlyPreparing");
    if (status === "READY") return t("friendlyReady");
    if (status === "DELIVERING") return t("friendlyDelivering");
    return "";
  }, [status, isCompleted, t]);

  const friendlySub = useMemo(() => {
    if (isCompleted) return t("friendlyCompletedSub");
    if (status === "NEW") return t("friendlyNewSub");
    if (status === "ACCEPTED") return t("friendlyAcceptedSub");
    if (status === "PREPARING") return t("friendlyPreparingSub");
    if (status === "READY") return t("friendlyReadySub");
    if (status === "DELIVERING") return t("friendlyDeliveringSub");
    return "";
  }, [status, isCompleted, t]);

  const displayNumber = orderNumber.startsWith("#") ? orderNumber : `#${orderNumber}`;
  const StatusIcon = STEP_ICONS[status] ?? Clock;

  // Build theme-aware map URL — memoized since URLSearchParams + style loop runs on every render
  const mapUrl = useMemo(() => {
    if (!tenant.storeLat || !tenant.storeLng) return null;
    return buildMapUrl({
      storeLat: tenant.storeLat,
      storeLng: tenant.storeLng,
      deliveryLat: isDelivery ? deliveryLat : null,
      deliveryLng: isDelivery ? deliveryLng : null,
      dark: resolvedTheme === "dark",
    });
  }, [tenant.storeLat, tenant.storeLng, isDelivery, deliveryLat, deliveryLng, resolvedTheme]);

  // Change address — only while the kitchen hasn't started yet
  const canChangeAddress = isDelivery && (status === "NEW" || status === "ACCEPTED");

  // ── Rejected / Cancelled ─────────────────────────────────
  if (isRejected || isCancelled) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
        <div className={cn(
          "size-32 rounded-full flex items-center justify-center mb-8",
          isRejected ? "bg-red-500/10" : "bg-orange-500/10",
        )}>
          <XCircle className={cn("size-16", isRejected ? "text-red-500" : "text-orange-500")} />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {isRejected ? t("orderDeclined", { number: displayNumber }) : t("orderCancelled", { number: displayNumber })}
        </h1>
        <p className="text-muted-foreground max-w-sm mb-10 text-sm leading-relaxed">
          {isRejected ? t("declinedDesc") : t("cancelledDesc")}
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/order">
            <ArrowLeft className="size-4 mr-2" />
            {t("backToMenu")}
          </Link>
        </Button>
      </div>
    );
  }

  // ── Main tracking view ───────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen pb-28">

      {/* ── Map ─────────────────────────────────────────────
          Full-width static map. Fades into the page background at the
          bottom so the ring floats naturally over the transition. */}
      {mapUrl && (
        <div className="relative w-full h-52 shrink-0 overflow-hidden">
          <img
            src={mapUrl}
            alt="Order map"
            className="w-full h-full object-cover"
          />
          {/* Gradient fade into page background */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-background to-transparent" />
        </div>
      )}

      {/* ── Ring row: [chat] [ring] [history] ───────────────
          Negative margin pulls the ring up over the map fade zone. */}
      <div className={cn(
        "flex items-center justify-center gap-5 px-6",
        mapUrl ? "-mt-24" : "mt-12",
      )}>
        {/* Chat */}
        <button
          onClick={() => openDialog(DIALOG_KEYS.CHAT, { orderId, orderNumber })}
          className="size-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors duration-300 cursor-pointer shrink-0"
          aria-label="Chat with store"
        >
          <MessageCircle className="size-5 text-foreground" />
        </button>

        {/* Progress ring */}
        <div className="relative shrink-0 drop-shadow-xl">
          <div
            className="absolute inset-0 rounded-full blur-2xl opacity-25 transition-colors duration-700"
            style={{ backgroundColor: ringColor }}
          />
          <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke="currentColor"
              className="text-muted/30" strokeWidth={STROKE_WIDTH}
            />
            <circle
              cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS}
              fill="none" stroke={ringColor}
              strokeWidth={STROKE_WIDTH} strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeOffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isCompleted ? (
              <PartyPopper className="size-10 text-green-500" />
            ) : isReady ? (
              <>
                <HandPlatter className="size-9 text-green-500 mb-0.5" />
                <span className="text-xs font-semibold text-green-500">{t("stepReady")}</span>
              </>
            ) : estimatedMinutes > 0 ? (
              <>
                <span className="text-4xl font-black tabular-nums leading-none" style={{ color: ringColor }}>
                  {estimatedMinutes}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5 font-medium">{t("minutes")}</span>
              </>
            ) : (
              <StatusIcon className="size-9" style={{ color: ringColor }} />
            )}
          </div>
        </div>

        {/* Order history */}
        <Link
          href="/order/orders"
          className="size-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors duration-300 shrink-0"
          aria-label={t("orderHistory")}
        >
          <ClipboardList className="size-5 text-foreground" />
        </Link>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex flex-col items-center px-6 mt-5">

        {/* Order number + live dot */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {t("orderTitle", { number: displayNumber })}
          </span>
          {connected && !isTerminal && (
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-green-500" />
            </span>
          )}
        </div>

        {orderCreatedAt && (
          <span className="text-[11px] text-muted-foreground/70 mb-2">
            {t("placedAt", {
              time: new Date(orderCreatedAt).toLocaleTimeString(undefined, {
                hour: "2-digit", minute: "2-digit",
              }),
            })}
          </span>
        )}

        {/* Scheduled badge */}
        {scheduledFor && (
          <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full px-4 py-1.5 mb-3 text-xs font-medium">
            <CalendarClock className="size-3.5 shrink-0" />
            <span>
              {t("scheduledForTime", {
                time: new Date(scheduledFor).toLocaleString(undefined, {
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                }),
              })}
            </span>
          </div>
        )}

        {/* Store name */}
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
          {tenant.name}
        </p>

        {/* Status headline */}
        <h2 className="text-xl font-bold mb-1 text-center transition-all duration-300">
          {friendlyTitle}
        </h2>
        <p className="text-sm text-muted-foreground max-w-xs text-center leading-relaxed mb-6">
          {friendlySub}
        </p>

        {/* Step indicators */}
        <div className="flex items-center gap-1 mb-6">
          {steps.map((step, idx) => {
            const isDone = currentStepIdx > idx;
            const isCurrent = currentStepIdx === idx;
            const StepIcon = STEP_ICONS[step];
            return (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-500",
                  isDone && "size-8 bg-primary text-primary-foreground",
                  isCurrent && "size-10 border-2 border-primary bg-primary/10 text-primary",
                  !isDone && !isCurrent && "size-8 bg-muted/50 text-muted-foreground/40",
                )}>
                  {isDone ? (
                    <Check className="size-4" />
                  ) : (
                    <StepIcon className={cn("size-4", isCurrent && "size-5")} />
                  )}
                </div>
                {idx < steps.length - 1 && (
                  <div className={cn(
                    "w-6 h-0.5 transition-colors duration-500",
                    isDone ? "bg-primary" : "bg-muted/50",
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Change address — delivery only, before kitchen starts */}
        {canChangeAddress && (
          <button
            onClick={() => openDialog(DIALOG_KEYS.ADDRESS_MANAGER)}
            className="flex items-center gap-1.5 text-sm mb-4 cursor-pointer group"
          >
            <MapPin className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors duration-200 shrink-0" />
            <span className="text-muted-foreground truncate max-w-50 group-hover:text-foreground transition-colors duration-200">
              {deliveryAddress ?? t("deliveryAddress")}
            </span>
            <span className="text-xs text-primary underline underline-offset-2 shrink-0">
              {t("changeAddress")}
            </span>
          </button>
        )}

        {/* Push notification prompt */}
        {showPushPrompt && (
          <div className="rounded-xl border bg-card p-4 space-y-3 w-full max-w-xs mb-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">{t("pushPromptTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("pushPromptDescription")}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => subscribe()}>{t("pushPromptAccept")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setPushDismissed(true)}>
                {t("pushPromptDismiss")}
              </Button>
            </div>
          </div>
        )}

        {/* Cancel — NEW orders only */}
        {status === "NEW" && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
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
        )}
      </div>
    </div>
  );
};
