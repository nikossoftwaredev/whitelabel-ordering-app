# Scaling Hardening — Approach B Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix four reliability bugs that can cause lost orders, duplicate order numbers, silent failures, or duplicate Stripe processing.

**Architecture:** Four independent, surgical changes — no new dependencies, no schema redesign. Redis (already in `lib/redis/index.ts`) handles idempotency. Prisma unique constraint handles order number collisions. Try/catch hardening isolates notification failures from order creation.

**Tech Stack:** Next.js 15, Prisma 5, Upstash Redis (`@upstash/redis`), Stripe webhooks, Supabase Realtime (`orderEvents`).

---

### Task 1: Remove `process.env.NEXTAUTH_URL` mutation in proxy.ts

**Context:** `proxy.ts:40` mutates a global `process.env` variable on every API request. On Vercel, a single warm serverless instance can process concurrent requests — two requests from different subdomains will overwrite each other's NEXTAUTH_URL mid-flight. The fix is to remove the mutation; `NEXTAUTH_URL` is already set correctly as a stable env var at deploy time.

**Files:**
- Modify: `proxy.ts:40`

**Step 1: Remove the mutation block**

In `proxy.ts`, remove lines 35–40 (the comment + the `process.env.NEXTAUTH_URL` assignment):

```ts
// Remove these lines:
// Set NEXTAUTH_URL dynamically so auth callbacks use the correct subdomain
const realHost = request.headers.get("host") || "localhost:3000";
const protocol = realHost.includes("localhost") || realHost.includes("lvh.me")
  ? "http"
  : "https";
process.env.NEXTAUTH_URL = `${protocol}://${realHost}`;
```

After removal, the start of the API block (`if (pathname.startsWith("/api")) {`) should go directly to the cookie-based tenant override:

```ts
if (pathname.startsWith("/api")) {
  // Cookie-based tenant override for environments without wildcard subdomains
  const apiTenantCookie = request.cookies.get("__tenant")?.value;
  const realHost = request.headers.get("host") || "localhost:3000";
  const tenantHost = apiTenantCookie ? `${apiTenantCookie}.app` : realHost;

  const response = NextResponse.next({
    request: { headers: new Headers(request.headers) },
  });
  response.headers.set("x-tenant-host", tenantHost);
  // ... rest unchanged
```

Note: `realHost` is still needed for `tenantHost` — just declare it where it's used, not before.

**Step 2: Verify auth still works**

Start dev server (`pnpm dev`) and sign in with Google OAuth. Confirm redirect and session work correctly.

**Step 3: Commit**

```bash
git add proxy.ts
git commit -m "fix: remove process.env.NEXTAUTH_URL mutation from middleware"
```

---

### Task 2: Add unique constraint on order number + retry logic

**Context:** `lib/orders/order-number.ts` reads `COUNT(*)` of today's orders, then the caller inserts with that number in a separate transaction. Two concurrent requests get the same count → same order number → one insert wins, the other gets a DB error (or worse, a duplicate if there's no constraint). Fix in two parts: add a DB unique constraint so the DB enforces uniqueness, then add retry logic at the call site.

**Files:**
- Modify: `lib/db/schema.prisma` — add `@@unique` to Order model
- Modify: `app/api/tenants/[tenantSlug]/orders/route.ts` — wrap order creation in retry loop

**Step 1: Add unique constraint to schema**

In `lib/db/schema.prisma`, find the `orders` model (around line 632). Add `@@unique([tenantId, orderNumber])` before the existing `@@index` lines:

```prisma
  @@unique([tenantId, orderNumber])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([customerId])
  @@index([tenantId, paymentStatus])
  @@index([tenantId, orderType, createdAt])
  @@map("orders")
```

**Step 2: Run migration**

```bash
pnpm prisma migrate dev --name add-order-number-unique-constraint
```

Expected: new migration file created and applied. Prisma client regenerated.

**Step 3: Add retry logic at the order creation call site**

In `app/api/tenants/[tenantSlug]/orders/route.ts`, replace the current single-shot order number + transaction block (lines 258–351) with a retry loop. The key change: catch Prisma error code `P2002` (unique constraint violation) and regenerate the order number:

```ts
// Replace:
// const orderNumber = await generateOrderNumber(tenant.id);
// const order = await prisma.$transaction(async (tx) => { ... });

// With:
let order: Awaited<ReturnType<typeof prisma.$transaction>>;
const MAX_RETRIES = 3;
for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
  const orderNumber = await generateOrderNumber(tenant.id);
  try {
    order = await prisma.$transaction(async (tx) => {
      // ... exact same transaction body as before, using `orderNumber` from outer scope
    });
    break; // success
  } catch (err) {
    const isUniqueViolation =
      err instanceof Error &&
      "code" in err &&
      (err as { code: string }).code === "P2002";
    if (isUniqueViolation && attempt < MAX_RETRIES - 1) continue;
    throw err;
  }
}
```

After the loop, `order` is guaranteed to be set (or an error was thrown). TypeScript will need a non-null assertion since it can't see that `break` guarantees assignment — cast with `order!` when accessing it below.

**Step 4: Verify**

Start dev server and place a test order. Confirm order is created with an order number and no TS errors (`pnpm tsc --noEmit`).

**Step 5: Commit**

```bash
git add lib/db/schema.prisma prisma/migrations app/api/tenants/\[tenantSlug\]/orders/route.ts
git commit -m "fix: add unique constraint on order number and retry on collision"
```

---

### Task 3: Harden notifications so they never kill an order response

**Context:** In `app/api/tenants/[tenantSlug]/orders/route.ts` (lines 353–370), `orderEvents.emitNewOrder()` is awaited directly — if Supabase Realtime is down, this throws and the HTTP response fails even though the order was already committed to the DB. `sendPushToAdmins()` is called without `.catch()`, leaving an unhandled rejection. Both are notifications — they should never affect order delivery.

**Files:**
- Modify: `app/api/tenants/[tenantSlug]/orders/route.ts`

**Step 1: Wrap `emitNewOrder` in try/catch**

Replace:
```ts
// Broadcast new order to admin dashboard (must await to ensure delivery)
await orderEvents.emitNewOrder({
  tenantId: tenant.id,
  orderId: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  total: order.total,
  customerName: order.customerName,
});
```

With:
```ts
orderEvents.emitNewOrder({
  tenantId: tenant.id,
  orderId: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  total: order.total,
  customerName: order.customerName,
}).catch((err) => console.error("[orderEvents] emitNewOrder failed:", err));
```

**Step 2: Add `.catch()` to `sendPushToAdmins`**

Replace:
```ts
sendPushToAdmins(tenant.id, {
  title: `New Order #${orderNumber}`,
  body: `${order.customerName} placed an order for ${tenant.currency} ${(total / 100).toFixed(2)}`,
  icon: "/api/pwa-icon?size=192",
  url: "/admin/orders",
});
```

With:
```ts
sendPushToAdmins(tenant.id, {
  title: `New Order #${orderNumber}`,
  body: `${order.customerName} placed an order for ${tenant.currency} ${(total / 100).toFixed(2)}`,
  icon: "/api/pwa-icon?size=192",
  url: "/admin/orders",
}).catch((err) => console.error("[push] sendPushToAdmins failed:", err));
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add app/api/tenants/\[tenantSlug\]/orders/route.ts
git commit -m "fix: isolate notification failures from order creation response"
```

---

### Task 4: Add Redis idempotency to Stripe webhook handler

**Context:** Stripe retries webhooks on non-2xx responses for up to 72 hours. Without idempotency, a server crash after committing the DB update but before returning 200 will cause Stripe to retry → the same payment event fires twice. For `payment_intent.succeeded` this would `update` twice (idempotent by accident), but for more complex future handlers it could corrupt state. The fix costs one Redis round-trip per webhook call.

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

**Step 1: Add Redis idempotency check after signature verification**

Import `redis` at the top of the file:

```ts
import { redis } from "@/lib/redis";
```

After the `stripe.webhooks.constructEvent` block and before the `switch`, add:

```ts
// Idempotency: ignore events already processed (Stripe retries on non-2xx)
const idempotencyKey = `stripe:event:${event.id}`;
const alreadyProcessed = await redis.get(idempotencyKey);
if (alreadyProcessed) {
  return NextResponse.json({ received: true });
}
```

**Step 2: Mark event as processed after the switch**

Replace the final `return NextResponse.json({ received: true });` with:

```ts
// Mark as processed — 25h TTL (Stripe retries for up to 24h)
await redis.set(idempotencyKey, "1", { ex: 90000 });
return NextResponse.json({ received: true });
```

**Step 3: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 4: Verify locally**

Use the Stripe CLI to replay a webhook event:
```bash
stripe events resend <event_id>
```

Send the same event twice. The second call should return 200 without hitting the DB (check logs — no Prisma queries for the second call).

**Step 5: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "fix: add Redis idempotency to Stripe webhook handler"
```
