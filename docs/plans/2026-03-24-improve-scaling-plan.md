# Scaling Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the app production-ready for 100 tenants and 1000 orders/hour without exceeding ~$50/month hosting costs.

**Architecture:** Use Next.js `use cache` for menu/tenant data (free on Vercel), Upstash Redis for distributed rate limiting (free tier), optimize DB queries with aggregations and batch loading, add missing indexes, and configure Vercel spend protection.

**Tech Stack:** Next.js 16 `use cache` + `cacheTag`, `@upstash/redis` + `@upstash/ratelimit`, Prisma aggregations, Vercel spend management.

---

## Task 1: Vercel Dashboard Configuration

**No code changes.** Configure these settings in the Vercel dashboard manually.

**Step 1: Enable Spend Protection**
- Go to Vercel Dashboard > Settings > Billing > Spend Management
- Set hard spend limit to $50 (total bill capped at ~$70 with base $20)
- Enable email + SMS notifications at 50%, 75%, 100%

**Step 2: Enable Attack Challenge Mode**
- Go to Vercel Dashboard > Settings > Security
- Enable Attack Challenge Mode (auto-challenges suspicious traffic)
- This prevents DDoS-driven billing spikes

**Step 3: Verify Wildcard Domain**
- Go to Vercel Dashboard > Project > Settings > Domains
- Confirm `*.yourdomain.com` wildcard is configured
- Confirm nameservers point to `ns1.vercel-dns.com` and `ns2.vercel-dns.com`

**Step 4: Verify Region**
- Confirm `vercel.json` has `"regions": ["fra1"]` (Frankfurt, close to Greek users)
- Already configured correctly

---

## Task 2: Add Missing Database Indexes

**Files:**
- Modify: `lib/db/schema.prisma` (Order model ~line 553, OrderItem model ~line 574)

**Step 1: Add indexes to schema.prisma**

Add these indexes to the `Order` model (after line 555):

```prisma
  @@index([tenantId, paymentStatus])
  @@index([tenantId, orderType, createdAt])
```

Add this index to the `OrderItem` model (after line 574):

```prisma
  @@index([productId])
```

**Step 2: Generate and run migration**

Run:
```bash
pnpm db:migrate --name add_scaling_indexes
```

Expected: Migration creates indexes on `orders(tenant_id, payment_status)`, `orders(tenant_id, order_type, created_at)`, and `order_items(product_id)`.

**Step 3: Verify indexes exist**

Run:
```bash
pnpm db:studio
```

Check the Order and OrderItem tables have the new indexes.

**Step 4: Commit**

```bash
git add lib/db/schema.prisma prisma/migrations/
git commit -m "perf: add database indexes for scaling (payment status, order type, product lookups)"
```

---

## Task 3: Optimize Stats Endpoint (Replace findMany with Aggregations)

**Files:**
- Modify: `app/api/admin/[tenantId]/stats/route.ts`

