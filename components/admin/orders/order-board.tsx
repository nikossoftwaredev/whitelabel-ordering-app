"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  CreditCard,
  Banknote,
  MapPin,
  Store,
  Truck,
  User,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/general/formatters";
import {
  OrderStatus,
  orderStatusConfig,
  VALID_TRANSITIONS,
} from "@/lib/general/status-config";

import type { Order } from "./types";

// ── Constants ────────────────────────────────────────────────────────────────

const BOARD_COLUMNS: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const TERMINAL_STATUSES: OrderStatus[] = ["COMPLETED", "REJECTED", "CANCELLED"];

/** Map status → Tailwind dot color class */
const DOT_COLORS: Record<OrderStatus, string> = {
  NEW: "bg-blue-500",
  ACCEPTED: "bg-indigo-500",
  PREPARING: "bg-amber-500",
  READY: "bg-green-500",
  DELIVERING: "bg-purple-500",
  COMPLETED: "bg-gray-500",
  REJECTED: "bg-red-500",
  CANCELLED: "bg-orange-500",
};

const ORDER_TYPE_ICON = {
  PICKUP: Store,
  DELIVERY: Truck,
  DINE_IN: MapPin,
} as const;

const ORDER_TYPE_LABEL = {
  PICKUP: "Pickup",
  DELIVERY: "Delivery",
  DINE_IN: "Dine-in",
} as const;

// ── Props ────────────────────────────────────────────────────────────────────

interface OrderBoardProps {
  orders: Order[];
  onStatusChange: (
    orderId: string,
    newStatus: OrderStatus,
    extras?: {
      estimatedMinutes?: number;
      rejectionReason?: string;
    },
  ) => void;
  onOrderClick: (order: Order) => void;
  formatPrice: (cents: number) => string;
  isPending: boolean;
}

// ── DraggableOrderCard ───────────────────────────────────────────────────────

interface DraggableOrderCardProps {
  order: Order;
  onClick: () => void;
  formatPrice: (cents: number) => string;
  overlay?: boolean;
}

