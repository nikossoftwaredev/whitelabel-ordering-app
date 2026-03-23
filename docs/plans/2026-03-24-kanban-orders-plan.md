# Kanban Orders Board Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a ClickUp-style Kanban board view to the admin orders page with drag-and-drop between status columns, alongside the existing list view with a toggle.

**Architecture:** New `OrderBoard` component renders 8 horizontal columns (one per `OrderStatus`). Uses `@dnd-kit/core` for drag-and-drop with the existing `updateStatus` mutation. The existing `OrderManagement` component gets a view toggle that switches between `OrderBoard` (new) and the current tabbed grid (existing). Order detail opens in a Sheet on card click.

**Tech Stack:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, existing shadcn/ui Sheet, existing TanStack Query mutations.

---

### Task 1: Install dnd-kit

**Step 1: Install dependencies**

Run: `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

**Step 2: Verify install**

Run: `pnpm tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add @dnd-kit/core, sortable, utilities"
```

---

### Task 2: Add VALID_TRANSITIONS to status-config.ts

The transitions map currently lives only in the API route. We need it client-side for the board.

**Files:**
- Modify: `lib/general/status-config.ts`

**Step 1: Add transitions map**

Add after `ACTIVE_ORDER_STATUSES` (line 75):

```typescript
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["DELIVERING", "COMPLETED"],
  DELIVERING: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};
```

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add lib/general/status-config.ts
git commit -m "feat: export VALID_TRANSITIONS from status-config"
```

---

### Task 3: Create the OrderBoard component

**Files:**
- Create: `components/admin/orders/order-board.tsx`

This is the main Kanban board component. It receives orders, mutation handlers, and renders 8 columns with draggable cards.

**Step 1: Create the board component**

The component structure:

```tsx
"use client";

import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
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
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useFormatPrice } from "@/hooks/use-format-price";
import { timeAgo } from "@/lib/general/formatters";
import {
  type OrderStatus,
  orderStatusConfig,
  VALID_TRANSITIONS,
} from "@/lib/general/status-config";
```

**Key types to import from parent** (pass as props, NOT duplicate the interface — import from a shared types file or pass order objects directly):

```typescript
// Re-export the Order type from order-management.tsx, or define a shared one.
// For this plan, we'll accept the same Order interface as a prop type.
```

**Column order constant:**

```typescript
const BOARD_COLUMNS: OrderStatus[] = [
  "NEW", "ACCEPTED", "PREPARING", "READY",
  "DELIVERING", "COMPLETED", "REJECTED", "CANCELLED",
];
```

**Props interface:**

```typescript
interface OrderBoardProps {
  orders: Order[];
  onStatusChange: (orderId: string, newStatus: OrderStatus, extras?: {
    estimatedMinutes?: number;
    rejectionReason?: string;
  }) => void;
  onOrderClick: (order: Order) => void;
  formatPrice: (cents: number) => string;
  isPending: boolean;
}
```

**DraggableOrderCard sub-component:**

A compact card showing:
- Order number + time ago (top row)
- Customer name + order type badge
- Item count summary + total price
- Payment icon (CreditCard for STRIPE, Banknote for CASH)
- Scheduled badge if applicable

Uses `useSortable` from dnd-kit. The card has `cursor-grab` and on click opens the detail sheet.

