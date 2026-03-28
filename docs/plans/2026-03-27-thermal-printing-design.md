# Thermal Printing Design

**Date:** 2026-03-27
**Status:** Approved

## Overview

Browser-based thermal receipt printing via `window.print()` with 80mm thermal printer CSS. No external libraries or cloud printing services required. Works with any thermal printer that can receive a print job from a browser (USB or network printers set as default).

## Architecture

A hidden `<div id="thermal-receipt">` lives persistently in the DOM (rendered in the admin layout). Before printing, it is populated with order data. `@media print` CSS hides everything except that div. `window.print()` triggers the browser print dialog — store sets thermal printer as default, browser sends directly to it.

## Files

| File | Change |
|---|---|
| `components/admin/orders/thermal-receipt.tsx` | New — receipt layout component |
| `hooks/use-print-order.ts` | New — hook: populates receipt, calls window.print() |
| `app/globals.css` | Add `@media print` rules |
| `components/admin/orders/order-detail-sheet.tsx` | Add Print button |
| `components/admin/orders/order-board.tsx` | Add auto-print toggle + logic |

## Receipt Layout (80mm / ~280px content width, B&W)

```
================================
        STORE NAME
   Order #1042  |  PICKUP
   12/03/2026 14:32
================================
2x Margherita Pizza        €18.00
  + Extra cheese            €1.00
1x Coca Cola               €2.50
--------------------------------
Subtotal                   €21.50
Promo (SAVE10)             -€2.00
Tip                         €1.00
TOTAL                      €20.50
================================
Payment: Card (Paid)
Customer: Nikos P.
Note: No onions please
- - - - - - - - - - - - - - - -
        ✂ cut here
```

- Font: monospace, 12px base, 14px for totals/header
- No images (B&W thermal, slow image rendering)
- Dashed cut line at bottom

## Auto-Print Logic

- Order Board polls for new orders (existing mechanism)
- Printed order IDs tracked in `localStorage` key `printed_order_ids`
- On each poll: orders with status `NEW` not in the set → auto-print + add to set
- Toggle button in board header (🖨 Auto-print ON/OFF), persisted to `localStorage` key `thermal_autoprint`
- **Default: OFF** — kitchen must opt-in, prevents unwanted prints on page load

## Manual Print

- Print button (Printer icon) added to `OrderDetailSheet` header
- Calls `usePrintOrder(order)` hook directly
- Works regardless of auto-print toggle state