function DraggableOrderCard({
  order,
  onClick,
  formatPrice,
  overlay,
}: DraggableOrderCardProps) {
  const isTerminal = TERMINAL_STATUSES.includes(order.status);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: order.id,
    disabled: isTerminal,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const TypeIcon = ORDER_TYPE_ICON[order.orderType];

  return (
    <Card
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      className={cn(
        "cursor-grab active:cursor-grabbing select-none",
        "transition-shadow duration-300",
        isDragging && "opacity-50",
        isTerminal && "cursor-default opacity-70",
        overlay && "rotate-2 shadow-xl",
      )}
      onClick={(e) => {
        // Only fire click when not dragging
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <CardContent className="p-3 space-y-2">
        {/* Row 1: order number + time */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-sm">#{order.orderNumber}</span>
          <span className="text-xs text-muted-foreground">
            {timeAgo(order.createdAt)}
          </span>
        </div>

        {/* Scheduled badge */}
        {order.scheduledFor && (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
            <Clock className="mr-1 size-3" />
            Scheduled
          </Badge>
        )}

        {/* Row 2: customer + order type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm truncate">
              {order.customer?.name ?? "Guest"}
            </span>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            <TypeIcon className="mr-1 size-3" />
            {ORDER_TYPE_LABEL[order.orderType]}
          </Badge>
        </div>

        {/* Row 3: item count + payment + total */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
            {order.paymentMethod === "STRIPE" ? (
              <CreditCard className="size-3.5" />
            ) : (
              <Banknote className="size-3.5" />
            )}
          </div>
          <span className="font-bold text-sm">{formatPrice(order.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── DroppableColumn ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  status: OrderStatus;
  orders: Order[];
  onOrderClick: (order: Order) => void;
  formatPrice: (cents: number) => string;
}

function DroppableColumn({
  status,
  orders,
  onOrderClick,
  formatPrice,
}: DroppableColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const config = orderStatusConfig[status];

  return (
    <div
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] shrink-0",
        "rounded-xl border bg-muted/30 transition-all duration-300",
        isOver && "bg-primary/5 ring-2 ring-primary/20 ring-dashed rounded-xl",
      )}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center gap-2 p-3 bg-inherit rounded-t-xl border-b">
        <span
          className={cn("size-2.5 rounded-full shrink-0", DOT_COLORS[status])}
        />
        <span className="text-sm font-medium">{config.label}</span>
        <Badge
          variant="secondary"
          className="ml-auto text-xs tabular-nums h-5 min-w-5 justify-center"
        >
          {orders.length}
        </Badge>
      </div>

      {/* Scrollable card list */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-2"
      >
        <SortableContext
          items={orders.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {orders.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              No orders
            </p>
          ) : (
            orders.map((order) => (
              <DraggableOrderCard
                key={order.id}
                order={order}
                onClick={() => onOrderClick(order)}
                formatPrice={formatPrice}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

// ── OrderBoard ───────────────────────────────────────────────────────────────

export function OrderBoard({
  orders,
  onStatusChange,
  onOrderClick,
  formatPrice,
  isPending,
}: OrderBoardProps) {
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pendingReject, setPendingReject] = useState<{
    orderId: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Group orders by status
  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      NEW: [],
      ACCEPTED: [],
      PREPARING: [],
      READY: [],
      DELIVERING: [],
      COMPLETED: [],
      REJECTED: [],
      CANCELLED: [],
    };
    for (const order of orders) {
      grouped[order.status]?.push(order);
    }
    return grouped;
  }, [orders]);

  // Find which status column a card belongs to (by order ID)
  function findOrderStatus(orderId: string): OrderStatus | null {
    for (const status of BOARD_COLUMNS) {
      if (ordersByStatus[status].some((o) => o.id === orderId)) {
        return status;
      }
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const order = orders.find((o) => o.id === event.active.id);
    setActiveOrder(order ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveOrder(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as string;
    const sourceStatus = findOrderStatus(orderId);
    if (!sourceStatus) return;

    // Determine target status: could be a column ID or another card's ID
    let targetStatus: OrderStatus;
    if (BOARD_COLUMNS.includes(over.id as OrderStatus)) {
      targetStatus = over.id as OrderStatus;
    } else {
      // over.id is a card ID — find its column
      const overStatus = findOrderStatus(over.id as string);
      if (!overStatus) return;
      targetStatus = overStatus;
    }

    // No-op if same column
    if (sourceStatus === targetStatus) return;

    // Validate transition
    const validTargets = VALID_TRANSITIONS[sourceStatus];
    if (!validTargets.includes(targetStatus)) {
      toast.error(
        `Cannot move from ${orderStatusConfig[sourceStatus].label} to ${orderStatusConfig[targetStatus].label}`,
      );
      return;
    }

    // Special cases — ACCEPTED uses default prep time (no dialog)
    if (targetStatus === "ACCEPTED") {
      onStatusChange(orderId, targetStatus);
      return;
    }
    if (targetStatus === "REJECTED") {
      setPendingReject({ orderId });
      setRejectionReason("");
      return;
    }

    onStatusChange(orderId, targetStatus);
  }

  function handleConfirmReject() {
    if (!pendingReject) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    onStatusChange(pendingReject.orderId, "REJECTED", {
      rejectionReason: rejectionReason.trim(),
    });
    setPendingReject(null);
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ height: "calc(100vh - 220px)" }}
        >
          {BOARD_COLUMNS.map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              orders={ordersByStatus[status]}
              onOrderClick={onOrderClick}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <DraggableOrderCard
              order={activeOrder}
              onClick={() => {}}
              formatPrice={formatPrice}
              overlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Reject dialog — ask for rejection reason */}
      <Dialog
        open={!!pendingReject}
        onOpenChange={(open) => {
          if (!open) setPendingReject(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for rejection</Label>
              <Textarea
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Out of stock, kitchen closed..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPendingReject(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmReject}
                disabled={isPending}
              >
                Reject Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
