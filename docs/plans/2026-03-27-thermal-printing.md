# Thermal Printing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 80mm thermal receipt printing to the admin order board — manual print button in OrderDetailSheet + auto-print toggle for new orders.

**Architecture:** Pure browser `window.print()`. A hidden `<div id="thermal-receipt">` is populated with order data, then `window.print()` fires. `@media print` CSS hides the entire app and shows only the receipt div. No external libraries.

**Tech Stack:** React, TypeScript, Tailwind CSS (`@media print` rules in globals.css), localStorage for auto-print state.

---

### Task 1: Add `@media print` CSS to globals.css

**Files:**
- Modify: `app/[locale]/globals.css`

**Step 1: Add print styles at the bottom of globals.css**

```css
/* ── Thermal Receipt Print Styles ─────────────────────────────────────────── */
@media print {
  /* Hide everything on the page */
  body > * {
    display: none !important;
  }

  /* Show only the receipt */
  #thermal-receipt {
    display: block !important;
    position: fixed;
    top: 0;
    left: 0;
    width: 80mm;
    margin: 0;
    padding: 0;
    font-family: monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
  }

  @page {
    size: 80mm auto;
    margin: 4mm;
  }
}
```

**Step 2: Verify globals.css saved cleanly — no syntax errors**

Check by running: `pnpm tsc --noEmit` (CSS errors won't show here but TypeScript will still pass if nothing else broke)

**Step 3: Commit**

```bash
git add app/[locale]/globals.css
git commit -m "feat: add @media print styles for 80mm thermal receipt"
```

---

### Task 2: Create `thermal-receipt.tsx` component

**Files:**
- Create: `components/admin/orders/thermal-receipt.tsx`

**Step 1: Create the component**

```tsx
/**
 * ThermalReceipt — hidden 80mm receipt rendered into #thermal-receipt div.
 * Populated via usePrintOrder hook before window.print() is called.
 * Styled only via @media print CSS (invisible in normal UI).
 */

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: { name: string; priceAdjustment: number }[];
}

export interface ReceiptData {
  storeName: string;
  orderNumber: string;
  orderType: "PICKUP" | "DELIVERY" | "DINE_IN";
  createdAt: string;
  scheduledFor: string | null;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  promoDiscount: number;
  couponDiscount: number;
  groupDiscount: number;
  groupDiscountName: string | null;
  promoCode: string | null;
  tipAmount: number;
  total: number;
  paymentMethod: "STRIPE" | "CASH";
  paymentStatus: "PENDING" | "PAID" | "REFUNDED" | "FAILED" | "DISPUTED";
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  customerNote: string | null;
  currency: string;
}

const LINE = "================================";
const DIVIDER = "--------------------------------";
const CUT = "- - - - - - - - - - - - - - - -";

function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function padLine(left: string, right: string, width = 32): string {
  const spaces = Math.max(1, width - left.length - right.length);
  return left + " ".repeat(spaces) + right;
}

const ORDER_TYPE_LABEL = {
  PICKUP: "PICKUP",
  DELIVERY: "DELIVERY",
  DINE_IN: "DINE-IN",
};

export function ThermalReceipt({ data }: { data: ReceiptData | null }) {
  if (!data) return <div id="thermal-receipt" style={{ display: "none" }} />;

  const {
    storeName,
    orderNumber,
    orderType,
    createdAt,
    scheduledFor,
    items,
    discount,
    promoDiscount,
    couponDiscount,
    groupDiscount,
    groupDiscountName,
    promoCode,
    tipAmount,
    total,
    paymentMethod,
    paymentStatus,
    customerName,
    customerPhone,
    deliveryAddress,
    customerNote,
    currency,
  } = data;

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      item.quantity *
        (item.unitPrice +
          item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)),
    0,
  );

  const date = new Date(createdAt).toLocaleString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalDiscounts =
    discount + promoDiscount + couponDiscount + groupDiscount;

  return (
    <div id="thermal-receipt" style={{ display: "none" }}>
      <pre
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          lineHeight: "1.4",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          color: "#000",
          margin: 0,
          padding: 0,
        }}
      >
        {LINE + "\n"}
        {storeName.toUpperCase().padStart(Math.floor((32 + storeName.length) / 2)).padEnd(32) + "\n"}
        {`Order #${orderNumber}`.padStart(Math.floor((32 + `Order #${orderNumber}`.length) / 2)).padEnd(32) + "\n"}
        {ORDER_TYPE_LABEL[orderType].padStart(Math.floor((32 + ORDER_TYPE_LABEL[orderType].length) / 2)).padEnd(32) + "\n"}
        {date.padStart(Math.floor((32 + date.length) / 2)).padEnd(32) + "\n"}
        {scheduledFor
          ? `SCHEDULED: ${new Date(scheduledFor).toLocaleString("el-GR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`.padStart(Math.floor((32 + `SCHEDULED: ${new Date(scheduledFor).toLocaleString("el-GR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`.length) / 2)).padEnd(32) + "\n"
          : ""}
        {LINE + "\n"}
        {items.map((item) => {
          const itemTotal =
            item.quantity *
            (item.unitPrice +
              item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0));
          const label = `${item.quantity}x ${item.productName}`;
          const price = formatCents(itemTotal, currency);
          return (
            padLine(label, price) +
            "\n" +
            item.modifiers
              .map((m) =>
                m.priceAdjustment > 0
                  ? `  + ${m.name}` +
                    " ".repeat(
                      Math.max(
                        1,
                        32 - `  + ${m.name}`.length - formatCents(m.priceAdjustment * item.quantity, currency).length,
                      ),
                    ) +
                    formatCents(m.priceAdjustment * item.quantity, currency) +
                    "\n"
                  : `  + ${m.name}\n`,
              )
              .join("")
          );
        })}
        {DIVIDER + "\n"}
        {padLine("Subtotal", formatCents(subtotal, currency)) + "\n"}
        {discount > 0 ? padLine("Discount", `-${formatCents(discount, currency)}`) + "\n" : ""}
        {promoDiscount > 0 ? padLine(`Promo${promoCode ? ` (${promoCode})` : ""}`, `-${formatCents(promoDiscount, currency)}`) + "\n" : ""}
        {couponDiscount > 0 ? padLine("Coupon", `-${formatCents(couponDiscount, currency)}`) + "\n" : ""}
        {groupDiscount > 0 ? padLine(groupDiscountName ? `Group (${groupDiscountName})` : "Group discount", `-${formatCents(groupDiscount, currency)}`) + "\n" : ""}
        {tipAmount > 0 ? padLine("Tip", formatCents(tipAmount, currency)) + "\n" : ""}
        {totalDiscounts > 0 || tipAmount > 0 ? DIVIDER + "\n" : ""}
        {padLine("TOTAL", formatCents(total, currency)) + "\n"}
        {LINE + "\n"}
        {padLine("Payment:", paymentMethod === "STRIPE" ? `Card (${paymentStatus})` : "Cash") + "\n"}
        {customerName ? padLine("Customer:", customerName) + "\n" : ""}
        {customerPhone ? padLine("Phone:", customerPhone) + "\n" : ""}
        {deliveryAddress ? `Address: ${deliveryAddress}\n` : ""}
        {customerNote ? `Note: ${customerNote}\n` : ""}
        {"\n"}
        {CUT + "\n"}
        {"        \u2702 cut here\n"}
      </pre>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/orders/thermal-receipt.tsx