**Step 1: Rewrite stats route to use aggregations**

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { ACTIVE_ORDER_STATUSES } from "@/lib/general/status-config";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const [
    todayAgg,
    todayRefundAgg,
    activeOrders,
    weekAgg,
    popularProducts,
    recentOrders,
  ] = await Promise.all([
    // Today's revenue + count (exclude REJECTED)
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: todayStart }, status: { not: "REJECTED" } },
      _sum: { total: true, tipAmount: true },
      _count: true,
    }),
    // Today's refunds
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: todayStart }, paymentStatus: "REFUNDED" },
      _sum: { refundAmount: true },
      _count: true,
    }),
    // Active orders count
    prisma.order.count({
      where: { tenantId, status: { in: ACTIVE_ORDER_STATUSES as any } },
    }),
    // Week revenue
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: weekStart }, status: { not: "REJECTED" } },
      _sum: { total: true },
    }),
    // Popular products (last 7 days)
    prisma.orderItem.groupBy({
      by: ["productName"],
      where: { order: { tenantId, createdAt: { gte: weekStart } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    // Recent orders (still need findMany for this, but only 5 rows)
    prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        customerName: true,
        items: { select: { productName: true, quantity: true } },
      },
    }),
  ]);

  return NextResponse.json({
    today: {
      revenue: todayAgg._sum.total || 0,
      orders: todayAgg._count,
      tips: todayAgg._sum.tipAmount || 0,
      refunds: todayRefundAgg._count,
      refundAmount: todayRefundAgg._sum.refundAmount || 0,
    },
    activeOrders,
    weekRevenue: weekAgg._sum.total || 0,
    popularProducts: popularProducts.map((p) => ({
      name: p.productName,
      quantity: p._sum.quantity || 0,
    })),
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      customerName: o.customerName,
      items: o.items,
    })),
  });
}
```

**Key changes:**
- Replaced 4 sequential queries with 6 parallel queries via `Promise.all`
- Replaced `findMany` + JS reduce with `aggregate` for today's stats and week revenue
- No more loading all orders into memory

**Step 2: Verify it compiles**

Run:
```bash
pnpm tsc --noEmit
```

Expected: No errors.

**Step 3: Test manually**

Open admin dashboard, verify stats still load correctly. Compare numbers with before.

**Step 4: Commit**

```bash
git add app/api/admin/[tenantId]/stats/route.ts
git commit -m "perf: optimize stats endpoint with aggregations and parallel queries"
```

---

## Task 4: Fix Cart Validation N+1 (Batch Product Loading)

**Files:**
- Modify: `lib/orders/validate-cart.ts`

**Step 1: Rewrite validate-cart to batch-fetch products**

Replace the entire file content with:

```typescript
import { prisma } from "@/lib/db";
import { calcBogoTotal, hasActiveOffer } from "@/lib/orders/offers";

interface CartItemModifier {
  modifierOptionId: string;
}

interface CartItem {
  productId: string;
  quantity: number;
  modifiers?: CartItemModifier[];
  notes?: string;
}

interface ValidatedItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  modifiers: {
    modifierOptionId: string;
    name: string;
    priceAdjustment: number;
  }[];
  totalPrice: number;
}

interface ValidationResult {
  valid: boolean;
  items: ValidatedItem[];
  subtotal: number;
  errors: string[];
}

