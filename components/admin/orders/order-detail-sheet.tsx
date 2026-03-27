"use client";

import {
  Banknote,
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  CreditCard,
  MapPin,
  Phone,
  RotateCcw,
  Truck,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { PresetBadge } from "@/components/preset-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/general/formatters";
import { orderStatusConfig } from "@/lib/general/status-config";

import type { Order } from "./types";

// ── Props ────────────────────────────────────────────────────────────────────

interface OrderDetailSheetProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: (orderId: string) => void;
  onConfirmAccept: (orderId: string, minutes: number) => void;
  onReject: (orderId: string, reason: string) => void;
  onStartPreparing: (orderId: string) => void;
  onMarkReady: (orderId: string) => void;
  onOutForDelivery: (orderId: string) => void;
  onComplete: (orderId: string) => void;
  onRefund: (orderId: string, amount?: number, reason?: string) => void;
  formatPrice: (cents: number) => string;
  isPending: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
  onConfirmAccept,
  onReject,
  onStartPreparing,
  onMarkReady,
  onOutForDelivery,
  onComplete,
  onRefund,
  formatPrice,
  isPending,
}: OrderDetailSheetProps) {
  // Local state
  const [acceptingMode, setAcceptingMode] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(15);
  const [rejectingMode, setRejectingMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [refundingMode, setRefundingMode] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [isFullRefund, setIsFullRefund] = useState(true);

  // Reset local state when order changes
  useEffect(() => {
    setAcceptingMode(false);
    setEstimatedMinutes(15);
    setRejectingMode(false);
    setRejectionReason("");
    setRefundingMode(false);
    setRefundAmount("");
    setRefundReason("");
    setIsFullRefund(true);
  }, [order]);

  if (!order) return null;

  const status = orderStatusConfig[order.status];

  const handleAccept = () => {
    if (acceptingMode) {
      onConfirmAccept(order.id, estimatedMinutes);
    } else {
      setAcceptingMode(true);
    }
  };

  const handleReject = () => {
    if (rejectingMode && rejectionReason.trim()) {
      onReject(order.id, rejectionReason.trim());
    } else {
      setRejectingMode(true);
      setRejectionReason("");
    }
  };

  const handleRefund = () => {
    if (refundingMode) {
      const amount = isFullRefund
        ? undefined
        : parseInt(refundAmount) || undefined;
      onRefund(order.id, amount, refundReason.trim() || undefined);
    } else {
      setRefundingMode(true);
      setRefundAmount(String(order.total));
      setRefundReason("");
      setIsFullRefund(true);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span>Order #{order.orderNumber}</span>
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Scheduled badge */}
          {order.scheduledFor && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2.5 py-1 w-fit">
              <Clock className="size-3" />
              Scheduled:{" "}
              {new Date(order.scheduledFor).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}

          {/* Payment method */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {order.paymentMethod === "STRIPE" ? (
              <CreditCard className="size-3.5" />
            ) : (
              <Banknote className="size-3.5" />
            )}
            {order.paymentMethod === "STRIPE" ? "Card payment" : "Cash"}
          </div>

          {/* Customer info */}
          {(order.customerName || order.customer) && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {order.customerName && (
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  {order.customerName}
                </span>
              )}
              {order.customer?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {order.customer.phone}
                </span>
              )}
            </div>
          )}

          {/* Delivery address */}
          {order.deliveryAddress && (
            <div>
              <div className="flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 mt-0.5 shrink-0" />
                <span>{order.deliveryAddress}</span>
              </div>
              {order.deliveryAddressDetails &&
                (() => {
                  const d = order.deliveryAddressDetails as {
                    locationType?: string;
                    floor?: string;
                    apartmentNumber?: string;
                    companyName?: string;
                    entrance?: string;
                    accessDetails?: string;
                    deliveryInstructions?: string;
                  };
                  const hasDetails =
                    d.floor ||
                    d.apartmentNumber ||
                    d.companyName ||
                    d.entrance ||
                    d.deliveryInstructions;
                  if (!hasDetails) return null;
                  return (
                    <div className="text-sm text-muted-foreground space-y-0.5 mt-1 ml-4.5">
                      {d.floor && (
                        <p>
                          Floor {d.floor}
                          {d.apartmentNumber
                            ? `, Apt ${d.apartmentNumber}`
                            : ""}
                        </p>
                      )}
                      {d.companyName && <p>{d.companyName}</p>}
                      {d.entrance && (
                        <p>
                          {(() => {
                            const labels: Record<string, string> = {
                              door_code: "Door code",
                              door_open: "Door is open",
                              doorbell: "Doorbell",
                            };
                            return labels[d.entrance ?? ""] ?? d.entrance;
                          })()}
                          {d.accessDetails ? `: ${d.accessDetails}` : ""}
                        </p>
                      )}
                      {d.deliveryInstructions && (
                        <p className="italic">{d.deliveryInstructions}</p>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Time */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3.5" />
            {timeAgo(order.createdAt)}
            <span className="ml-1 text-xs">
              (
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
              )
            </span>
          </div>

          <Separator />

          {/* Items */}
          <ul className="space-y-3">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="pb-3 border-b border-border/50 last:border-b-0 last:pb-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-base font-bold tabular-nums shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="font-semibold text-[15px]">
                      {item.productName}
                    </span>
                    {item.isPreset && <PresetBadge />}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground shrink-0">
                    {formatPrice(item.unitPrice * item.quantity)}
                  </span>
                </div>
                {item.modifiers.length > 0 && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {item.modifiers.map((m, mi) => (
                      <div
                        key={mi}
                        className="flex items-center justify-between text-sm text-muted-foreground"
                      >
                        <span>+ {m.name}</span>
                        {m.priceAdjustment > 0 && (
                          <span className="text-xs">
                            {formatPrice(m.priceAdjustment)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {/* Customer notes */}
          {order.customerNote && (
            <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {order.customerNote}
              </p>
            </div>
          )}

          <Separator />

          {/* Total */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">
              {formatPrice(order.total)}
            </span>
            <div className="flex items-center gap-2">
              {order.promoCode && order.promoDiscount > 0 && (
                <span className="text-xs text-green-600">
                  -{formatPrice(order.promoDiscount)} ({order.promoCode})
                </span>
              )}
              {order.couponDiscount > 0 && (
                <span className="text-xs text-green-600">
                  -{formatPrice(order.couponDiscount)} coupon
                </span>
              )}
              {order.groupDiscount > 0 && (
                <span className="text-xs text-green-600">
                  -{formatPrice(order.groupDiscount)}
                  {order.groupDiscountName ? ` (${order.groupDiscountName})` : " group"}
                </span>
              )}
              {order.tipAmount > 0 && (
                <span className="text-xs text-muted-foreground">
                  incl. {formatPrice(order.tipAmount)} tip
                </span>
              )}
            </div>
          </div>

          {/* Rejection reason display */}
          {order.status === "REJECTED" && order.rejectionReason && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Reason: {order.rejectionReason}
            </p>
          )}

          {/* Cancelled by customer display */}
          {order.status === "CANCELLED" && (
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Cancelled by customer
            </p>
          )}

          {/* Refunded badge */}
          {order.paymentStatus === "REFUNDED" && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-2.5 py-1 w-fit">
              <RotateCcw className="size-3" />
              Refunded
            </div>
          )}

          {/* Refund inline form */}
          {refundingMode && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={isFullRefund}
                    onChange={() => setIsFullRefund(true)}
                  />
                  Full refund ({formatPrice(order.total)})
                </label>
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFullRefund}
                    onChange={() => setIsFullRefund(false)}
                  />
                  Partial
                </label>
              </div>
              {!isFullRefund && (
                <Input
                  type="number"
                  placeholder="Amount in cents"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="h-8"
                  min={1}
                  max={order.total}
                />
              )}
              <Textarea
                placeholder="Reason for refund (optional)"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={
                    !isFullRefund &&
                    (!refundAmount || parseInt(refundAmount) <= 0)
                  }
                  onClick={handleRefund}
                >
                  Confirm Refund
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => {
                    setRefundingMode(false);
                    setRefundAmount("");
                    setRefundReason("");
                    setIsFullRefund(true);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Rejection textarea (inline) */}
          {rejectingMode && (
            <div className="space-y-2">
              <Textarea
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={!rejectionReason.trim() || isPending}
                  onClick={handleReject}
                >
                  Confirm Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => {
                    setRejectingMode(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Accept with time input */}
          {acceptingMode && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="sheet-prep-time"
                  className="text-sm whitespace-nowrap"
                >
                  Prep time (min)
                </Label>
                <Input
                  id="sheet-prep-time"
                  type="number"
                  min={1}
                  max={180}
                  value={estimatedMinutes || ""}
                  onChange={(e) =>
                    setEstimatedMinutes(
                      e.target.value === "" ? 0 : parseInt(e.target.value),
                    )
                  }
                  className="w-20 h-8"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAccept}
                  disabled={isPending}
                >
                  <Check className="size-4" />
                  Confirm Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setAcceptingMode(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!rejectingMode && !acceptingMode && (
            <div className="flex gap-2">
              {order.status === "NEW" && (
                <>
                  <Button
                    size="sm"
                    className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleAccept}
                    disabled={isPending}
                  >
                    <Check className="size-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={handleReject}
                    disabled={isPending}
                  >
                    <X className="size-4" />
                    Reject
                  </Button>
                </>
              )}
              {order.status === "ACCEPTED" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer"
                  onClick={() => onStartPreparing(order.id)}
                  disabled={isPending}
                >
                  <ChefHat className="size-4" />
                  Start Preparing
                </Button>
              )}
              {order.status === "PREPARING" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onMarkReady(order.id)}
                  disabled={isPending}
                >
                  <Bell className="size-4" />
                  Mark Ready
                </Button>
              )}
              {order.status === "READY" && (
                <div className="flex gap-2 w-full">
                  {order.orderType === "DELIVERY" && (
                    <Button
                      size="sm"
                      className="flex-1 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => onOutForDelivery(order.id)}
                      disabled={isPending}
                    >
                      <Truck className="size-4" />
                      Out for Delivery
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 cursor-pointer"
                    onClick={() => onComplete(order.id)}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="size-4" />
                    Complete
                  </Button>
                </div>
              )}
              {order.status === "DELIVERING" && (
                <Button
                  size="sm"
                  className="flex-1 cursor-pointer bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onComplete(order.id)}
                  disabled={isPending}
                >
                  <CheckCircle2 className="size-4" />
                  Delivered
                </Button>
              )}
              {(order.status === "COMPLETED" ||
                order.status === "REJECTED") &&
                order.paymentStatus === "PAID" &&
                order.paymentMethod === "STRIPE" &&
                !refundingMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 cursor-pointer text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950"
                    onClick={handleRefund}
                  >
                    <RotateCcw className="size-4" />
                    Refund
                  </Button>
                )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