git commit -m "feat: add ThermalReceipt component for 80mm thermal printing"
```

---

### Task 3: Create `use-print-order.ts` hook

**Files:**
- Create: `hooks/use-print-order.ts`

**Step 1: Create the hook**

```ts
import { useCallback, useState } from "react";

import type { ReceiptData } from "@/components/admin/orders/thermal-receipt";
import type { Order } from "@/components/admin/orders/types";

/**
 * Hook that populates the #thermal-receipt div and calls window.print().
 * Returns a printOrder function and isPrinting state.
 *
 * Usage:
 *   const { printOrder } = usePrintOrder(storeName, currency);
 *   <Button onClick={() => printOrder(order)}>Print</Button>
 */
export function usePrintOrder(storeName: string, currency: string) {
  const [isPrinting, setIsPrinting] = useState(false);

  const buildReceiptData = useCallback(
    (order: Order): ReceiptData => ({
      storeName,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      createdAt: order.createdAt,
      scheduledFor: order.scheduledFor,
      items: order.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        modifiers: item.modifiers,
      })),
      subtotal: order.items.reduce(
        (sum, item) =>
          sum +
          item.quantity *
            (item.unitPrice +
              item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0)),
        0,
      ),
      discount: order.discount,
      promoDiscount: order.promoDiscount,
      couponDiscount: order.couponDiscount,
      groupDiscount: order.groupDiscount,
      groupDiscountName: order.groupDiscountName,
      promoCode: order.promoCode,
      tipAmount: order.tipAmount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customer?.phone ?? null,
      deliveryAddress: order.deliveryAddress,
      customerNote: order.customerNote,
      currency,
    }),
    [storeName, currency],
  );

  const printOrder = useCallback(
    (order: Order) => {
      setIsPrinting(true);

      // Build receipt data and dispatch a custom event so the
      // ThermalReceipt component (rendered in the layout) can update.
      const receiptData = buildReceiptData(order);
      window.dispatchEvent(
        new CustomEvent("print-receipt", { detail: receiptData }),
      );

      // Give React one tick to render the receipt, then print
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          setIsPrinting(false);
        });
      });
    },
    [buildReceiptData],
  );

  return { printOrder, isPrinting };
}
```

**Step 2: Commit**

```bash
git add hooks/use-print-order.ts
git commit -m "feat: add usePrintOrder hook for thermal receipt printing"
```

---

### Task 4: Mount `ThermalReceipt` in the admin layout and wire the event

**Files:**
- Read first: find the admin layout file (`app/[locale]/admin/layout.tsx` or similar)
- Modify: the admin layout

**Step 1: Find the admin layout**

```bash
find app -name "layout.tsx" | grep admin
```

**Step 2: Add `ThermalReceiptMount` wrapper component**

Create `components/admin/orders/thermal-receipt-mount.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import type { ReceiptData } from "./thermal-receipt";
import { ThermalReceipt } from "./thermal-receipt";