export async function validateCart(
  tenantId: string,
  cartItems: CartItem[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const validatedItems: ValidatedItem[] = [];

  if (!cartItems?.length) {
    return { valid: false, items: [], subtotal: 0, errors: ["Cart is empty"] };
  }

  // Batch-fetch all products in one query instead of N queries
  const productIds = cartItems.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, isActive: true },
    include: {
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { options: { where: { isActive: true } } },
          },
        },
      },
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of cartItems) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push(`Product ${item.productId} not found or inactive`);
      continue;
    }

    if (item.quantity < 1) {
      errors.push(`Invalid quantity for ${product.name}`);
      continue;
    }

    // Validate modifiers
    const validatedModifiers: ValidatedItem["modifiers"] = [];
    let modifierTotal = 0;

    for (const pmg of product.modifierGroups) {
      const group = pmg.modifierGroup;
      const selectedForGroup = (item.modifiers || []).filter((m) =>
        group.options.some((o) => o.id === m.modifierOptionId)
      );

      if (group.required && selectedForGroup.length < group.minSelect) {
        errors.push(
          `${product.name}: ${group.name} requires at least ${group.minSelect} selection(s)`
        );
      }

      if (selectedForGroup.length > group.maxSelect) {
        errors.push(
          `${product.name}: ${group.name} allows at most ${group.maxSelect} selection(s)`
        );
      }

      for (const sel of selectedForGroup) {
        const option = group.options.find(
          (o) => o.id === sel.modifierOptionId
        );
        if (option) {
          validatedModifiers.push({
            modifierOptionId: option.id,
            name: option.name,
            priceAdjustment: option.priceAdjustment,
          });
          modifierTotal += option.priceAdjustment;
        }
      }
    }

    const isBogoActive = hasActiveOffer(product);

    let totalPrice: number;
    let unitPrice: number;

    if (isBogoActive && item.quantity >= 2) {
      unitPrice = product.offerPrice!;
      totalPrice = calcBogoTotal(item.quantity, product.offerPrice!, product.price, modifierTotal);
    } else {
      unitPrice = product.price;
      totalPrice = (product.price + modifierTotal) * item.quantity;
    }

    validatedItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice,
      modifiers: validatedModifiers,
      totalPrice,
    });
  }

  const subtotal = validatedItems.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    valid: errors.length === 0,
    items: validatedItems,
    subtotal,
    errors,
  };
}
```

**Key change:** Replaced the `for` loop with individual `findFirst` calls (N queries) with a single `findMany` using `{ id: { in: productIds } }` (1 query). Rest of the logic is identical.

**Step 2: Verify it compiles**

Run:
```bash
pnpm tsc --noEmit
```

**Step 3: Test by placing an order**

Place a test order with 3+ items and modifiers. Verify cart validation still works correctly.

**Step 4: Commit**

```bash
git add lib/orders/validate-cart.ts
git commit -m "perf: batch-fetch products in cart validation (N+1 → 1 query)"
```

---

## Task 5: Install and Configure Upstash Redis

**Files:**
- Modify: `package.json` (new dependency)
- Create: `lib/redis/index.ts`
- Modify: `.env.example`

**Step 1: Create Upstash Redis database**

1. Go to https://console.upstash.com
2. Create a new Redis database
3. Region: `eu-west-1` (Ireland, closest to Frankfurt/Vercel fra1)
4. Choose "Pay as you go" plan (free up to 500K commands/month)
5. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Step 2: Install Upstash packages**

Run:
```bash
pnpm add @upstash/redis @upstash/ratelimit
```

**Step 3: Add env vars to .env.example**

Add at the end of `.env.example`:

```bash
# ------------------------------------------------------------------------------
# Upstash Redis — for distributed rate limiting and caching
# ------------------------------------------------------------------------------
# Get from: https://console.upstash.com (create a Redis database)
# Region: eu-west-1 (closest to Vercel fra1)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Step 4: Add the same env vars to your `.env.local`**

Fill in the actual values from the Upstash console.

**Step 5: Create Redis client**

Create `lib/redis/index.ts`:

```typescript
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

**Step 6: Verify connection**

Run:
```bash
pnpm dev
```

Open browser console or create a quick test API route to confirm connection works.

**Step 7: Add env vars to Vercel**

Go to Vercel Dashboard > Project > Settings > Environment Variables. Add:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Or use the Upstash integration from Vercel Marketplace (auto-configures env vars).

**Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml lib/redis/index.ts .env.example
git commit -m "feat: add Upstash Redis client for distributed rate limiting"
```

---

## Task 6: Replace In-Memory Rate Limiter with Upstash

**Files:**
- Rewrite: `lib/security/rate-limit.ts`

**Step 1: Rewrite rate-limit.ts with Upstash**

Replace the entire file content with:

```typescript
import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/redis";

// API rate limiter: 60 requests per 1 minute per token
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "rl:api",
});

// Auth rate limiter: 10 requests per 15 minutes per token
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  prefix: "rl:auth",
});

// Order creation limiter: 10 orders per minute per user
export const orderLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "rl:order",
});

// Checkout limiter: 5 attempts per minute per user
export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "rl:checkout",
});
```

**Step 2: Update rate limit usage in API routes**

Find all files that import from `@/lib/security/rate-limit` and update the call pattern.

The old pattern was:
```typescript
const { success } = apiLimiter.check(limit, token);
```

The new Upstash pattern is:
```typescript
const { success } = await apiLimiter.limit(token);
```

Search for all usages:
```bash
pnpm grep -r "apiLimiter\|authLimiter" --include="*.ts" --include="*.tsx"
```

