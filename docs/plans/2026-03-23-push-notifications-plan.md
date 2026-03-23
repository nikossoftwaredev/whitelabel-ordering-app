# Push Notifications + Install Banner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Web Push notification pipeline for order status updates (admin + customer) and fix PWA install banner to show Chrome's native mini-infobar.

**Architecture:** Web Push API with VAPID authentication. Server sends pushes via `web-push` library when orders are created/updated. Client subscribes via `PushManager` API. Push subscriptions stored in Prisma/Supabase. Install banner fixed by not suppressing `beforeinstallprompt`.

**Tech Stack:** `web-push` (server), Web Push API (browser), Prisma, Next.js API routes, Zustand, Service Worker

---

### Task 1: Fix Install Banner — Allow Native Chrome Mini-Infobar

**Files:**
- Modify: `app/[locale]/layout.tsx` (inline script, ~line 162)

**Step 1: Remove `e.preventDefault()` from inline script**

In `app/[locale]/layout.tsx`, change the inline `<script>` from:
```js
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__pwaInstallPrompt=e;});
```
to:
```js
window.addEventListener('beforeinstallprompt',function(e){window.__pwaInstallPrompt=e;});
```

This lets Chrome show the native mini-infobar while still capturing the event for the custom component.

**Step 2: Add PWA best practice fields to manifest**

In `app/manifest.ts`, add to the returned object:
```ts
prefer_related_applications: false,
categories: ["food", "shopping"],
```

Also add a maskable icon entry to the `icons` array (both hasLogo branches):
```ts
{ src: "/api/pwa-icon?size=512", sizes: "512x512", type: "image/png", purpose: "maskable" },
```
For the static fallback branch:
```ts
{ src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
```

**Step 3: Add offline fallback to service worker**

Create `public/offline.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fafafa; color: #333; text-align: center; }
    .container { padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're offline</h1>
    <p>Please check your internet connection and try again.</p>
  </div>
</body>
</html>
```

Update `public/sw.js` install event to cache it:
```js
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("offline-v1").then((cache) => cache.add("/offline.html"))
  );
  self.skipWaiting();
});
```

Add fetch handler for navigation fallback:
```js
self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/offline.html")
      )
    );
  }
});
```

**Step 4: Verify and commit**

Run: `pnpm tsc --noEmit && pnpm lint`

```bash
git add app/[locale]/layout.tsx app/manifest.ts public/sw.js public/offline.html
git commit -m "fix: allow native install banner + add offline fallback + maskable icon"
```

---

### Task 2: Install `web-push` and Generate VAPID Keys

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.env`

**Step 1: Install web-push**

```bash
pnpm add web-push
pnpm add -D @types/web-push
```

**Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output. Add to `.env`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<public key>"
VAPID_PRIVATE_KEY="<private key>"
```

Add template entries to `.env.example`:
```
# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="<your VAPID public key>"
VAPID_PRIVATE_KEY="<your VAPID private key>"
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add web-push dependency and VAPID env vars"
```

---

### Task 3: Add PushSubscription Prisma Model + Migration

**Files:**
- Modify: `lib/db/schema.prisma`

**Step 1: Add model to schema**

Add after existing models in `lib/db/schema.prisma`:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  userId    String?  @map("user_id")
  endpoint  String   @unique
  p256dh    String
  auth      String
  role      String   @default("customer") // "admin" | "customer"
  createdAt DateTime @default(now()) @map("created_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User?  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tenantId, role])
  @@map("push_subscriptions")
}
```

Add relation fields to existing models:
- In `Tenant` model, add: `pushSubscriptions PushSubscription[]`
- In `User` model, add: `pushSubscriptions PushSubscription[]`

**Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add-push-subscriptions
pnpm prisma generate
```

**Step 3: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add lib/db/schema.prisma prisma/migrations/
git commit -m "feat: add PushSubscription model and migration"
```

---

### Task 4: Push Subscribe/Unsubscribe API Routes

**Files:**
- Create: `app/api/tenants/[tenantSlug]/push/subscribe/route.ts`

**Step 1: Create the API route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ tenantSlug: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { endpoint, keys, role = "customer" } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  if (!["admin", "customer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      tenantId: tenant.id,
      userId: session?.user?.id ?? null,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      role,
    },
    update: {
      tenantId: tenant.id,
      userId: session?.user?.id ?? null,
      p256dh: keys.p256dh,
      auth: keys.auth,
      role,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, tenantId: tenant.id },
  });

  return NextResponse.json({ ok: true });
}
```