/**
 * Mounts the hidden ThermalReceipt in the DOM.
 * Listens for "print-receipt" custom events to update the receipt data.
 * Place this once in the admin layout.
 */
export function ThermalReceiptMount() {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setReceiptData((e as CustomEvent<ReceiptData>).detail);
    };
    window.addEventListener("print-receipt", handler);
    return () => window.removeEventListener("print-receipt", handler);
  }, []);

  return <ThermalReceipt data={receiptData} />;
}
```

**Step 3: Import and render `ThermalReceiptMount` in admin layout**

In the admin layout file, add inside the layout's return (just before the closing tag):

```tsx
import { ThermalReceiptMount } from "@/components/admin/orders/thermal-receipt-mount";

// Inside JSX, anywhere in the layout:
<ThermalReceiptMount />
```

**Step 4: Commit**

```bash
git add components/admin/orders/thermal-receipt-mount.tsx
git add app/[locale]/admin/layout.tsx  # or wherever the layout is
git commit -m "feat: mount ThermalReceiptMount in admin layout"
```

---

### Task 5: Add Print button to `OrderDetailSheet`

**Files:**
- Modify: `components/admin/orders/order-detail-sheet.tsx`

**Step 1: Add Printer import and usePrintOrder**

At the top of the file, add `Printer` to the lucide imports:

```tsx
import { ..., Printer } from "lucide-react";
```

Update the props interface to accept storeName and currency:

```tsx
interface OrderDetailSheetProps {
  // ... existing props ...
  storeName: string;
  currency: string;
}
```

Add to the destructured props and hook:

```tsx
export function OrderDetailSheet({
  // ... existing props ...
  storeName,
  currency,
}: OrderDetailSheetProps) {
  const { printOrder, isPrinting } = usePrintOrder(storeName, currency);
  // ... rest of component
```

**Step 2: Add Print button in SheetHeader next to the title**

Replace:
```tsx
<SheetTitle className="flex items-center gap-3">
  <span>Order #{order.orderNumber}</span>
  <Badge variant="secondary" className={status.className}>
    {status.label}
  </Badge>
</SheetTitle>
```

With:
```tsx
<SheetTitle className="flex items-center gap-3">
  <span>Order #{order.orderNumber}</span>
  <Badge variant="secondary" className={status.className}>
    {status.label}
  </Badge>
  <Button
    variant="ghost"
    size="icon"
    className="ml-auto h-7 w-7"
    onClick={() => printOrder(order)}
    disabled={isPrinting}
    title="Print receipt"
  >
    <Printer className="size-4" />
  </Button>
</SheetTitle>
```

**Step 3: Pass storeName and currency from `OrderManagement`**

In `order-management.tsx`, find where `<OrderDetailSheet` is rendered and pass:
```tsx
<OrderDetailSheet
  // ... existing props ...
  storeName={tenant.name}
  currency={tenant.currency}
/>
```

**Step 4: Commit**

```bash
git add components/admin/orders/order-detail-sheet.tsx
git add components/admin/orders/order-management.tsx
git commit -m "feat: add print button to OrderDetailSheet"
```

---

### Task 6: Add auto-print toggle + logic to `OrderBoard`

**Files:**
- Modify: `components/admin/orders/order-board.tsx`
- Modify: `components/admin/orders/order-management.tsx`

**Step 1: Update `OrderBoardProps` to accept print callback**

```tsx
interface OrderBoardProps {
  // ... existing props ...
  onAutoPrint: (order: Order) => void;
}
```

**Step 2: Add auto-print state and logic inside `OrderBoard`**

```tsx
const AUTOPRINT_KEY = "thermal_autoprint";
const PRINTED_KEY = "printed_order_ids";

export function OrderBoard({ orders, ..., onAutoPrint }: OrderBoardProps) {
  const [autoPrintEnabled, setAutoPrintEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(AUTOPRINT_KEY) === "true";
  });

  const printedIdsRef = useRef<Set<string>>(new Set(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem(PRINTED_KEY) ?? "[]")
      : []
  ));

  // Auto-print new orders
  useEffect(() => {
    if (!autoPrintEnabled) return;
    const newOrders = orders.filter(
      (o) => o.status === "NEW" && !printedIdsRef.current.has(o.id)
    );
    for (const order of newOrders) {
      printedIdsRef.current.add(order.id);
      localStorage.setItem(
        PRINTED_KEY,
        JSON.stringify([...printedIdsRef.current])
      );
      onAutoPrint(order);
    }
  }, [orders, autoPrintEnabled, onAutoPrint]);

  const toggleAutoPrint = () => {
    setAutoPrintEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(AUTOPRINT_KEY, String(next));
      return next;
    });
  };
  // ... rest of component
