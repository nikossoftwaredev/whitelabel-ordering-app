# Infrastructure: Production Readiness for 100 Tenants x 1000 Orders/Hour

## Critical Blockers

- [x] **Add caching layer (Next.js `use cache`)**
  - Cached menu data per tenant with `cacheTag` (invalidated on admin changes)
  - Cached popular products per tenant
  - Cache invalidation on product/category/settings mutations
  - Files: `lib/cache/menu.ts`, `lib/cache/invalidate.ts`

- [x] **Distributed rate limiting (Upstash Redis)**
  - Replaced in-memory rate limiter with `@upstash/ratelimit` sliding window
  - Order creation: 10/min per user
  - Checkout: 5/min per user
  - Shared across all serverless instances
  - Files: `lib/security/rate-limit.ts`, `lib/redis/index.ts`

- [ ] **Error monitoring (Sentry)** — DEFERRED
  - Integrate Sentry for error aggregation
  - Capture silent failures: broadcast errors, webhook processing, push notification failures
  - Add performance monitoring (APM) for slow API routes

- [x] **Optimize stats endpoint to use aggregations**
  - Replaced `findMany()` + JS `.reduce()` with `prisma.order.aggregate()`
  - All 6 queries now run in parallel via `Promise.all`
  - File: `app/api/admin/[tenantId]/stats/route.ts`

- [x] **Add missing database indexes**
  - `Order(tenantId, paymentStatus)` — payment filtering
  - `Order(tenantId, orderType, createdAt)` — analytics queries
  - `OrderItem(productId)` — popular products groupBy
  - File: `lib/db/schema.prisma`

- [ ] **Background job queue** — DEFERRED
  - Add BullMQ or Inngest for async processing
  - Move AADE invoice transmission to background with retries
  - Queue email sending with retry + exponential backoff

## High Priority

- [x] **Fix cart validation N+1**
  - Batch-fetch all products in single query with `findMany({ where: { id: { in: productIds } } })`
  - File: `lib/orders/validate-cart.ts`

- [ ] **Wrap checkout in transaction**
  - `app/api/tenants/[tenantSlug]/checkout/route.ts` updates DB after Stripe call without transaction
  - If DB update fails, Stripe has payment but order loses `stripePaymentIntentId`

- [x] **Fix invoice sequence race condition**
  - Wrapped in `prisma.$transaction()` with `isolationLevel: 'Serializable'`
  - File: `app/api/admin/[tenantId]/invoices/route.ts`

- [x] **Add file upload validation**
  - Max file size: 5MB (returns 413)
  - MIME type whitelist: JPEG, PNG, WebP, AVIF (returns 415)
  - File: `app/api/admin/[tenantId]/upload/route.ts`

- [x] **Credentials security**
  - `.env` already in `.gitignore`, not tracked by git
  - Secrets stored in `.env.local` only

## Medium Priority

- [ ] **Add structured logging**
  - Replace `console.error` with structured logger (Pino/Winston)
  - Include tenant context in all log entries
  - Add request ID tracing across async operations

- [ ] **Add health checks**
  - Database connection pool health
  - Supabase Realtime connectivity
  - Stripe API availability
  - Expose `/api/health` endpoint for monitoring

- [ ] **Supabase connection pool sizing**
  - Current: relies on Supabase defaults (~20 connections)
  - Evaluate Supabase plan limits and upgrade if needed

- [ ] **Tenant hostname vs route param validation**
  - Add middleware that cross-checks hostname tenant with route param tenant

## Database Migration Best Practices

### Rules (enforced from now on)

1. **Never use `prisma db push` in production** — it skips migration history and can drop data
2. **Always use `prisma migrate dev --name <description>`** to generate migrations in development
3. **Deploy with `prisma migrate deploy`** — applies pending migrations without shadow DB, safe for CI/CD
4. **One migration per logical change** — don't bundle unrelated schema changes
5. **Review generated SQL before applying** — check `lib/db/migrations/<timestamp>/migration.sql`
6. **Never edit a migration that's been deployed** — create a new migration to fix issues
7. **Test migrations against a staging DB** before running on production

### Migration Commands

```bash
# Development: generate + apply migration (interactive)
npx prisma migrate dev --name <description> --schema lib/db/schema.prisma

# Production/CI: apply pending migrations (non-interactive, safe)
npx prisma migrate deploy --schema lib/db/schema.prisma

# Check status: see which migrations are pending/applied
npx prisma migrate status --schema lib/db/schema.prisma

# Generate migration SQL without applying (for review)
npx prisma migrate dev --name <description> --schema lib/db/schema.prisma --create-only
```

### Deployment Flow

1. Developer runs `prisma migrate dev` locally → generates migration file
2. Migration file committed to git with the schema change
3. CI/CD runs `prisma migrate deploy` against staging DB
4. After staging verification, CI/CD runs `prisma migrate deploy` against production DB
5. Rollback: create a new "undo" migration (Prisma doesn't support down migrations)

### Current State

- All old migrations deleted and replaced with single clean `init` migration
- Schema is the single source of truth in `lib/db/schema.prisma`
- `DATABASE_URL` (port 6543, pgbouncer) for app queries
- `DIRECT_URL` (port 5432, direct) for migrations (required by Prisma)

## What's Already Production-Ready

- Multi-tenant schema with proper `tenantId` on all models
- Tenant isolation — all API queries filter by `tenantId`
- Auth & RBAC — per-tenant roles with `requireRole()` enforcement
- Payments — server-side totals, Stripe Connect per-tenant, idempotent checkout
- Subdomain routing with domain/slug resolution
- Real-time updates via Supabase Realtime (tenant-scoped channels)
- Per-tenant branding (colors, fonts, logos, PWA)
- pgbouncer connection pooling configured
- Database indexes on Order(tenantId, status), Order(tenantId, createdAt), Order(tenantId, paymentStatus), Order(tenantId, orderType, createdAt), OrderItem(productId)
- Next.js `use cache` for menu data with tag-based invalidation
- Distributed rate limiting via Upstash Redis
- File upload size and type validation
- Invoice sequence with serializable transaction isolation