Update each usage to use `await limiter.limit(token)` instead of `limiter.check(limit, token)`.

**Step 3: Add order rate limiting to order creation route**

In `app/api/tenants/[tenantSlug]/orders/route.ts`, add near the top of the POST handler (after auth check):

```typescript
import { orderLimiter } from "@/lib/security/rate-limit";

// Inside POST handler, after session check:
const { success } = await orderLimiter.limit(session.user.id);
if (!success) {
  return NextResponse.json(
    { error: "Too many orders. Please wait a moment." },
    { status: 429 }
  );
}
```

**Step 4: Add checkout rate limiting**

In `app/api/tenants/[tenantSlug]/checkout/route.ts`, add near the top of the POST handler:

```typescript
import { checkoutLimiter } from "@/lib/security/rate-limit";

// Inside POST handler, after session check:
const { success } = await checkoutLimiter.limit(session.user.id);
if (!success) {
  return NextResponse.json(
    { error: "Too many payment attempts. Please wait." },
    { status: 429 }
  );
}
```

**Step 5: Verify it compiles**

Run:
```bash
pnpm tsc --noEmit
```

**Step 6: Test rate limiting**

Rapidly hit the order creation endpoint. After 10 requests in a minute, should return 429.

**Step 7: Commit**

```bash
git add lib/security/rate-limit.ts app/api/tenants/\[tenantSlug\]/orders/route.ts app/api/tenants/\[tenantSlug\]/checkout/route.ts
git commit -m "feat: replace in-memory rate limiter with distributed Upstash Redis"
```

---

## Task 7: Add Next.js `use cache` for Menu Data

**Files:**
- Create: `lib/cache/menu.ts`
- Modify: `app/api/tenants/[tenantSlug]/menu/route.ts`
- Modify: `app/api/admin/[tenantId]/products/route.ts` (POST — invalidate)
- Modify: `app/api/admin/[tenantId]/products/[productId]/route.ts` (PUT/DELETE — invalidate)
- Modify: `app/api/admin/[tenantId]/categories/route.ts` (POST — invalidate)
- Modify: `next.config.ts` (enable dynamicIO)

**Step 1: Enable dynamicIO in next.config.ts**

The `use cache` directive requires `dynamicIO` experimental flag. Modify `next.config.ts`:

```typescript
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.lvh.me"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { hostname: "**" },
    ],
  },
  experimental: {
    dynamicIO: true,
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "zod",
      "@supabase/supabase-js",
      "date-fns",
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");
export default withNextIntl(nextConfig);
```

**Step 2: Create cached menu fetcher**

Create `lib/cache/menu.ts`:

```typescript
"use cache";

import { cacheTag } from "next/cache";

import { prisma } from "@/lib/db";

export async function getCachedMenu(tenantId: string, tenantSlug: string) {
  cacheTag(`menu-${tenantSlug}`);

  const categories = await prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      nameEl: true,
      description: true,
      image: true,
      products: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          nameEl: true,
          description: true,
          descriptionEl: true,
          image: true,
          price: true,
          isVegan: true,
          isVegetarian: true,
          isGlutenFree: true,
          isDairyFree: true,
          containsNuts: true,
          isSpicy: true,
          allergens: true,
          offerType: true,
          offerPrice: true,
          offerStart: true,
          offerEnd: true,
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              modifierGroup: {
                select: {
                  id: true,
                  name: true,
                  nameEl: true,
                  required: true,
                  minSelect: true,
                  maxSelect: true,
                  options: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true,
                      name: true,
                      nameEl: true,
                      priceAdjustment: true,
                      isDefault: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Flatten modifier groups structure
  const formattedCategories = categories.map((cat) => ({
    ...cat,
    products: cat.products.map((product) => ({
      ...product,
      modifierGroups: product.modifierGroups.map((pmg) => pmg.modifierGroup),
    })),
  }));

  return formattedCategories;
}

export async function getCachedPopularProducts(tenantId: string, tenantSlug: string) {
  cacheTag(`popular-${tenantSlug}`);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const popularRaw = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { tenantId, createdAt: { gte: weekStart } },
      product: { isActive: true },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return popularRaw.map((p) => p.productId);
}
```

