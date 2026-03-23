# Kanban Board View for Admin Orders

## Overview

Replace the admin orders page with a dual-view system: a ClickUp-style Kanban board (default) and the existing list/grid view, togglable via header buttons.

## Board Layout

8 horizontally-scrollable columns, one per status:

`NEW` → `ACCEPTED` → `PREPARING` → `READY` → `DELIVERING` → `COMPLETED` → `REJECTED` → `CANCELLED`

- Column min-width: ~280px
- Horizontal scroll on container (`overflow-x-auto`)
- Each column scrolls vertically independently
- Sticky column headers with status name + count badge (existing color palette)

## View Toggle

Two icon buttons in page header: `LayoutGrid` (board) / `List` (list). Preference persisted to `localStorage`.

## Drag & Drop

- **Library:** `@dnd-kit/core` + `@dnd-kit/sortable`
- On drop: call `PATCH /api/admin/[tenantId]/orders/[orderId]` with `{ status }`
- Optimistic update — move card immediately, revert on API error
- Only valid transitions allowed (per `VALID_TRANSITIONS` map); invalid drops show toast + snap back
- Special cases:
  - Drop onto ACCEPTED → show prep time input dialog before confirming
  - Drop onto REJECTED → show rejection reason dialog before confirming

## Compact Order Card

Fits ~280px column width:

- Order number + relative time
- Customer name + order type badge (PICKUP/DELIVERY/DINE_IN)
- Item count + total price
- Payment method icon
- Scheduled badge (if applicable)
- Click → opens full order detail sheet/dialog (reuse existing detail UI)

## What Stays

- Existing list/grid view preserved as-is (toggle)
- Same API endpoints, mutations, refund flow
- Same status badge colors
- All action buttons accessible from expanded detail view

## Status Transitions

```
NEW → ACCEPTED | REJECTED
ACCEPTED → PREPARING
PREPARING → READY
READY → DELIVERING | COMPLETED
DELIVERING → COMPLETED
```

COMPLETED, REJECTED, CANCELLED are terminal states.