**Step 2: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add app/api/tenants/\[tenantSlug\]/push/subscribe/route.ts
git commit -m "feat: add push subscription API routes (subscribe/unsubscribe)"
```

---

### Task 5: Server-Side Push Sending Utility

**Files:**
- Create: `lib/push/send.ts`

**Step 1: Create the push sending utility**

```ts
import webpush from "web-push";

import { prisma } from "@/lib/db/prisma";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails("mailto:noreply@example.com", VAPID_PUBLIC, VAPID_PRIVATE);
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

async function sendToSubscriptions(
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
) {
  const expired: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 or 410 means subscription is expired/invalid
        if (status === 404 || status === 410) {
          expired.push(sub.id);
        }
        // Silently ignore other errors (network issues, rate limits)
      }
    })
  );

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { id: { in: expired } } })
      .catch(() => {});
  }
}

export async function sendPushToAdmins(tenantId: string, payload: PushPayload) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { tenantId, role: "admin" },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length > 0) {
      await sendToSubscriptions(subs, payload);
    }
  } catch {
    // Never crash caller
  }
}

export async function sendPushToCustomer(
  tenantId: string,
  userId: string | null,
  payload: PushPayload
) {
  if (!userId) return;
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { tenantId, role: "customer", userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (subs.length > 0) {
      await sendToSubscriptions(subs, payload);
    }
  } catch {
    // Never crash caller
  }
}
```

**Step 2: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add lib/push/send.ts
git commit -m "feat: add server-side web-push sending utility"
```

---

### Task 6: Wire Push Notifications into Order API Routes

**Files:**
- Modify: `app/api/tenants/[tenantSlug]/orders/route.ts` (POST handler)
- Modify: `app/api/admin/[tenantId]/orders/[orderId]/route.ts` (PATCH handler)

**Step 1: Add push to order creation (admin notification)**

In `app/api/tenants/[tenantSlug]/orders/route.ts`, after the existing `orderEvents.emitNewOrder()` call, add:

```ts
import { sendPushToAdmins } from "@/lib/push/send";

// After emitNewOrder call:
sendPushToAdmins(tenant.id, {
  title: `New Order #${orderNumber}`,
  body: `${customerName} placed an order for ${tenant.currency} ${total.toFixed(2)}`,
  icon: "/api/pwa-icon?size=192",
  url: `/${locale}/admin/orders`,
});
```

Fire-and-forget (no await needed).

**Step 2: Add push to order status change (customer notification)**

In `app/api/admin/[tenantId]/orders/[orderId]/route.ts`, after the existing `orderEvents.emitStatusChange()` call, add:

```ts
import { sendPushToCustomer } from "@/lib/push/send";

// Status-specific messages
const statusMessages: Record<string, string> = {
  ACCEPTED: "Your order has been accepted!",
  PREPARING: "Your order is being prepared",
  READY: "Your order is ready for pickup!",
  DELIVERING: "Your order is on the way!",
  COMPLETED: "Your order has been completed",
  CANCELLED: "Your order has been cancelled",
};

const message = statusMessages[status] || `Order status: ${status}`;

sendPushToCustomer(tenantId, updated.customerId, {
  title: `Order #${updated.orderNumber}`,
  body: message,
  icon: "/api/pwa-icon?size=192",
  url: "/order",
});
```

Fire-and-forget (no await needed).

**Step 3: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add app/api/tenants/\[tenantSlug\]/orders/route.ts app/api/admin/\[tenantId\]/orders/\[orderId\]/route.ts
git commit -m "feat: send push notifications on order create/status change"
```

---

### Task 7: Client-Side Push Subscription Hook

**Files:**
- Create: `hooks/use-push-subscription.ts`

**Step 1: Create the hook**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

import { useTenant } from "@/components/tenant-provider";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

