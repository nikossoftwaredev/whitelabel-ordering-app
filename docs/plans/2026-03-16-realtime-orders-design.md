# Real-time Order Notifications — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace polling with SSE for instant order updates. Add push notifications and sound alerts for admins. Fix order confirmation to show live status tracking.

**Architecture:** In-memory EventEmitter bus triggers SSE pushes and Web Push notifications when orders are created or status changes. Two SSE streams: one for admin (all tenant orders), one for customer (single order tracking).

**Tech Stack:** Server-Sent Events (native EventSource API), Web Push API with VAPID keys, web-push npm package, HTML5 Audio for sound alerts.

---

## 1. Order Confirmation Fix

**Current:** Shows "Confirmed!" immediately — misleading since status is NEW.

**New behavior:**
- Title: "Order Received!"
- Subtitle: "Waiting for the store to accept your order..."
- Live status stepper that updates via SSE:
  - Received (pulsing dot) → Accepted → Preparing → Ready for pickup!
- Each status change animates the stepper forward
- If rejected: show rejection reason with sad state

## 2. Event Bus

New file: `lib/events/order-events.ts`

Simple Node.js EventEmitter singleton:
```
orderEvents.emit('order:new', { tenantId, order })
orderEvents.emit('order:status', { tenantId, orderId, status, order })
```

Emitted from:
- `POST /api/tenants/[tenantSlug]/orders` → `order:new`
- `PATCH /api/admin/[tenantId]/orders/[orderId]` → `order:status`

## 3. SSE Endpoints

### Admin stream: `GET /api/admin/[tenantId]/orders/stream`
- Auth required (admin/owner/super_admin role)
- Listens for `order:new` and `order:status` events for this tenant
- Sends: `{ type: 'new_order' | 'status_change', order: {...} }`
- Connection kept alive with heartbeat every 30s

### Customer stream: `GET /api/tenants/[tenantSlug]/orders/[orderId]/stream`
- Auth required (must be the order's customer)
- Listens for `order:status` events matching this orderId
- Sends: `{ type: 'status_change', status, estimatedReadyAt, rejectionReason }`

## 4. Admin Notification Component

New: `components/admin/order-notification-provider.tsx`

- Wraps admin layout
- Opens SSE connection to `/api/admin/[tenantId]/orders/stream`
- On `new_order` event:
  - Plays notification sound (HTML5 Audio, .mp3 in /public/sounds/)
  - Shows toast: "New order #A003 — €12.50"
  - Invalidates order queries via `queryClient.invalidateQueries`
- On `status_change` event:
  - Invalidates relevant queries
- Sound plays in browser (non-PWA). PWA gets push notification instead (or both).

## 5. Admin Sidebar Badge

- `admin-sidebar.tsx`: Show red badge with count of NEW orders
- Count updated via SSE events (no polling)

## 6. Remove Polling

- `order-management.tsx`: Remove `refetchInterval: 10000`
- `dashboard.tsx`: Remove `refetchInterval: 30000`
- Both now update via SSE-driven query invalidation

## 7. PWA Push Notifications

### Schema addition:
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  tenantId  String
  endpoint  String
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user      User     @relation(...)
  tenant    Tenant   @relation(...)

  @@unique([userId, endpoint])
}
```

### VAPID keys:
- Generate once, store in env: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`

### Endpoints:
- `POST /api/push/subscribe` — Register subscription (userId + tenantId + push subscription)
- `DELETE /api/push/subscribe` — Unregister

### Push flow:
1. Admin opens admin panel → browser prompts for notification permission
2. If granted → registers push subscription via API
3. New order arrives → server sends Web Push to all subscribed admins for that tenant
4. Service worker receives push → shows notification: "New order #A003 — €12.50"
5. Click notification → opens admin orders page

### Service Worker (`public/sw.js`):
Add push event handler:
```js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    data: { url: data.url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

## 8. Sound Alert

- File: `public/sounds/new-order.mp3` (short pleasant chime)
- Played via `new Audio('/sounds/new-order.mp3').play()` on new order
- Only plays in browser (not in PWA push — push has its own notification sound)
- User can mute via toggle in admin header

## Files Changed

| File | Action |
|------|--------|
| `lib/events/order-events.ts` | Create — EventEmitter singleton |
| `app/api/admin/[tenantId]/orders/stream/route.ts` | Create — Admin SSE endpoint |
| `app/api/tenants/[tenantSlug]/orders/[orderId]/stream/route.ts` | Create — Customer SSE endpoint |
| `app/api/push/subscribe/route.ts` | Create — Push subscription management |
| `lib/push/send.ts` | Create — Web Push utility |
| `components/admin/order-notification-provider.tsx` | Create — SSE listener + toast + sound |
| `components/order/order-status-tracker.tsx` | Create — Live status stepper |
| `public/sounds/new-order.mp3` | Create — Notification sound |
| `public/sw.js` | Modify — Add push handler |
| `lib/db/schema.prisma` | Modify — Add PushSubscription model |
| `components/order/order-confirmation.tsx` | Modify — Use live status tracker |
| `components/admin/orders/order-management.tsx` | Modify — Remove polling, use SSE |
| `components/admin/dashboard/dashboard.tsx` | Modify — Remove polling, use SSE |
| `components/admin/admin-sidebar.tsx` | Modify — Add new order count badge |
| `components/admin/admin-header.tsx` | Modify — Add sound mute toggle |
| `app/[locale]/admin/layout.tsx` | Modify — Wrap with notification provider |
| `app/api/tenants/[tenantSlug]/orders/route.ts` | Modify — Emit order:new event |
| `app/api/admin/[tenantId]/orders/[orderId]/route.ts` | Modify — Emit order:status event |
