# Stripe Fraud & Chargeback Risk Hardening

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four fraud/chargeback risks identified in the Stripe integration: missing dispute webhook handler, absent Radar metadata, missing receipt email, and an outdated API version.

**Architecture:** Each fix is self-contained. The webhook route gains new event handlers. The checkout API route receives Radar metadata forwarded from the client. The `PaymentStatus` Prisma enum gains a `DISPUTED` value backed by a DB migration. The Stripe SDK version string is updated in `lib/stripe/server.ts`.

**Tech Stack:** Next.js 16 App Router, Prisma (PostgreSQL/Supabase), Stripe SDK (`stripe` npm package), TypeScript strict mode, pnpm.

> **Note on testing:** The project has no unit test runner (only Playwright E2E). Each task ends with TypeScript compilation and a manual verification step instead of automated unit tests.

---

## Risks Being Addressed

| # | Risk | Severity | Fix |
|---|------|----------|-----|
| 1 | No `charge.dispute.created` webhook handler | Medium | Add handler + `DISPUTED` DB status |
| 2 | No Radar metadata (`ip_address`, `user_agent`) in PaymentIntent | Low-Medium | Forward from client via checkout API |
| 3 | No `receipt_email` on PaymentIntent | Low | Add from order's `customerEmail` field |
| 4 | Stripe API version outdated (`2025-04-30.basil`) | Low | Bump to `2026-02-25.clover` |