export function usePushSubscription(role: "admin" | "customer") {
  const tenant = useTenant();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !tenant) return false;

    try {
      // Request permission if not yet granted
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") return false;
      } else if (Notification.permission === "denied") {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();
      await fetch(`/api/tenants/${tenant.slug}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          role,
        }),
      });

      setIsSubscribed(true);
      return true;
    } catch {
      return false;
    }
  }, [isSupported, tenant, role]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !tenant) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch(`/api/tenants/${tenant.slug}/push/subscribe`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch {
      // Silently fail
    }
  }, [isSupported, tenant]);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe };
}
```

**Step 2: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add hooks/use-push-subscription.ts
git commit -m "feat: add usePushSubscription client hook"
```

---

### Task 8: Admin Push Notification Toggle in Header

**Files:**
- Modify: `components/admin/admin-header.tsx`

**Step 1: Add notification bell toggle**

Import the hook and add a bell icon button next to the existing sound toggle:

```tsx
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { Bell, BellOff } from "lucide-react";
```

Inside the component, add:
```tsx
const { isSupported: pushSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription("admin");
```

Add button next to the sound toggle (before the separator):
```tsx
{pushSupported && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => isSubscribed ? unsubscribe() : subscribe()}
        className={isSubscribed ? "" : "text-muted-foreground"}
      >
        {isSubscribed ? <Bell className="size-4" /> : <BellOff className="size-4" />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isSubscribed ? "Push notifications on" : "Enable push notifications"}
    </TooltipContent>
  </Tooltip>
)}
```

**Step 2: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add components/admin/admin-header.tsx
git commit -m "feat: add push notification toggle to admin header"
```

---

### Task 9: Customer Push Notification Prompt After Order

**Files:**
- Modify: `components/order/order-confirmation.tsx`

**Step 1: Add push notification soft-prompt**

After order is placed and the confirmation screen is showing, display a one-time prompt if `Notification.permission === "default"`.

Import the hook:
```tsx
import { usePushSubscription } from "@/hooks/use-push-subscription";
```

Inside the component:
```tsx
const { isSupported: pushSupported, permission, isSubscribed, subscribe } = usePushSubscription("customer");
const [pushDismissed, setPushDismissed] = useState(false);
const showPushPrompt = pushSupported && permission === "default" && !isSubscribed && !pushDismissed;
```

Render the prompt (below the order tracking UI):
```tsx
{showPushPrompt && (
  <div className="rounded-xl border bg-card p-4 space-y-3">
    <div className="space-y-1">
      <h3 className="font-semibold text-sm">{t("pushPromptTitle")}</h3>
      <p className="text-sm text-muted-foreground">{t("pushPromptDescription")}</p>
    </div>
    <div className="flex gap-2">
      <Button size="sm" onClick={() => subscribe()}>
        {t("pushPromptAccept")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setPushDismissed(true)}>
        {t("pushPromptDismiss")}
      </Button>
    </div>
  </div>
)}
```

**Step 2: Add translations**

In `messages/en.json`, add to the `"Order"` section:
```json
"pushPromptTitle": "Get order updates",
"pushPromptDescription": "We'll notify you when your order status changes.",
"pushPromptAccept": "Enable notifications",
"pushPromptDismiss": "No thanks"
```

In `messages/el.json`, add to the `"Order"` section:
```json
"pushPromptTitle": "Ενημερώσεις παραγγελίας",
"pushPromptDescription": "Θα σας ειδοποιήσουμε όταν αλλάξει η κατάσταση της παραγγελίας σας.",
"pushPromptAccept": "Ενεργοποίηση ειδοποιήσεων",
"pushPromptDismiss": "Όχι, ευχαριστώ"
```

**Step 3: Verify and commit**

Run: `pnpm tsc --noEmit`

```bash
git add components/order/order-confirmation.tsx messages/en.json messages/el.json
git commit -m "feat: add customer push notification prompt after order placement"
```

---

### Task 10: Final Verification

**Step 1: Full build check**

```bash
pnpm tsc --noEmit && pnpm lint && pnpm build
```

**Step 2: Manual test checklist**

- [ ] Visit tenant site on mobile — Chrome native install mini-infobar appears
- [ ] Install PWA — opens correctly in standalone mode
- [ ] Go offline — offline fallback page shows
- [ ] Admin header — bell icon toggles push subscription
- [ ] Place an order — push prompt appears on confirmation page
- [ ] Accept push — browser permission granted, subscription stored in DB
- [ ] Admin receives push when customer orders
- [ ] Customer receives push when admin changes order status
- [ ] Clicking push notification opens the right page

**Step 3: Final commit if any fixes needed**