```

**Step 3: Add auto-print toggle button to the board header**

Add `Printer` and `PrinterOff` to lucide imports in order-board.tsx.

In the return JSX, wrap the existing `<DndContext>` board in a fragment and add a header:

```tsx
return (
  <>
    {/* Auto-print toggle */}
    <div className="flex items-center justify-end mb-3">
      <Button
        variant={autoPrintEnabled ? "default" : "outline"}
        size="sm"
        onClick={toggleAutoPrint}
        className="gap-2"
      >
        {autoPrintEnabled ? (
          <Printer className="size-4" />
        ) : (
          <PrinterOff className="size-4" />
        )}
        Auto-print {autoPrintEnabled ? "ON" : "OFF"}
      </Button>
    </div>

    <DndContext ...>
      {/* existing board */}
    </DndContext>
    {/* existing reject dialog */}
  </>
);
```

**Step 4: Wire `onAutoPrint` in `OrderManagement`**

In `order-management.tsx`, pass a callback to `<OrderBoard>` that calls `printOrder`:

```tsx
// Add usePrintOrder in OrderManagement
const { printOrder } = usePrintOrder(tenant.name, tenant.currency);

// Pass to OrderBoard
<OrderBoard
  // ... existing props ...
  onAutoPrint={printOrder}
/>
```

Also add `useRef` to imports in order-board.tsx: `import { useMemo, useRef, useState } from "react";`

**Step 5: Commit**

```bash
git add components/admin/orders/order-board.tsx
git add components/admin/orders/order-management.tsx
git commit -m "feat: add auto-print toggle to OrderBoard for new orders"
```

---

## Verification

1. Start dev server: `pnpm dev`
2. Go to `/admin/orders`
3. Open an order → click the Printer icon → browser print dialog opens with a narrow receipt layout
4. Enable Auto-print toggle → simulate a new order arriving → receipt should print automatically
5. Disable Auto-print → new orders should not print
6. Run `pnpm tsc --noEmit` — no TypeScript errors
7. Run `pnpm lint` — no lint errors
