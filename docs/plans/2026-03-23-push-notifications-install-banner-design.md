# Push Notifications + Install Banner Fix

**Date:** 2026-03-23

---

## 1. Install Banner Fix

### Problem

The inline `<script>` in layout.tsx calls `e.preventDefault()` on `beforeinstallprompt`, which suppresses Chrome's native mini-infobar. The custom `PwaInstallPrompt` component works but users expect the native Android banner at the top.

### Solution

Remove `e.preventDefault()` from the inline script. Let the native Chrome mini-infobar show on Android. Keep capturing the event reference so the custom component can still trigger the native install prompt from a menu item or button ("Download App").

The custom bottom-sheet component becomes a secondary/re-prompt mechanism, not the primary install surface.

### Changes

- `app/[locale]/layout.tsx` — remove `e.preventDefault()` from inline beforeinstallprompt script
- `components/pwa-install-prompt.tsx` — keep as-is for re-prompting, but don't prevent the native banner

---

## 2. Push Notification Pipeline

### Architecture

```
Customer places order -> API creates order -> server pushes to admin devices
Admin changes status -> API updates order -> server pushes to customer devices
```

### 2A. Database: PushSubscription Model

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  userId    String?  @map("user_id")
  endpoint  String   @unique
  p256dh    String
  auth      String
  role      String   @default("customer")  // "admin" | "customer"
  createdAt DateTime @default(now()) @map("created_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_subscriptions")
}
```

### 2B. VAPID Keys

- Generate once: `npx web-push generate-vapid-keys`
- Store as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env`
- Expose public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

### 2C. API Routes

**`POST /api/tenants/[tenantSlug]/push/subscribe`**
- Body: `{ endpoint, keys: { p256dh, auth }, role }`
- Upserts subscription (unique on endpoint)
- Associates with tenant + authenticated user (if any)

**`DELETE /api/tenants/[tenantSlug]/push/subscribe`**
- Body: `{ endpoint }`
- Removes subscription

### 2D. Server-Side Push Utility

`lib/push/send.ts`:
- `sendPushToAdmins(tenantId, payload)` — sends to all admin subscriptions for tenant
- `sendPushToCustomer(tenantId, userId, payload)` — sends to customer subscriptions
- Uses `web-push` library with VAPID credentials
- Auto-removes subscriptions that return 404/410 (expired/unsubscribed)
- Fire-and-forget (never crashes caller)

Payload format matches existing SW handler:
```json
{
  "title": "New Order #42",
  "body": "John D. placed an order for EUR 24.50",
  "icon": "/api/pwa-icon?size=192",
  "url": "/admin/orders"
}
```

### 2E. Client-Side Hook

`hooks/use-push-subscription.ts`:
- `usePushSubscription(role: 'admin' | 'customer')`
- Returns `{ isSupported, permission, isSubscribed, subscribe(), unsubscribe() }`
- `subscribe()`: checks permission -> requests if needed -> calls pushManager.subscribe() -> posts to API
- `unsubscribe()`: calls pushManager unsubscribe -> deletes from API
- Stores subscription state in localStorage for quick hydration

### 2F. Permission Prompt UI

**PWA best practice: never ask on first page load. Ask in context.**

- **Customer**: After successful order placement, show a soft-prompt: "Want notifications when your order is ready?" with Accept/No thanks buttons. Only if permission is `default` (not yet asked).
- **Admin**: Notification bell toggle in admin header. Shows dot indicator when not subscribed. Click toggles subscription.

### 2G. Trigger Points

1. **New order created** (`POST /api/tenants/[slug]/orders`):
   - After order saved to DB, call `sendPushToAdmins(tenantId, { title, body, url: '/admin/orders' })`

2. **Order status changed** (`PATCH /api/admin/[tenantId]/orders/[orderId]`):
   - After status updated, call `sendPushToCustomer(tenantId, userId, { title, body, url: '/order' })`
   - Status-specific messages: "Your order is being prepared", "Your order is ready for pickup", etc.

### 2H. Service Worker

Already handles `push` and `notificationclick` events. No changes needed.

---

## 3. PWA Best Practices Fixes

### 3A. Maskable Icon

Add `"maskable"` purpose icon to manifest for Android adaptive icon support:
```json
{ "src": "/api/pwa-icon?size=512", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
```

### 3B. Offline Fallback

Add minimal offline fallback to SW:
- Cache a simple `/offline.html` page during SW install
- Serve it when a navigation request fails (network offline)
- Just shows tenant name + "You're offline. Please check your connection."

### 3C. Manifest Additions

```json
{
  "prefer_related_applications": false,
  "categories": ["food", "shopping"]
}
```

---

## Non-Goals

- Background sync for offline order queuing (future)
- Rich notification actions (reply, buttons) (future)
- Firebase Cloud Messaging (using standard Web Push Protocol instead)
- Push notification analytics/tracking