```tsx
function DraggableOrderCard({ order, formatPrice, onClick }: {
  order: Order;
  formatPrice: (cents: number) => string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
    data: { order },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const orderTypeIcons = { PICKUP: Store, DELIVERY: Truck, DINE_IN: MapPin };
  const TypeIcon = orderTypeIcons[order.orderType];

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors duration-200"
        onClick={(e) => { if (!isDragging) onClick(); }}
      >
        <CardContent className="p-3 space-y-1.5">
          {/* Row 1: Order number + time */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm">#{order.orderNumber}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(order.createdAt)}</span>
          </div>

          {/* Scheduled */}
          {order.scheduledFor && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5 w-fit">
              <Clock className="size-3" />
              {new Date(order.scheduledFor).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          {/* Row 2: Customer + type */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <User className="size-3" />
              {order.customer?.name || "Guest"}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4.5 gap-0.5">
              <TypeIcon className="size-2.5" />
              {order.orderType}
            </Badge>
          </div>

          {/* Row 3: Items + total + payment */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-1.5">
              {order.paymentMethod === "STRIPE"
                ? <CreditCard className="size-3 text-muted-foreground" />
                : <Banknote className="size-3 text-muted-foreground" />}
              <span className="font-semibold">{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**DroppableColumn sub-component:**

```tsx
function DroppableColumn({ status, orders, formatPrice, onOrderClick }: {
  status: OrderStatus;
  orders: Order[];
  formatPrice: (cents: number) => string;
  onOrderClick: (order: Order) => void;
}) {
  const config = orderStatusConfig[status];
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] shrink-0 h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 px-2 py-2 sticky top-0 bg-background z-10">
        <div className={cn("size-2.5 rounded-full", config.className.split(" ").find(c => c.startsWith("bg-")))} />
        <span className="font-semibold text-sm">{config.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {orders.length}
        </Badge>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-2 px-1 pb-4 min-h-[200px]"
      >
        <SortableContext items={orders.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <DraggableOrderCard
              key={order.id}
              order={order}
              formatPrice={formatPrice}
              onClick={() => onOrderClick(order)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
```

**Main OrderBoard component:**

Uses `DndContext` with `closestCorners` collision detection. On drag end:
1. Check if target column differs from source
2. Validate transition via `VALID_TRANSITIONS`
3. If target is ACCEPTED → show prep time dialog first
4. If target is REJECTED → show rejection reason dialog first
5. Otherwise → call `onStatusChange` directly

```tsx
export function OrderBoard({ orders, onStatusChange, onOrderClick, formatPrice, isPending }: OrderBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // ... pending action state for dialogs

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const ordersByStatus = useMemo(() => {
    const map: Record<OrderStatus, Order[]> = {
      NEW: [], ACCEPTED: [], PREPARING: [], READY: [],
      DELIVERING: [], COMPLETED: [], REJECTED: [], CANCELLED: [],
    };
    for (const order of orders) {
      map[order.status]?.push(order);
    }
    return map;
  }, [orders]);

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const orderId = active.id as string;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Determine target status (over.id could be a column ID or another card's ID)
    let targetStatus: OrderStatus;
    if (BOARD_COLUMNS.includes(over.id as OrderStatus)) {
      targetStatus = over.id as OrderStatus;
    } else {
      // Dropped on a card — find which column it belongs to
      const targetOrder = orders.find(o => o.id === over.id);
      if (!targetOrder) return;
      targetStatus = targetOrder.status;
    }

    if (targetStatus === order.status) return;

    const allowed = VALID_TRANSITIONS[order.status];
    if (!allowed.includes(targetStatus)) {
      toast.error(`Cannot move from ${orderStatusConfig[order.status].label} to ${orderStatusConfig[targetStatus].label}`);
      return;
    }

    // Special cases
    if (targetStatus === "ACCEPTED") {
      setPendingAccept({ orderId, targetStatus });
      return;
    }
    if (targetStatus === "REJECTED") {
      setPendingReject({ orderId, targetStatus });
      return;
    }

    onStatusChange(orderId, targetStatus);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ height: "calc(100vh - 200px)" }}>
        {BOARD_COLUMNS.map((status) => (
          <DroppableColumn
            key={status}
            status={status}
            orders={ordersByStatus[status]}
            formatPrice={formatPrice}
            onOrderClick={onOrderClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOrder && (
          <Card className="w-[280px] shadow-xl rotate-2 opacity-90">
            {/* Minimal preview of the dragged card */}
            <CardContent className="p-3">
              <span className="font-bold text-sm">#{activeOrder.orderNumber}</span>
              <span className="text-xs text-muted-foreground ml-2">{activeOrder.customer?.name}</span>
            </CardContent>
          </Card>
        )}
      </DragOverlay>

      {/* Accept dialog (prep time) */}
      {/* Reject dialog (reason) */}
    </DndContext>
  );
}
```

**Important imports needed:** `useDroppable` from `@dnd-kit/core`, `SortableContext`, `verticalListSortingStrategy` from `@dnd-kit/sortable`, `cn` from `@/lib/utils`.

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add components/admin/orders/order-board.tsx
git commit -m "feat: add OrderBoard kanban component with drag-and-drop"
```

---

### Task 4: Extract shared Order types

Currently the `Order`, `OrderItem`, `OrderItemModifier`, `OrderCustomer` interfaces are defined inline in `order-management.tsx`. Extract them so the board can import them.

**Files:**
- Create: `components/admin/orders/types.ts`
- Modify: `components/admin/orders/order-management.tsx` (lines 38-82) — remove inline types, import from `./types`
- Modify: `components/admin/orders/order-board.tsx` — import from `./types`

**Step 1: Create types file**

Move the 4 interfaces (`OrderItemModifier`, `OrderItem`, `OrderCustomer`, `Order`, `OrdersResponse`) to `types.ts`.

**Step 2: Update imports in both files**

In `order-management.tsx`:
```typescript
import type { Order, OrdersResponse } from "./types";
```

In `order-board.tsx`:
```typescript
import type { Order } from "./types";
```

**Step 3: Verify**

Run: `pnpm tsc --noEmit`

**Step 4: Commit**

```bash
git add components/admin/orders/types.ts components/admin/orders/order-management.tsx components/admin/orders/order-board.tsx
git commit -m "refactor: extract shared order types"
```

---

### Task 5: Create OrderDetailSheet component

When clicking a Kanban card, the full order detail (with all action buttons) opens in a Sheet. This reuses the existing `renderOrderCard` logic.

**Files:**
- Create: `components/admin/orders/order-detail-sheet.tsx`

**Key design:**
- Receives: `order: Order | null`, `open: boolean`, `onOpenChange`, and all action handlers
- Renders the full order detail (same as current `renderOrderCard` content) inside a `Sheet`
- Includes all action buttons (accept, reject, prepare, ready, deliver, complete, refund)
- Both the board view AND the list view can use this for consistency

**Step 1: Create the sheet component**

Reuse all the rendering logic from `renderOrderCard` (lines 304-726 of order-management.tsx). Wrap it in:

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function OrderDetailSheet({ order, open, onOpenChange, ...handlers }) {
  if (!order) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order #{order.orderNumber}</SheetTitle>
        </SheetHeader>
        {/* Full order detail + action buttons — same as renderOrderCard internals */}
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Verify**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add components/admin/orders/order-detail-sheet.tsx
git commit -m "feat: add OrderDetailSheet for full order view"
```

---

### Task 6: Add view toggle and wire everything together in OrderManagement

**Files:**
- Modify: `components/admin/orders/order-management.tsx`

**Step 1: Add view state + toggle UI**

Add state (persisted to localStorage):
```typescript
const [view, setView] = useState<"board" | "list">(() => {
  if (typeof window !== "undefined") {
    return (localStorage.getItem("orders-view") as "board" | "list") || "board";
  }
  return "board";
});
```

Add toggle to `PageHeader` children:
```tsx
<PageHeader title="Orders" description="Manage incoming orders and track their status.">
  <div className="flex items-center gap-1 border rounded-lg p-0.5">
    <Button
      variant={view === "board" ? "secondary" : "ghost"}
      size="sm"
      onClick={() => { setView("board"); localStorage.setItem("orders-view", "board"); }}
    >
      <LayoutGrid className="size-4" />
    </Button>
    <Button
      variant={view === "list" ? "secondary" : "ghost"}
      size="sm"
      onClick={() => { setView("list"); localStorage.setItem("orders-view", "list"); }}
    >
      <List className="size-4" />
    </Button>
  </div>
</PageHeader>
```

Import `LayoutGrid, List` from lucide-react.

**Step 2: Add OrderDetailSheet state**

```typescript
const [detailOrder, setDetailOrder] = useState<Order | null>(null);
```

**Step 3: Conditional render**

```tsx
{view === "board" ? (
  <OrderBoard
    orders={orders}
    onStatusChange={(orderId, status, extras) => {
      updateStatus.mutate({ orderId, status, ...extras });
    }}
    onOrderClick={(order) => setDetailOrder(order)}
    formatPrice={formatPrice}
    isPending={updateStatus.isPending}
  />
) : (
  <Tabs defaultValue="active">
    {/* existing tabs content unchanged */}
  </Tabs>
)}

<OrderDetailSheet
  order={detailOrder}
  open={!!detailOrder}
  onOpenChange={(open) => { if (!open) setDetailOrder(null); }}
  // ... pass all handlers
/>
```

**Step 4: Verify**

Run: `pnpm tsc --noEmit`
Run: `pnpm lint`

**Step 5: Screenshot**

Run: `node screenshot.mjs http://figata-cafe.lvh.me:3000/en/admin/orders kanban-board`

**Step 6: Commit**

```bash
git add components/admin/orders/order-management.tsx components/admin/orders/order-board.tsx
git commit -m "feat: add kanban board view with drag-and-drop + view toggle"
```

---

### Task 7: Polish — column header colors, drop indicators, empty states

**Files:**
- Modify: `components/admin/orders/order-board.tsx`

**Step 1: Add drop indicator styling**

When dragging over a column, add a visual indicator (border highlight or background tint):

```tsx
// In DroppableColumn, use useDroppable's isOver:
const { setNodeRef, isOver } = useDroppable({ id: status });
// Add className: isOver ? "bg-primary/5 border-primary/20 border-2 border-dashed rounded-xl" : ""
```

**Step 2: Add empty column state**

When a column has 0 orders, show a subtle "No orders" placeholder text.

**Step 3: Add column header dot color**

Each column header gets a small colored dot matching the status color (extracted from `orderStatusConfig`).

**Step 4: Verify + Screenshot**

Run: `pnpm tsc --noEmit`
Run: `node screenshot.mjs http://figata-cafe.lvh.me:3000/en/admin/orders kanban-polished`

**Step 5: Commit**

```bash
git add components/admin/orders/order-board.tsx
git commit -m "feat: polish kanban board with drop indicators and empty states"
```

---

## Implementation Notes

- **`useDroppable`** is from `@dnd-kit/core` — each column is a droppable
- **`useSortable`** is from `@dnd-kit/sortable` — each card is sortable (allows reordering within column, but we don't persist order — only status changes matter)
- **PointerSensor distance: 8** prevents accidental drags when clicking cards
- **DragOverlay** shows a ghost card while dragging for better UX
- The board height should be `calc(100vh - 200px)` approximately (adjust based on header/nav height)
- **Terminal columns** (COMPLETED, REJECTED, CANCELLED) — cards in these columns are not draggable (no valid transitions out)
- Ensure the Sheet component is installed: `npx shadcn@latest add sheet` if not already present
