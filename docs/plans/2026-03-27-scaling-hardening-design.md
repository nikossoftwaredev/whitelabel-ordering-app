# Scaling Hardening — Approach B Design

**Date:** 2026-03-27
**Scope:** Fix critical reliability bugs using existing infrastructure (Redis + DB). QStash deferred to follow-up.

## Problems

| # | Problem | Risk |
|---|---------|------|
| 1 | `proxy.ts` mutates `process.env.NEXTAUTH_URL` per request | Concurrent requests overwrite each other's host, breaking auth |
| 2 | Order number generation uses `COUNT(*)` then inserts separately | Race condition produces duplicate order numbers under concurrent load |
| 3 | `sendPushToAdmins()` / `emitNewOrder()` not wrapped in try/catch | A notification failure kills the entire order response |
| 4 | Stripe webhook has no idempotency guard | Stripe retries can create duplicate orders or lose orders on partial failure |

## Fixes

### 1. `proxy.ts` — Remove env mutation

`process.env.NEXTAUTH_URL = host` is a global mutation shared across all concurrent requests on the same serverless instance. Two requests with different hosts overwrite each other mid-flight.

**Fix:** Read the host from request headers inline where needed. Do not mutate `process.env` at request time.

### 2. Order number — DB unique constraint + retry

`lib/orders/order-number.ts` computes the next number from `COUNT(*)`, then the caller inserts with that number. These are two separate operations with no lock between them.

**Fix:**
- Add `@@unique([tenantId, orderNumber])` to the `Order` model in `schema.prisma`
- Run migration
- Wrap order creation in a retry loop (up to 3 attempts): on `P2002` unique constraint violation, re-generate the number and retry

### 3. Notification hardening

Order creation calls `sendPushToAdmins()` and `emitNewOrder()` after the DB write. If either throws, the error propagates and the HTTP response fails — even though the order was already saved.

**Fix:** Wrap both calls in `try/catch`. Log errors with `console.error`. Notifications are best-effort; they must never fail an order.

### 4. Webhook idempotency via Redis

Stripe retries webhooks on non-2xx responses for up to 72 hours. Without idempotency:
- A crash after order creation but before returning 200 → Stripe retries → duplicate order
- A crash before order creation → order lost

**Fix:** At the top of the webhook handler:
1. Check Redis for key `stripe:event:{event.id}`
2. If present → return 200 immediately (already processed)
3. If absent → process the event, then `SET stripe:event:{event.id} 1 EX 86400` (24h TTL)

Redis is already wired up in `lib/redis/index.ts` and used for rate limiting.

## Files to Touch

- `proxy.ts` — remove `process.env.NEXTAUTH_URL` mutation
- `prisma/schema.prisma` — add unique constraint on `orderNumber`
- `lib/orders/order-number.ts` — add retry logic
- `app/api/tenants/[slug]/orders/route.ts` (or wherever orders are created) — add retry wrapper + notification try/catch
- `app/api/webhooks/stripe/route.ts` — add Redis idempotency check

## Out of Scope

- QStash durable job queue (scheduled for follow-up)
- PENDING order reconciliation job
- Tenant caching (already shipped in commit 8c6dc5d)