**Step 3: Update menu route to use cached functions**

Replace `app/api/tenants/[tenantSlug]/menu/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getCachedMenu, getCachedPopularProducts } from "@/lib/cache/menu";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      isPaused: true,
      prepTimeMinutes: true,
      currency: true,
      phone: true,
      email: true,
      address: true,
      config: {
        select: { logo: true, coverImage: true, description: true },
      },
      operatingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Both cached — hit DB only on cache miss or after invalidation
  const [categories, popularProductIds] = await Promise.all([
    getCachedMenu(tenant.id, tenant.slug),
    getCachedPopularProducts(tenant.id, tenant.slug),
  ]);

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      isPaused: tenant.isPaused,
      prepTimeMinutes: tenant.prepTimeMinutes,
      currency: tenant.currency,
      logo: tenant.config?.logo,
      coverImage: tenant.config?.coverImage,
      description: tenant.config?.description,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      operatingHours: tenant.operatingHours,
    },
    categories,
    popularProductIds,
  });
}
```

**Step 4: Create cache invalidation helper**

Create `lib/cache/invalidate.ts`:

```typescript
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";

/**
 * Invalidate all cached menu data for a tenant.
 * Call this whenever products, categories, or modifier groups change.
 */
export async function invalidateMenuCache(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (tenant) {
    revalidateTag(`menu-${tenant.slug}`);
    revalidateTag(`popular-${tenant.slug}`);
  }
}

/**
 * Invalidate cached tenant config data.
 * Call this when tenant settings change.
 */
export async function invalidateTenantCache(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (tenant) {
    revalidateTag(`tenant-${tenant.slug}`);
  }
}
```

**Step 5: Add cache invalidation to product mutations**

In `app/api/admin/[tenantId]/products/route.ts`, add at the end of the POST handler (before `return`):

```typescript
import { invalidateMenuCache } from "@/lib/cache/invalidate";

// At end of POST handler, before return:
await invalidateMenuCache(tenantId);
```

In `app/api/admin/[tenantId]/products/[productId]/route.ts`, add at the end of both PUT and DELETE handlers:

```typescript
import { invalidateMenuCache } from "@/lib/cache/invalidate";

// At end of PUT handler, before return:
await invalidateMenuCache(tenantId);

// At end of DELETE handler, before return:
await invalidateMenuCache(tenantId);
```

In `app/api/admin/[tenantId]/categories/route.ts`, add at the end of POST handler:

```typescript
import { invalidateMenuCache } from "@/lib/cache/invalidate";

// At end of POST handler, before return:
await invalidateMenuCache(tenantId);
```

**Step 6: Add cache invalidation to settings**

In `app/api/admin/[tenantId]/settings/route.ts`, add after line 123 (`await prisma.$transaction(operations)`):

```typescript
import { invalidateMenuCache, invalidateTenantCache } from "@/lib/cache/invalidate";

// After the transaction:
await invalidateTenantCache(tenantId);
await invalidateMenuCache(tenantId);
```

**Step 7: Verify it compiles**

Run:
```bash
pnpm tsc --noEmit
```

**Step 8: Test the cache**

1. Load a tenant's menu page — should work normally
2. Update a product in admin — menu should reflect the change on next load
3. Check Vercel function logs — second menu load should NOT show Prisma queries (cache hit)

**Step 9: Commit**

```bash
git add next.config.ts lib/cache/ app/api/tenants/\[tenantSlug\]/menu/route.ts app/api/admin/\[tenantId\]/products/ app/api/admin/\[tenantId\]/categories/route.ts app/api/admin/\[tenantId\]/settings/route.ts
git commit -m "feat: add Next.js use cache for menu data with tag-based invalidation"
```