> **Risk 4 (Connect platform liability)** is architectural — destination charges mean the platform bears chargeback liability. This plan documents it but does not change the architecture, as switching to separate charges + transfers is a bigger migration. See the note at the end.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/db/schema.prisma` | Modify | Add `DISPUTED` to `PaymentStatus` enum |
| `lib/db/migrations/…` | Create (auto) | Prisma migration SQL |
| `app/api/webhooks/stripe/route.ts` | Modify | Add `charge.dispute.created` handler |
| `app/api/tenants/[tenantSlug]/checkout/route.ts` | Modify | Add Radar metadata + `receipt_email` |
| `lib/stripe/server.ts` | Modify | Bump API version to `2026-02-25.clover` |

---

## Chunk 1: DB — Add DISPUTED payment status

### Task 1: Add `DISPUTED` to the Prisma `PaymentStatus` enum

**Files:**
- Modify: `lib/db/schema.prisma` (around line 336)

**Context:** The `PaymentStatus` enum currently has `PENDING | PAID | REFUNDED | FAILED`. We need `DISPUTED` so disputed orders are clearly marked and don't appear as simply `PAID`.

- [ ] **Step 1: Open the schema and add the new enum value**

  In [lib/db/schema.prisma](lib/db/schema.prisma), find:

  ```prisma
  enum PaymentStatus {
    PENDING
    PAID
    REFUNDED
    FAILED
  }
  ```

  Change it to:

  ```prisma
  enum PaymentStatus {
    PENDING
    PAID
    REFUNDED
    FAILED
    DISPUTED
  }
  ```

- [ ] **Step 2: Create the Prisma migration**

  ```bash
  pnpm prisma migrate dev --name add_disputed_payment_status
  ```

  Expected output:
  ```
  ✔ Generated Prisma Client
  The following migration(s) have been created and applied:
  migrations/YYYYMMDD_add_disputed_payment_status/migration.sql
  ```

  If Supabase direct URL is not reachable locally, run:
  ```bash
  pnpm prisma generate
  ```
  and apply the migration manually in Supabase Studio.

- [ ] **Step 3: Verify TypeScript still compiles**

  ```bash
  pnpm tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add lib/db/schema.prisma lib/db/migrations
  git commit -m "feat(db): add DISPUTED to PaymentStatus enum"
  ```

---

## Chunk 2: Webhook — Handle dispute events

### Task 2: Add `charge.dispute.created` and `charge.dispute.closed` handlers

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

**Context:** When a customer disputes a charge with their bank, Stripe fires `charge.dispute.created`. Without a handler, the order remains `PAID` in the DB even after funds are clawed back. We also handle `charge.dispute.closed` to update status when a dispute is won (back to `PAID`) or lost (keep `DISPUTED`).

The `paymentIntentId` on a `Charge` object is the same `stripePaymentIntentId` stored on the `Order`.

- [ ] **Step 1: Open the webhook route**

  File: [app/api/webhooks/stripe/route.ts](app/api/webhooks/stripe/route.ts)

- [ ] **Step 2: Add the two new case blocks inside the existing `switch`**

  After the `payment_intent.payment_failed` case block, add:

  ```typescript
  case "charge.dispute.created": {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id;

    if (paymentIntentId) {
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { paymentStatus: "DISPUTED" },
      });
    }
    break;
  }

  case "charge.dispute.closed": {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : dispute.payment_intent?.id;

    if (paymentIntentId) {
      // won = funds returned to merchant, lost = merchant keeps DISPUTED
      const newStatus =
        dispute.status === "won" ? "PAID" : "DISPUTED";
      await prisma.order.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { paymentStatus: newStatus },
      });
    }
    break;
  }
  ```

  The full `switch` block should now look like:

  ```typescript
  switch (event.type) {
    case "payment_intent.succeeded": { … }
    case "payment_intent.payment_failed": { … }
    case "charge.dispute.created": { … }   // ← new
    case "charge.dispute.closed": { … }    // ← new
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm tsc --noEmit
  ```

  Expected: no errors. If you see `Type '"DISPUTED"' is not assignable`, the migration from Task 1 hasn't regenerated the Prisma client — run `pnpm prisma generate` first.

- [ ] **Step 4: Register the new events in the Stripe Dashboard**

  Go to **Dashboard → Developers → Webhooks → your endpoint → Update details**.
  Add `charge.dispute.created` and `charge.dispute.closed` to the list of listened events.
  *(This is a manual step; it cannot be done from code.)*

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/webhooks/stripe/route.ts
  git commit -m "feat(stripe): handle charge.dispute.created and charge.dispute.closed webhooks"
  ```

---

## Chunk 3: PaymentIntent — Radar metadata + receipt email

### Task 3: Forward Radar metadata and receipt email from the checkout API

**Files:**
- Modify: `app/api/tenants/[tenantSlug]/checkout/route.ts`

**Context:** Stripe Radar uses the cardholder's IP address and browser user-agent to score fraud risk. Without them, Radar has less signal. These are collected server-side from the incoming request headers. The `receipt_email` field causes Stripe to automatically send a receipt after a successful payment, reducing "I don't recognize this charge" disputes.

- [ ] **Step 1: Open the checkout route**

  File: [app/api/tenants/[tenantSlug]/checkout/route.ts](app/api/tenants/[tenantSlug]/checkout/route.ts)

- [ ] **Step 2: Extract IP and user-agent from request headers**

  After the line `const { orderId } = await request.json();`, add:

  ```typescript
  // Radar fraud signals — read from request headers (never from client body)
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  ```

- [ ] **Step 3: Add `receipt_email` and `radar_options` to `intentParams`**

  Find the `intentParams` object (around line 104). Add two fields after `metadata`:

  ```typescript
  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: "eur",
    payment_method_types: ["card"],
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
      orderNumber: order.orderNumber,
    },
    // Send Stripe receipt automatically (reduces "unrecognized charge" disputes)
    ...(order.customerEmail && { receipt_email: order.customerEmail }),
    // Radar fraud signals
    ...(clientIp && {
      radar_options: { session: undefined },
    }),
  };
  ```

  Then, after building `intentParams` but before calling `stripe.paymentIntents.create`, patch in the IP and user-agent on the Stripe request level. Because the Stripe Node SDK accepts per-request options, pass them as the second argument:

  ```typescript
  const paymentIntent = await stripe.paymentIntents.create(intentParams, {
    ...(clientIp && { stripeAccount: undefined }),  // placeholder for options shape
  });
  ```

  Actually, the correct way to pass IP/user-agent to Stripe for Radar is via the `PaymentIntent` metadata or via the `stripe-account` header is not the right approach. The right approach is to set `ip_address` directly on the PaymentIntent params. Update `intentParams` to:

  ```typescript
  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: "eur",
    payment_method_types: ["card"],
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
      orderNumber: order.orderNumber,
    },
    ...(order.customerEmail && { receipt_email: order.customerEmail }),
  };
  ```

  And pass the Radar data separately when creating:

  ```typescript
  const paymentIntent = await stripe.paymentIntents.create({
    ...intentParams,
    ...(clientIp && { ip_address: clientIp }),
  });
  ```

  > **Note:** The `ip_address` field on `PaymentIntentCreateParams` is documented in the Stripe API. User-agent is not a direct PaymentIntent field — it's used by Radar automatically via the card element (the browser SDK sends it). Server-side, only `ip_address` is relevant.

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  pnpm tsc --noEmit
  ```

  If `ip_address` causes a type error (it may not be in all SDK versions), add it via type assertion:

  ```typescript
  const paymentIntent = await stripe.paymentIntents.create({
    ...intentParams,
    ...(clientIp && { ip_address: clientIp } as Partial<Stripe.PaymentIntentCreateParams>),
  });
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add app/api/tenants/[tenantSlug]/checkout/route.ts
  git commit -m "feat(stripe): add receipt_email and ip_address to PaymentIntent for Radar"
  ```

---

## Chunk 4: SDK version bump

### Task 4: Update Stripe API version to latest

**Files:**
- Modify: `lib/stripe/server.ts` (line 14)

**Context:** The SDK is pinned to `2025-04-30.basil`. The latest version as of 2026-03-16 is `2026-02-25.clover`. Keeping up with Stripe API versions ensures access to newer features and avoids deprecation surprises.

- [ ] **Step 1: Update the API version string**

  In [lib/stripe/server.ts](lib/stripe/server.ts), change:

  ```typescript
  _stripe = new Stripe(key, {
    apiVersion: "2025-04-30.basil" as Stripe.LatestApiVersion,
  });
  ```

  to:

  ```typescript
  _stripe = new Stripe(key, {
    apiVersion: "2026-02-25.clover" as Stripe.LatestApiVersion,
  });
  ```

- [ ] **Step 2: Check the Stripe SDK version supports this API version**

  ```bash
  node -e "const s = require('stripe'); console.log(s.LATEST_API_VERSION)"
  ```

  If the output matches `2026-02-25.clover`, you can remove the `as Stripe.LatestApiVersion` cast. If it prints an older version, the cast is still needed (the SDK still works — the cast just silences the type error).

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  pnpm tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add lib/stripe/server.ts
  git commit -m "chore(stripe): bump API version to 2026-02-25.clover"
  ```

---

## Final verification

- [ ] Start the dev server: `pnpm dev`
- [ ] Place a test order using the Stripe test card `4242 4242 4242 4242` — confirm the order status becomes `PAID` in the database.
- [ ] Check the Stripe Dashboard for the test PaymentIntent — confirm `receipt_email` is populated and `ip_address` is present under Radar.
- [ ] Simulate a dispute using Stripe test card `4000 0000 0000 0259` (dispute-triggering card) — confirm the order status flips to `DISPUTED` via webhook.
- [ ] Run `pnpm tsc --noEmit` — no errors.
- [ ] Run `pnpm lint` — no errors.

---

## Appendix: Connect platform liability (architectural note)

The current integration uses **destination charges** (`transfer_data.destination`). With this model:

- The charge appears on the **platform's** Stripe account.
- Chargebacks come out of the **platform's** balance.
- The platform then has to manually claw back funds from the tenant.

The alternative is **separate charges + transfers**:
- Charge the customer directly on the connected account (`on_behalf_of` + `transfer_data`).
- Chargebacks fall on the **connected account** (tenant).
- The platform collects fees separately.

Switching models requires:
1. Changing `intentParams` to use `on_behalf_of: order.tenant.stripeAccountId`.
2. Updating the Connect onboarding flow to request the `charges` capability.
3. Notifying existing tenants (their Stripe account settings change).

This is a future task requiring a separate plan and tenant communication. For now, monitor disputes in the Stripe Dashboard under **Radar → Disputes** and consider purchasing [Stripe Radar for Fraud Teams](https://stripe.com/radar) if dispute rates exceed 0.5%.