---

## Task 8: Fix Invoice Sequence Race Condition

**Files:**
- Modify: `app/api/admin/[tenantId]/invoices/route.ts` (~lines 112-116)

**Step 1: Wrap invoice sequence in serializable transaction**

Replace lines 112-116 in `app/api/admin/[tenantId]/invoices/route.ts`:

```typescript
// OLD:
const sequence = await prisma.invoiceSequence.upsert({
  where: { tenantId_series: { tenantId, series } },
  create: { tenantId, series, lastNumber: 1 },
  update: { lastNumber: { increment: 1 } },
});
```

With:

```typescript
// NEW: Serializable transaction prevents race conditions
const sequence = await prisma.$transaction(
  async (tx) => {
    return tx.invoiceSequence.upsert({
      where: { tenantId_series: { tenantId, series } },
      create: { tenantId, series, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } },
    });
  },
  { isolationLevel: "Serializable" }
);
```

**Step 2: Verify it compiles**

Run:
```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add app/api/admin/\[tenantId\]/invoices/route.ts
git commit -m "fix: prevent invoice sequence race condition with serializable transaction"
```

---

## Task 9: Add File Upload Size Validation

**Files:**
- Modify: `app/api/admin/[tenantId]/upload/route.ts`

**Step 1: Add size and MIME validation**

At the top of the POST handler, after getting the file from FormData, add:

```typescript
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: "File too large. Maximum size is 5MB." },
    { status: 413 }
  );
}

const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
if (!allowedTypes.includes(file.type)) {
  return NextResponse.json(
    { error: "Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed." },
    { status: 415 }
  );
}
```

**Step 2: Verify and commit**

Run:
```bash
pnpm tsc --noEmit
```

```bash
git add app/api/admin/\[tenantId\]/upload/route.ts
git commit -m "fix: add file upload size (5MB) and MIME type validation"
```

---

## Task 10: Update .env — Remove Committed Secrets

**Step 1: Check if .env is in .gitignore**

Run:
```bash
grep "^\.env$" .gitignore
```

If `.env` is NOT listed, add it:

```bash
echo ".env" >> .gitignore
```

**Step 2: Remove .env from git tracking (keep local file)**

Run:
```bash
git rm --cached .env
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "security: remove .env from git tracking, add to .gitignore"
```

**Step 4: Rotate all exposed credentials**

After this is pushed, rotate ALL credentials that were in the `.env` file:
- Supabase database password
- Stripe API keys
- Google OAuth client secret
- Resend API key
- AADE API key
- VAPID keys
- Supabase S3 keys

---

## Task 11: Update Infrastructure Documentation

**Files:**
- Modify: `tasks/infrastructure.md`

**Step 1: Mark completed items**

Update `tasks/infrastructure.md` to check off all items completed in this plan.

**Step 2: Commit**

```bash
git add tasks/infrastructure.md
git commit -m "docs: update infrastructure checklist with completed items"
```

---

## Summary

| Task | Type | Impact |
|------|------|--------|
| 1. Vercel settings | Config | Prevents bill shock, DDoS protection |
| 2. DB indexes | Migration | Faster queries on payment status, order type |
| 3. Stats aggregations | Performance | 10-50x faster dashboard loads |
| 4. Cart batch loading | Performance | N+1 → 1 query per order |
| 5. Upstash Redis setup | Infrastructure | Foundation for distributed rate limiting |
| 6. Distributed rate limiting | Security | Works across serverless instances |
| 7. Menu caching | Performance | ~0 DB load for menu reads |
| 8. Invoice race condition | Bug fix | Prevents duplicate invoice numbers |
| 9. Upload validation | Security | Prevents OOM from large uploads |
| 10. Remove .env secrets | Security | Prevents credential exposure |
| 11. Update docs | Documentation | Track progress |

**Estimated total cost impact:** $0-3/month added (Upstash free tier for rate limiting + Next.js cache is free on Vercel).
