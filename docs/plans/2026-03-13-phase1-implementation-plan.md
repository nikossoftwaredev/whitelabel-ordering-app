# Phase 1 Implementation Plan — White-Label Ordering App

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core multi-tenant ordering platform with menu management, pickup ordering, embedded Stripe/cash payments, AADE invoicing, admin panel, QR menu, and PWA support.

**Architecture:** Single Next.js deployment with shared PostgreSQL database. Tenant resolved by domain at middleware level. All data queries scoped by `tenantId`. Customer-facing pages use client-side data fetching (React Query) for Capacitor readiness. Admin uses server components where possible.

**Tech Stack:** Next.js 16, Prisma + Supabase PostgreSQL, NextAuth (Google + Magic Link), Stripe Connect (Accounts v2 + embedded Payment Element), Zustand, React Query, Tailwind CSS 4 + shadcn/ui, next-intl, Supabase Realtime, AADE myDATA, PWA.

**Design Doc:** `docs/plans/2026-03-13-whitelabel-ordering-app-design.md`

---

## Stripe Integration Guidelines

Per Stripe best practices (2026):

1. **Accounts v2 API** (`POST /v2/core/accounts`) for Connect — NOT legacy `type: 'standard'/'express'/'custom'`
2. **Checkout Sessions with `ui_mode: 'custom'`** + **Payment Element** for embedded payment UI — NOT redirect to Stripe-hosted page
3. **Destination charges** with `transfer_data.destination` — NOT direct charges
4. **Dynamic payment methods** — let Stripe auto-select based on customer location, do NOT hardcode `payment_method_types`
5. **Controller properties** on connected accounts — NOT legacy account type labels
6. Use latest Stripe API version: `2026-02-25.clover`

## AADE myDATA Integration Guidelines

Build a complete AADE myDATA module for automatic and manual invoicing:

**Architecture:** `lib/aade/` module with:
- `client.ts` — HTTP client with retry logic (3 attempts, exponential backoff)
- `types.ts` — TypeScript interfaces for all API contracts
- `xml-builder.ts` — Build XML payloads for AADE submission
- `xml-parser.ts` — Parse XML responses from AADE
- `validators.ts` — Input validation (Greek VAT format, amounts matching)
- `constants.ts` — Invoice types, VAT rates (24%/13%/6%), payment methods, endpoints
- `errors.ts` — Custom error classes (API, Validation, Timeout, Network)
- `index.ts` — Public exports

**AADE API:**
- Base URLs: dev `https://mydataapidev.aade.gr`, prod `https://mydatapi.aade.gr/myDATA`
- Auth headers: `aade-user-id`, `ocp-apim-subscription-key`
- Endpoints: `/SendInvoices`, `/CancelInvoice`, `/RequestDocs`
- Payload: XML with invoice data (issuer, items, VAT, payment method)
- Response: mark (unique ID), uid, authenticationCode, qrUrl

**Payment method mapping:** STRIPE → POS (7), CASH → Cash (3)

**Key env vars:** `AADE_USER_ID`, `AADE_SUBSCRIPTION_KEY`, `AADE_ENVIRONMENT`, `AADE_ISSUER_VAT`, `AADE_ISSUER_BRANCH`, `AADE_INVOICE_SERIES`

## Testing Strategy

**Every task must include E2E verification before it is considered complete.** This means:
- API routes: test with curl or a test script
- UI components: screenshot and visually verify
- Integration features: test the full flow end-to-end
- Multi-tenant: verify data isolation between tenants

---

## Task 1: Database Schema — Multi-Tenant Foundation

**Files:**
- Modify: `lib/db/schema.prisma`

**Step 1: Replace the existing Prisma schema with the multi-tenant schema**

Replace the entire contents of `lib/db/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─── MULTI-TENANCY ───────────────────────────────────────────

model Tenant {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  domain        String?  @unique
  isActive      Boolean  @default(true) @map("is_active")

  // Stripe Connect (Accounts v2)
  stripeAccountId  String?  @unique @map("stripe_account_id")
  stripeOnboarded  Boolean  @default(false) @map("stripe_onboarded")

  // Contact
  phone         String?
  email         String?
  address       String?

  // Ordering config
  prepTimeMinutes   Int      @default(15) @map("prep_time_minutes")
  isPaused          Boolean  @default(false) @map("is_paused")
  currency          String   @default("EUR")
  timezone          String   @default("Europe/Athens")

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  config         TenantConfig?
  operatingHours OperatingHour[]
  categories     Category[]
  products       Product[]
  modifierGroups ModifierGroup[]
  orders         Order[]
  tenantRoles    TenantRole[]
  customers      Customer[]
  invoices       Invoice[]
  invoiceSequences InvoiceSequence[]

  @@index([slug])
  @@index([domain])
  @@map("tenants")
}

model TenantConfig {
  id              String  @id @default(cuid())
  tenantId        String  @unique @map("tenant_id")
  logo            String?
  logoSmall       String? @map("logo_small")
  coverImage      String? @map("cover_image")
  description     String?
  primaryColor    String  @default("#000000") @map("primary_color")
  secondaryColor  String  @default("#ffffff") @map("secondary_color")
  accentColor     String  @default("#3b82f6") @map("accent_color")

  // PWA
  pwaName         String? @map("pwa_name")
  pwaShortName    String? @map("pwa_short_name")
  pwaThemeColor   String? @map("pwa_theme_color")
  pwaBgColor      String? @map("pwa_bg_color")

  // Social / links
  website         String?
  instagram       String?
  facebook        String?
  googlePlaceId   String? @map("google_place_id")

  tenant          Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("tenant_configs")
}

model OperatingHour {
  id        String  @id @default(cuid())
  tenantId  String  @map("tenant_id")
  dayOfWeek Int     @map("day_of_week") // 0 = Monday, 6 = Sunday
  openTime  String  @map("open_time")   // "09:00"
  closeTime String  @map("close_time")  // "23:00"
  isClosed  Boolean @default(false) @map("is_closed")

  tenant    Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, dayOfWeek])
  @@map("operating_hours")
}

// ─── AUTH & ROLES ────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  phone         String?
  emailVerified DateTime? @map("email_verified")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  accounts      Account[]
  sessions      Session[]
  tenantRoles   TenantRole[]
  customers     Customer[]

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

enum Role {
  SUPER_ADMIN
  OWNER
  ADMIN
  CASHIER
}

model TenantRole {
  id       String @id @default(cuid())
  tenantId String @map("tenant_id")
  userId   String @map("user_id")
  role     Role   @default(CASHIER)

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId])
  @@map("tenant_roles")
}

// ─── CUSTOMERS (per-tenant) ──────────────────────────────────

model Customer {
  id         String   @id @default(cuid())
  tenantId   String   @map("tenant_id")
  userId     String   @map("user_id")
  totalSpent Int      @default(0) @map("total_spent")
  orderCount Int      @default(0) @map("order_count")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders    Order[]
  favorites Favorite[]

  @@unique([tenantId, userId])
  @@map("customers")
}

model Favorite {
  id         String   @id @default(cuid())
  customerId String   @map("customer_id")
  productId  String   @map("product_id")
  createdAt  DateTime @default(now()) @map("created_at")

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product  Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, productId])
  @@map("favorites")
}

// ─── MENU ────────────────────────────────────────────────────

model Category {
  id          String    @id @default(cuid())
  tenantId    String    @map("tenant_id")
  name        String
  nameEl      String?   @map("name_el")
  description String?
  image       String?
  sortOrder   Int       @default(0) @map("sort_order")
  isActive    Boolean   @default(true) @map("is_active")

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  products Product[]

  @@index([tenantId, sortOrder])
  @@map("categories")
}

model Product {
  id            String    @id @default(cuid())
  tenantId      String    @map("tenant_id")
  categoryId    String    @map("category_id")
  name          String
  nameEl        String?   @map("name_el")
  description   String?
  descriptionEl String?   @map("description_el")
  image         String?
  price         Int       // cents (e.g., 350 = 3.50 EUR)
  sortOrder     Int       @default(0) @map("sort_order")
  isActive      Boolean   @default(true) @map("is_active")

  // Dietary/allergen tags (booleans for fast filtering)
  isVegan       Boolean   @default(false) @map("is_vegan")
  isVegetarian  Boolean   @default(false) @map("is_vegetarian")
  isGlutenFree  Boolean   @default(false) @map("is_gluten_free")
  isDairyFree   Boolean   @default(false) @map("is_dairy_free")
  containsNuts  Boolean   @default(false) @map("contains_nuts")
  isSpicy       Boolean   @default(false) @map("is_spicy")
  allergens     String?   // free-text for additional allergens

  tenant         Tenant                @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  category       Category              @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  modifierGroups ProductModifierGroup[]
  orderItems     OrderItem[]
  favorites      Favorite[]

  @@index([tenantId, categoryId])
  @@index([tenantId, isActive])
  @@map("products")
}

model ModifierGroup {
  id        String  @id @default(cuid())
  tenantId  String  @map("tenant_id")
  name      String
  nameEl    String? @map("name_el")
  required  Boolean @default(false)
  minSelect Int     @default(0) @map("min_select")
  maxSelect Int     @default(1) @map("max_select")
  sortOrder Int     @default(0) @map("sort_order")

  tenant   Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  options  ModifierOption[]
  products ProductModifierGroup[]

  @@index([tenantId])
  @@map("modifier_groups")
}

model ProductModifierGroup {
  id              String @id @default(cuid())
  productId       String @map("product_id")
  modifierGroupId String @map("modifier_group_id")
  sortOrder       Int    @default(0) @map("sort_order")

  product       Product       @relation(fields: [productId], references: [id], onDelete: Cascade)
  modifierGroup ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)

  @@unique([productId, modifierGroupId])
  @@map("product_modifier_groups")
}

model ModifierOption {
  id              String  @id @default(cuid())
  modifierGroupId String  @map("modifier_group_id")
  name            String
  nameEl          String? @map("name_el")
  priceAdjustment Int     @default(0) @map("price_adjustment") // cents
  isDefault       Boolean @default(false) @map("is_default")
  isActive        Boolean @default(true) @map("is_active")
  sortOrder       Int     @default(0) @map("sort_order")

  modifierGroup      ModifierGroup       @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)
  orderItemModifiers OrderItemModifier[]

  @@index([modifierGroupId])
  @@map("modifier_options")
}

// ─── ORDERS ──────────────────────────────────────────────────

enum OrderStatus {
  NEW
  ACCEPTED
  PREPARING
  READY
  COMPLETED
  REJECTED
}

enum PaymentMethod {
  STRIPE
  CASH
}

enum PaymentStatus {
  PENDING
  PAID
  REFUNDED
  FAILED
}

model Order {
  id          String      @id @default(cuid())
  tenantId    String      @map("tenant_id")
  customerId  String?     @map("customer_id")
  orderNumber String      @map("order_number")
  status      OrderStatus @default(NEW)

  // Payment
  paymentMethod PaymentMethod @default(CASH) @map("payment_method")
  paymentStatus PaymentStatus @default(PENDING) @map("payment_status")
  stripePaymentIntentId String? @unique @map("stripe_payment_intent_id")
  stripeCheckoutSessionId String? @unique @map("stripe_checkout_session_id")
  promoCode               String? @map("promo_code") // Stripe promo code applied

  // Pricing (cents)
  subtotal Int
  discount Int @default(0)
  total    Int

  // Pickup
  estimatedReadyAt DateTime? @map("estimated_ready_at")
  customerNote     String?   @map("customer_note")
  rejectionReason  String?   @map("rejection_reason")

  // Denormalized customer info (for manual orders)
  customerName  String? @map("customer_name")
  customerEmail String? @map("customer_email")
  customerPhone String? @map("customer_phone")

  // Timestamps
  acceptedAt  DateTime? @map("accepted_at")
  readyAt     DateTime? @map("ready_at")
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  tenant   Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customer Customer?   @relation(fields: [customerId], references: [id])
  items    OrderItem[]
  invoice  Invoice?

  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@index([customerId])
  @@map("orders")
}

model OrderItem {
  id         String @id @default(cuid())
  orderId    String @map("order_id")
  productId  String @map("product_id")
  quantity   Int    @default(1)
  unitPrice  Int    @map("unit_price")  // cents, snapshot at order time
  totalPrice Int    @map("total_price") // (unitPrice + modifiers) * quantity
  notes      String?

  // Denormalized product info (snapshot)
  productName String @map("product_name")

  order     Order               @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product             @relation(fields: [productId], references: [id])
  modifiers OrderItemModifier[]

  @@index([orderId])
  @@map("order_items")
}

model OrderItemModifier {
  id               String @id @default(cuid())
  orderItemId      String @map("order_item_id")
  modifierOptionId String @map("modifier_option_id")
  name             String // snapshot at order time
  priceAdjustment  Int    @map("price_adjustment") // snapshot at order time

  orderItem      OrderItem      @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  modifierOption ModifierOption @relation(fields: [modifierOptionId], references: [id])

  @@index([orderItemId])
  @@map("order_item_modifiers")
}

// ─── INVOICING (AADE myDATA) ─────────────────────────────────

model Invoice {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  orderId         String?  @unique @map("order_id")

  // AADE response
  mark            String?  @unique
  uid             String?  @unique
  authCode        String?  @map("auth_code")
  qrUrl           String?  @map("qr_url")

  // Invoice details
  series          String
  sequenceNumber  Int      @map("sequence_number")
  invoiceType     String   @map("invoice_type") // e.g., "11.2" for service receipt
  issueDate       DateTime @map("issue_date")
  netAmount       Float    @map("net_amount")
  vatAmount       Float    @map("vat_amount")
  grossAmount     Float    @map("gross_amount")
  vatCategory     Int      @map("vat_category")
  paymentMethodCode Int    @map("payment_method_code") // AADE payment method (3=cash, 7=POS)

  // Status tracking
  status          String   @default("pending") // pending | submitted | failed
  aadeErrors      String?  @map("aade_errors") // JSON stringified
  retryCount      Int      @default(0) @map("retry_count")
  lastRetryAt     DateTime? @map("last_retry_at")
  submittedAt     DateTime? @map("submitted_at")
  cancelledAt     DateTime? @map("cancelled_at")
  cancellationMark String? @map("cancellation_mark")

  // Customer info (for B2B invoices)
  customerName    String?  @map("customer_name")
  customerVat     String?  @map("customer_vat")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  order  Order? @relation(fields: [orderId], references: [id])

  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@map("invoices")
}

model InvoiceSequence {
  id         String @id @default(cuid())
  tenantId   String @map("tenant_id")
  series     String
  lastNumber Int    @default(0) @map("last_number")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, series])
  @@map("invoice_sequences")
}
```

**Step 2: Generate Prisma client and create migration**

Run:
```bash
pnpm prisma migrate dev --name multi-tenant-schema --schema=lib/db/schema.prisma
```

Expected: Migration created, client regenerated.

**Step 3: Verify — check that Prisma client generates without errors**

Run:
```bash
pnpm prisma generate --schema=lib/db/schema.prisma
pnpm tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

```bash
git add lib/db/schema.prisma prisma/
git commit -m "feat: multi-tenant ordering schema with AADE invoicing

- Tenant with config, operating hours, Stripe Connect (v2)
- Role-based access (SUPER_ADMIN, OWNER, ADMIN, CASHIER)
- Menu: Category, Product, ModifierGroup, ModifierOption
- Orders with pickup flow and payment tracking
- Invoice + InvoiceSequence for AADE myDATA integration
- Customer model per-tenant with order stats
- NextAuth adapter models (Account, Session, VerificationToken)"
```

---

## Task 2: Auth — Prisma Adapter + Magic Link

**Files:**
- Modify: `lib/auth/auth.ts`
- Modify: `package.json` (add dependencies)
- Create: `app/[locale]/auth/verify-request/page.tsx`
- Create: `app/[locale]/auth/signin/page.tsx`

**Step 1: Install dependencies**

```bash
pnpm add @next-auth/prisma-adapter resend
```

**Step 2: Update auth config**

Replace `lib/auth/auth.ts` — use PrismaAdapter, add EmailProvider with Resend for magic link, keep GoogleProvider. Switch to `strategy: "database"` sessions. Remove manual upsert (adapter handles it).

Key changes from current auth:
- Add `adapter: PrismaAdapter(prisma)`
- Add `EmailProvider` with custom `sendVerificationRequest` using Resend
- Change session strategy to `"database"`
- Simplify session callback (adapter provides `user` directly)
- Remove `jwt` callback (not needed with DB sessions)

**Step 3: Create sign-in page**

`app/[locale]/auth/signin/page.tsx` — Google button + email input for magic link. Use shadcn Card, Input, Button. Mobile-friendly centered layout.

**Step 4: Create verify-request page**

`app/[locale]/auth/verify-request/page.tsx` — "Check your email" message with Mail icon.

**Step 5: E2E Verification**

1. Start dev server
2. Visit `/en/auth/signin` — verify page renders with Google button and email input
3. Screenshot: `node screenshot.mjs http://localhost:3000/en/auth/signin auth-signin`
4. Test Google OAuth flow (if credentials configured)
5. Test magic link flow (if Resend configured) — check email sends
6. Verify session works: sign in, check session in admin

**Step 6: Commit**

```bash
git add lib/auth/ app/[locale]/auth/ package.json pnpm-lock.yaml
git commit -m "feat: Prisma adapter + magic link auth via Resend

- PrismaAdapter for automatic user management
- EmailProvider with Resend for magic link login
- Google OAuth alongside magic link
- Database session strategy
- Sign-in page with both auth methods
- Verify-request page"
```

---

## Task 3: Tenant Resolution Middleware

**Files:**
- Create: `lib/tenant/resolve.ts`
- Create: `lib/tenant/context.ts`
- Modify: `proxy.ts`

**Step 1: Create tenant resolver**

`lib/tenant/resolve.ts` — `getTenantByDomain(domain)` and `getTenantBySlug(slug)` with React `cache()` for request deduplication. Both return tenant with config included.

**Step 2: Create server-side tenant context**

`lib/tenant/context.ts` — `setCurrentTenant()` / `getCurrentTenant()` using React `cache()` store. Allows any server component to access the current tenant without prop drilling.

**Step 3: Update middleware**

Update `proxy.ts` to forward the `x-tenant-host` header from the incoming request. The actual DB lookup happens in the layout (Task 4) since Prisma needs Node.js runtime, not Edge.

**Step 4: E2E Verification**

1. Add a console.log in the middleware to verify host header forwarding
2. Visit localhost:3000 — verify no errors
3. Run `pnpm tsc --noEmit` — no type errors

**Step 5: Commit**

```bash
git add lib/tenant/ proxy.ts
git commit -m "feat: tenant resolution layer

- getTenantByDomain/getTenantBySlug with React cache
- Server component tenant context
- Host header forwarding in middleware"
```

---

## Task 4: Tenant-Aware Layout + Dynamic Branding

**Files:**
- Modify: `app/[locale]/layout.tsx`
- Create: `lib/tenant/brand-styles.ts`
- Create: `components/tenant-provider.tsx`

**Step 1: Create CSS variable generator**

`lib/tenant/brand-styles.ts` — takes TenantConfig, returns CSS string setting `--brand-primary`, `--brand-secondary`, `--brand-accent` custom properties.

**Step 2: Create TenantProvider (client context)**

`components/tenant-provider.tsx` — React context with `useTenant()` hook. Provides tenant id, name, slug, logo, colors, config to any client component.

**Step 3: Update root layout**

Modify `app/[locale]/layout.tsx`:
1. Read `x-tenant-host` header via `headers()`
2. Look up tenant with `getTenantByDomain(host)`
3. Fallback: if no tenant found (dev mode), use first active tenant or show error
4. Inject `<style>` tag with brand CSS variables
5. Wrap children in `<TenantProvider>`

**Step 4: E2E Verification**

1. Seed a test tenant in the database (can do manually via Prisma Studio: `pnpm prisma studio`)
2. Visit localhost:3000 — verify layout loads without errors
3. Check browser DevTools → Elements → verify CSS variables are set on `:root`
4. Run `pnpm build` — verify no build errors

**Step 5: Commit**

```bash
git add lib/tenant/brand-styles.ts components/tenant-provider.tsx app/[locale]/layout.tsx
git commit -m "feat: tenant-aware layout with dynamic branding

- CSS variables injected from tenant config
- TenantProvider for client component access
- Domain-based tenant resolution in layout"
```

---

## Task 5: React Query Setup

**Files:**
- Modify: `package.json`
- Create: `lib/query/provider.tsx`
- Create: `lib/query/keys.ts`
- Modify: `components/providers.tsx`

**Step 1: Install**

```bash
pnpm add @tanstack/react-query
```

**Step 2: Create QueryProvider**

`lib/query/provider.tsx` — QueryClientProvider with sensible defaults (1min staleTime, refetchOnWindowFocus off).

**Step 3: Create query key factory**

`lib/query/keys.ts` — typed query keys for menu, orders, customers, stats. All scoped by tenantId.

**Step 4: Add to providers**

Wrap existing SessionProvider + ThemeProvider with QueryProvider in `components/providers.tsx`.

**Step 5: E2E Verification**

1. Run `pnpm tsc --noEmit` — no errors
2. Visit localhost:3000 — verify app loads (React Query provider wrapping works)
3. Check React Query DevTools if desired

**Step 6: Commit**

```bash
git add lib/query/ components/providers.tsx package.json pnpm-lock.yaml
git commit -m "feat: React Query provider and query key factory"
```

---

## Task 6: Menu API Routes (Public)

**Files:**
- Create: `app/api/tenants/[tenantSlug]/menu/route.ts`
- Create: `app/api/tenants/[tenantSlug]/menu/products/[productId]/route.ts`

**Step 1: Full menu endpoint**

`GET /api/tenants/[slug]/menu` — returns all active categories with their active products and modifier groups/options. Ordered by sortOrder. Include tenant info (name, logo) for the menu header.

**Step 2: Product detail endpoint**

`GET /api/tenants/[slug]/menu/products/[productId]` — single product with all modifier groups and options. For the product detail sheet.

**Step 3: E2E Verification**

1. Seed a tenant with at least one category and product (via Prisma Studio or seed script)
2. Test: `curl http://localhost:3000/api/tenants/figata-cafe/menu`
3. Verify response structure: `{ categories: [{ id, name, products: [{ id, name, price, modifierGroups: [...] }] }] }`
4. Test product detail: `curl http://localhost:3000/api/tenants/figata-cafe/menu/products/{id}`
5. Test 404: `curl http://localhost:3000/api/tenants/nonexistent/menu` → 404

**Step 4: Commit**

```bash
git add app/api/tenants/
git commit -m "feat: public menu API routes

- GET /api/tenants/[slug]/menu — full menu with categories, products, modifiers
- GET /api/tenants/[slug]/menu/products/[id] — product detail
- 404 handling for invalid tenant/product"
```

---

## Task 7: Admin API Routes — Menu CRUD

**Files:**
- Create: `lib/auth/require-role.ts`
- Create: `app/api/admin/[tenantId]/categories/route.ts`
- Create: `app/api/admin/[tenantId]/categories/[categoryId]/route.ts`
- Create: `app/api/admin/[tenantId]/categories/reorder/route.ts`
- Create: `app/api/admin/[tenantId]/products/route.ts`
- Create: `app/api/admin/[tenantId]/products/[productId]/route.ts`
- Create: `app/api/admin/[tenantId]/modifier-groups/route.ts`
- Create: `app/api/admin/[tenantId]/modifier-groups/[groupId]/route.ts`

**Step 1: Create role-checking helper**

`lib/auth/require-role.ts` — checks session, looks up TenantRole, verifies allowed roles. SUPER_ADMIN bypasses tenant check.

**Step 2: Category CRUD**

- `GET` — list categories for tenant (ordered by sortOrder)
- `POST` — create category (name, nameEl, description, image)
- `PUT /[categoryId]` — update category
- `DELETE /[categoryId]` — delete category (cascade products or soft delete)
- `POST /reorder` — batch update sortOrder values

**Step 3: Product CRUD**

- `GET` — list products (optional categoryId filter)
- `POST` — create product with image upload
- `PUT /[productId]` — update product, attach/detach modifier groups
- `DELETE /[productId]` — delete product

**Step 4: Modifier Group CRUD**

- `GET` — list modifier groups for tenant
- `POST` — create group with options
- `PUT /[groupId]` — update group and options
- `DELETE /[groupId]` — delete group

**Step 5: E2E Verification**

Test the full CRUD cycle:
1. Create a category via POST → verify 201
2. Create a product in that category → verify 201
3. Create a modifier group with options → verify 201
4. Attach modifier group to product → verify 200
5. Get menu via public API → verify everything shows up
6. Update product price → verify change
7. Delete product → verify it's gone from menu
8. Test unauthorized access (no session) → verify 401
9. Test wrong role (CASHIER trying to create) → verify 403

**Step 6: Commit**

```bash
git add lib/auth/require-role.ts app/api/admin/
git commit -m "feat: admin menu CRUD API with role-based access

- Category CRUD with reordering
- Product CRUD with modifier group attachment
- ModifierGroup CRUD with option management
- Role checking: OWNER/ADMIN required, SUPER_ADMIN bypasses"
```

---

## Task 8: Admin Panel — Menu Management UI

**Files:**
- Create: `app/[locale]/admin/menu/page.tsx`
- Create: `components/admin/menu/category-list.tsx`
- Create: `components/admin/menu/category-form-dialog.tsx`
- Create: `components/admin/menu/product-list.tsx`
- Create: `components/admin/menu/product-form-dialog.tsx`
- Create: `components/admin/menu/modifier-group-form.tsx`
- Modify: `lib/admin/config.ts` (add Menu to sidebar)

**Step 1: Install additional shadcn components + drag-and-drop**

```bash
npx shadcn@latest add dialog sheet select textarea switch tabs
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 2: Add Menu to admin sidebar**

Add "Menu" nav item to `lib/admin/config.ts` under a "Store" group.

**Step 3: Build menu management page**

Layout: Left side = category list (sortable), right side = products for selected category.

- Category list with drag-and-drop reordering, add/edit/delete
- Product grid/list for selected category, add/edit/delete
- Product form: name (en/el), description (en/el), price, image upload, category select, active toggle, dietary/allergen tags (vegan, vegetarian, gluten-free, dairy-free, nuts, spicy checkboxes + free-text allergens field)
- Modifier groups section in product form: attach existing groups or create inline
- Modifier options: name (en/el), price adjustment, default flag, active toggle

**Step 4: E2E Verification**

1. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/menu admin-menu-empty`
2. Create a category via the UI → verify it appears
3. Create a product → verify it appears under the category
4. Add a modifier group to the product → verify modifiers show
5. Drag-and-drop reorder categories → verify new order persists after refresh
6. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/menu admin-menu-populated`
7. Test on mobile viewport: `node screenshot.mjs http://localhost:3000/en/admin/menu admin-menu-mobile`

**Step 5: Commit**

```bash
git add app/[locale]/admin/menu/ components/admin/menu/ lib/admin/config.ts
git commit -m "feat: admin menu management UI

- Category list with drag-and-drop reordering
- Product CRUD with image upload and i18n fields
- Modifier group and option management
- Responsive layout"
```

---

## Task 9: Order API Routes

**Files:**
- Create: `app/api/tenants/[tenantSlug]/orders/route.ts` (place order)
- Create: `app/api/admin/[tenantId]/orders/route.ts` (list)
- Create: `app/api/admin/[tenantId]/orders/[orderId]/route.ts` (update status)
- Create: `app/api/admin/[tenantId]/orders/[orderId]/manual/route.ts` (manual order)
- Create: `lib/orders/order-number.ts`
- Create: `lib/orders/validate-cart.ts`

**Step 1: Order number generator**

`lib/orders/order-number.ts` — generates sequential order numbers per tenant per day. Format: `#A001`, `#A002`. Uses atomic DB counter or date-based prefix.

**Step 2: Cart validation**

`lib/orders/validate-cart.ts` — validates cart items against current menu. Verifies: products exist and are active, modifier selections satisfy min/max constraints, recalculates prices server-side (never trust client prices).

**Step 3: Order placement endpoint**

`POST /api/tenants/[slug]/orders`:
- Auth required (session)
- Validate cart
- Create/upsert Customer record for this tenant
- Create Order + OrderItems + OrderItemModifiers in transaction
- Denormalize product names and prices at order time
- Return order with ID and orderNumber

**Step 4: Admin order endpoints**

- `GET /api/admin/[tenantId]/orders` — list with status/date filters, include items and customer
- `PATCH /api/admin/[tenantId]/orders/[orderId]` — update status with validation:
  - NEW → ACCEPTED (set estimatedReadyAt) or REJECTED (set rejectionReason)
  - ACCEPTED → PREPARING
  - PREPARING → READY
  - READY → COMPLETED
  - Can't skip steps, can't go backwards
- `POST /api/admin/[tenantId]/orders/[orderId]/manual` — admin creates manual order (phone order)

**Step 5: E2E Verification**

1. Create an order via API (with valid cart data) → verify 201, orderNumber returned
2. List orders as admin → verify order appears with status NEW
3. Accept order → verify status changes to ACCEPTED, acceptedAt set
4. Move through: PREPARING → READY → COMPLETED → verify all timestamps
5. Try skipping steps (NEW → READY) → verify 400 error
6. Try unauthorized access → verify 401
7. Create manual order as admin → verify it works
8. Verify Customer record created/updated with orderCount and totalSpent

**Step 6: Commit**

```bash
git add app/api/tenants/*/orders/ app/api/admin/*/orders/ lib/orders/
git commit -m "feat: order placement and management API

- Cart validation with server-side price recalculation
- Sequential order numbering per tenant
- Order status lifecycle with validation
- Manual order creation for admins
- Customer stats auto-update"
```

---

## Task 10: Stripe Connect Integration (Accounts v2 + Embedded Payment Element)

**Files:**
- Create: `lib/stripe/index.ts`
- Create: `lib/stripe/connect.ts`
- Create: `app/api/stripe/connect/route.ts` (onboard tenant)
- Create: `app/api/stripe/connect/status/route.ts` (check status)
- Create: `app/api/stripe/checkout-session/route.ts` (create embedded checkout)
- Create: `app/api/stripe/webhook/route.ts`
- Create: `components/order/stripe-payment.tsx` (embedded Payment Element)

**Step 1: Install Stripe**

```bash
pnpm add stripe @stripe/stripe-js @stripe/react-stripe-js
```

Use Stripe API version `2026-02-25.clover`.

**Step 2: Create Stripe server client**

`lib/stripe/index.ts`:
```typescript
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});
```

**Step 3: Create Connect onboarding (Accounts v2)**

`lib/stripe/connect.ts` + `app/api/stripe/connect/route.ts`:

Use `POST /v2/core/accounts` with controller properties:
```typescript
const account = await stripe.v2.core.accounts.create({
  controller: {
    losses: { payments: "stripe" },
    fees: { payer: "account" }, // connected account pays their own fees
    stripe_dashboard: { type: "full" }, // they get full Stripe dashboard
    requirement_collection: "stripe", // Stripe collects KYC
  },
});
```

Then create Account Session for onboarding:
```typescript
const accountSession = await stripe.accountSessions.create({
  account: account.id,
  components: {
    account_onboarding: { enabled: true },
  },
});
```

Save `account.id` to `tenant.stripeAccountId`.

**Step 4: Create embedded checkout session**

`app/api/stripe/checkout-session/route.ts`:

Use Checkout Sessions with `ui_mode: 'custom'` for embedded Payment Element:
```typescript
const session = await stripe.checkout.sessions.create({
  ui_mode: "custom",
  mode: "payment",
  line_items: orderItems.map(item => ({
    price_data: {
      currency: tenant.currency.toLowerCase(),
      product_data: { name: item.productName },
      unit_amount: item.totalPrice,
    },
    quantity: item.quantity,
  })),
  payment_intent_data: {
    application_fee_amount: Math.round(order.total * 0.05), // 5% platform fee
    transfer_data: {
      destination: tenant.stripeAccountId!,
    },
  },
  metadata: {
    orderId: order.id,
    tenantId: tenant.id,
  },
});
```

Return `session.client_secret` to the frontend.

**Step 5: Create embedded Payment Element component**

`components/order/stripe-payment.tsx`:

Use `@stripe/react-stripe-js` with the Checkout Sessions custom mode:
```tsx
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
```

The Payment Element renders inline — no redirect. Customer stays in the app at all times.

Enable dynamic payment methods (no `payment_method_types` specified) — Stripe auto-selects based on customer location (cards, Google Pay, Apple Pay, iDEAL, etc.).

**Step 6: Create webhook handler**

`app/api/stripe/webhook/route.ts`:

Handle events:
- `checkout.session.completed` — update order `paymentStatus` to PAID, trigger AADE invoice
- `payment_intent.payment_failed` — update order `paymentStatus` to FAILED

Verify webhook signature with `stripe.webhooks.constructEvent()`.

**Step 7: E2E Verification**

1. Set up Stripe test mode keys in `.env.local`
2. Create a connected account for test tenant → verify `stripeAccountId` saved
3. Create a test order → create checkout session → verify `client_secret` returned
4. Render Payment Element in browser → verify it shows payment form inline (not redirect)
5. Pay with test card `4242 4242 4242 4242` → verify payment succeeds
6. Test webhook (use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`)
7. Verify order status updated to PAID after webhook
8. Screenshot: `node screenshot.mjs http://localhost:3000/en/order/checkout checkout-stripe`

**Step 8: Commit**

```bash
git add lib/stripe/ app/api/stripe/ components/order/stripe-payment.tsx
git commit -m "feat: Stripe Connect (Accounts v2) with embedded Payment Element

- Accounts v2 API for connected account creation
- Checkout Sessions with ui_mode: custom for embedded payment
- Destination charges with platform fee
- Dynamic payment methods (auto-selected by Stripe)
- Webhook handler for payment confirmation
- No redirect — payment stays in-app"
```

---

## Task 11: AADE myDATA Invoice Integration

**Files:**
- Existing: `lib/aade/` (full module already in project — client, types, XML, validators, constants, errors)
- Create: `lib/invoicing/issue-invoice.ts`
- Create: `lib/invoicing/aade-helpers.ts`
- Create: `app/api/admin/[tenantId]/invoices/route.ts`
- Create: `app/api/admin/[tenantId]/invoices/[invoiceId]/route.ts`
- Create: `app/api/admin/[tenantId]/invoices/manual/route.ts`

**Note:** The core AADE module (`lib/aade/`) is already built and present in the project. This task focuses on wiring it into the ordering system.

**Step 1: Review existing AADE module**

Read all files in `lib/aade/` to understand the API. Key exports:
- `AadeClient` — HTTP client with retry
- `buildInvoiceXml()` — XML builder
- `parseAadeResponse()` — XML parser
- `validateInvoice()` — input validation
- Constants for invoice types, VAT rates, payment methods

**Step 2: Create invoicing helpers**

`lib/invoicing/aade-helpers.ts`:
- `getAadeClient()` — factory from env vars
- `buildInvoiceFromOrder(order, tenant)` — convert order to AADE format
- `submitInvoiceToAade(invoice)` — send and update DB
- Map payment methods: STRIPE → POS (7), CASH → Cash (3)

`lib/invoicing/issue-invoice.ts`:
- `issueInvoiceForOrder(orderId)` — full flow:
  1. Load order with items
  2. Calculate net/VAT from gross amount using tenant's VAT category
  3. Atomically increment InvoiceSequence
  4. Create pending Invoice record
  5. Build XML and submit to AADE
  6. Update Invoice with response (mark, uid, authCode, qrUrl) or errors
  7. Return result

**Step 3: Wire auto-invoicing to payment webhook**

In the Stripe webhook handler (Task 10), after marking order as PAID, call `issueInvoiceForOrder(orderId)`.

For cash orders: when admin marks as PAID (Task 9 status update), trigger `issueInvoiceForOrder(orderId)`.

**Step 4: Create admin invoice endpoints**

- `GET /api/admin/[tenantId]/invoices` — list invoices with filters (status, date)
- `GET /api/admin/[tenantId]/invoices/[id]` — invoice detail with QR code
- `POST /api/admin/[tenantId]/invoices/manual` — create manual invoice (not linked to order)
- `POST /api/admin/[tenantId]/invoices/[id]/retry` — retry failed invoice

**Step 5: E2E Verification**

1. Set up AADE dev environment credentials in `.env.local`
2. Complete a Stripe payment → verify Invoice record created with status "submitted"
3. Verify AADE response: mark, uid, authCode, qrUrl all populated
4. Complete a cash order (admin marks paid) → verify invoice auto-created
5. Create manual invoice via admin API → verify success
6. Test with invalid data → verify validation errors
7. Test retry on failed invoice → verify retry count increments
8. List invoices as admin → verify all show up with correct statuses

**Step 6: Commit**

```bash
git add lib/aade/ lib/invoicing/ app/api/admin/*/invoices/
git commit -m "feat: AADE myDATA invoice integration

- Full AADE module built from scratch (client, XML, validation, retry)
- Auto-invoicing on Stripe payment success (POS method)
- Auto-invoicing on cash order completion (Cash method)
- Manual invoice creation for admins
- Retry mechanism for failed invoices (3 attempts, exponential backoff)
- Invoice listing with status tracking"
```

---

## Task 12: Customer Ordering UI — Menu & Cart

**Files:**
- Create: `app/[locale]/order/page.tsx`
- Create: `app/[locale]/order/layout.tsx`
- Create: `app/[locale]/order/orders/page.tsx` (order history)
- Create: `components/order/category-tabs.tsx`
- Create: `components/order/product-card.tsx`
- Create: `components/order/product-detail-sheet.tsx`
- Create: `components/order/menu-search.tsx`
- Create: `components/order/dietary-filters.tsx`
- Create: `components/order/order-history.tsx`
- Create: `lib/stores/cart-store.ts`
- Create: `components/order/cart-sheet.tsx`
- Create: `components/order/cart-button.tsx`
- Create: `app/api/tenants/[tenantSlug]/favorites/route.ts`
- Create: `app/api/tenants/[tenantSlug]/orders/history/route.ts`

**Step 1: Create Zustand cart store**

`lib/stores/cart-store.ts`:
- `addItem(product, selectedModifiers, quantity, notes)`
- `removeItem(cartItemId)`
- `updateQuantity(cartItemId, quantity)`
- `clearCart()`
- Computed: `itemCount`, `subtotal`
- Persisted to localStorage per tenant (key: `cart-{tenantSlug}`)

**Step 2: Create menu page**

- Fetch menu via React Query: `useQuery(queryKeys.menu.all(tenantId), fetchMenu)`
- **Search bar** at top — client-side filter products by name as user types
- Category tabs (horizontal scroll on mobile, 44px touch targets)
- **Dietary filter chips** below categories: Vegan, Vegetarian, Gluten-Free (toggle on/off, filter products)
- Product cards: image, name, price, description truncated, dietary tags as small badges (V, VG, GF)
- **Heart icon** on product card — tap to favorite/unfavorite (requires login)
- Tap product → product detail sheet

**Step 3: Product detail sheet**

- Bottom sheet (slide up on mobile)
- Product image, name, full description, base price
- Dietary/allergen info displayed (icons + text for allergens)
- Modifier groups:
  - `required + maxSelect=1` → radio group
  - `required + maxSelect>1` → checkbox group with min/max
  - `optional` → checkbox group
  - Show price adjustment on each option: "+€1.00"
- Quantity selector (+/-)
- "Add to cart — €X.XX" button (price updates live)

**Step 4: Cart sheet + floating button**

- Floating button: fixed bottom-right, shows item count + total, 44px min
- Cart sheet: slide-in from right
  - Items with modifiers listed, quantity controls
  - Remove item (swipe or X button)
  - Subtotal
  - "Proceed to checkout" button

**Step 5: Favorites API**

- `POST /api/tenants/[slug]/favorites` — toggle favorite (add/remove)
- `GET /api/tenants/[slug]/favorites` — get user's favorites for this tenant
- Heart icon on product cards reflects favorite state
- Requires auth (show login prompt if not signed in)

**Step 6: Order history + reorder**

- `GET /api/tenants/[slug]/orders/history` — customer's past orders for this tenant
- `app/[locale]/order/orders/page.tsx` — order history page
  - List past orders: date, order number, items summary, total, status
  - "Reorder" button on each past order → adds all items to cart
  - Link accessible from menu page header (small icon/link)

**Step 7: E2E Verification**

1. Seed a tenant with full menu (categories + products + modifiers + dietary tags)
2. Visit `/en/order` → verify categories and products load
3. **Search**: type a product name → verify filter works
4. **Dietary filters**: toggle "Vegan" → verify only vegan products show
5. Tap a product → verify detail sheet opens with modifiers + allergen info
6. Select modifiers → verify price updates
7. Add to cart → verify cart button appears with count
8. **Favorite**: tap heart on a product → verify it toggles (requires login)
9. Open cart → verify items display correctly
10. Modify quantity → verify total updates
11. Screenshot mobile: `node screenshot.mjs http://localhost:3000/en/order order-menu`
12. Screenshot cart: `node screenshot.mjs http://localhost:3000/en/order order-cart`
13. Refresh page → verify cart persists (localStorage)
14. Complete an order → visit `/en/order/orders` → verify order history shows
15. Tap "Reorder" → verify items added to cart

**Step 6: Commit**

```bash
git add app/[locale]/order/ components/order/ lib/stores/cart-store.ts
git commit -m "feat: customer ordering UI — menu, cart, search, favorites, history

- Menu with category tabs, search bar, dietary filters
- Product cards with allergen badges and favorite hearts
- Product detail sheet with modifier selection + allergen info
- Zustand cart with localStorage persistence
- Favorites API (toggle + list)
- Order history with reorder functionality
- Mobile-first, 44px touch targets"
```

---

## Task 13: Checkout Flow

**Files:**
- Create: `app/[locale]/order/checkout/page.tsx`
- Create: `components/order/checkout-form.tsx`
- Create: `components/order/payment-selector.tsx`
- Create: `components/order/pickup-time-selector.tsx`
- Create: `app/[locale]/order/confirmation/[orderId]/page.tsx`
- Create: `components/order/order-tracker.tsx`

**Step 1: Checkout page**

1. Auth gate — redirect to sign-in if not logged in
2. Cart summary (read-only, items with modifiers and prices)
3. Payment method selector (Stripe / Cash) — radio buttons
4. Pickup time selector
5. **Promo code input** — text field to enter Stripe promo code, validate via Stripe API, show discount applied
6. Customer note (optional textarea)
7. Place order button

**Step 2: Pickup time selector**

- "ASAP" option showing estimated time (now + prepTimeMinutes)
- Future time slots in 15-min increments, within today's operating hours
- If store is closed or paused, show message

**Step 3: Payment flow**

If Stripe:
1. Place order via API (status: NEW, paymentStatus: PENDING)
2. Create Checkout Session via API
3. Render embedded Payment Element (from Task 10)
4. On success → redirect to confirmation page
5. Webhook updates paymentStatus

If Cash:
1. Place order via API (status: NEW, paymentMethod: CASH, paymentStatus: PENDING)
2. Redirect to confirmation page immediately

**Step 4: Confirmation page**

- Order number large and prominent
- Order tracker with live status updates (Supabase Realtime)
- Status steps: NEW → ACCEPTED → PREPARING → READY → COMPLETED
- Estimated pickup time (once accepted)
- Order items summary
- Payment status badge

**Step 5: E2E Verification**

Full flow test:
1. Browse menu → add items → go to checkout
2. Test cash payment: select Cash → place order → verify confirmation page
3. Verify order appears in admin (check via API or DB)
4. Test Stripe payment: select Stripe → verify Payment Element renders inline
5. Pay with test card → verify redirect to confirmation
6. Verify webhook fires → order marked as PAID
7. Verify AADE invoice created automatically
8. Screenshot: `node screenshot.mjs http://localhost:3000/en/order/checkout checkout-flow`
9. Screenshot: `node screenshot.mjs http://localhost:3000/en/order/confirmation/{id} confirmation`

**Step 6: Commit**

```bash
git add app/[locale]/order/checkout/ app/[locale]/order/confirmation/ components/order/
git commit -m "feat: checkout with embedded Stripe payment and order tracking

- Payment method selection (Stripe embedded / Cash)
- Embedded Payment Element (no redirect)
- Pickup time selector with ASAP and scheduled
- Confirmation page with live Supabase Realtime status
- Auto AADE invoicing on payment success"
```

---

## Task 14: Admin Panel — Order Management

**Files:**
- Create: `app/[locale]/admin/orders/page.tsx`
- Create: `components/admin/orders/order-feed.tsx`
- Create: `components/admin/orders/order-card.tsx`
- Create: `components/admin/orders/order-detail-sheet.tsx`
- Create: `lib/sounds/notification.ts`
- Modify: `lib/admin/config.ts`

**Step 1: Live order feed**

- Supabase Realtime subscription for orders with `tenantId` filter
- New orders appear at top with animation
- Sound notification (Web Audio API beep) on new order
- Browser notification (Notification API) with permission request
- Filter tabs: All | New | Active (Accepted/Preparing) | Ready | Completed

**Step 2: Order card**

- Order number, time ago, item count, total
- Status badge (color-coded)
- Payment method icon (card/cash)
- Customer name

**Step 3: Order detail sheet**

- Slide-in from right
- Full customer info (name, phone, email)
- All items with modifiers, quantities, prices
- Payment details + AADE invoice status
- Pickup time
- Customer note
- Action buttons by status:
  - NEW → Accept (time picker for pickup) / Reject (reason input)
  - ACCEPTED → Preparing
  - PREPARING → Ready
  - READY → Completed

**Step 4: Notification sound**

`lib/sounds/notification.ts` — generate beep using Web Audio API:
```typescript
export function playOrderSound() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 800;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}
```

**Step 5: E2E Verification**

1. Open admin orders page → verify empty state
2. Place an order from customer UI → verify it appears in admin feed
3. Verify sound plays (check console for AudioContext)
4. Accept order → verify status changes, customer notification sent
5. Move through all statuses → verify timestamps update
6. Reject an order → verify reason saved
7. Place multiple orders → verify feed updates correctly
8. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/orders admin-orders`

**Step 6: Commit**

```bash
git add app/[locale]/admin/orders/ components/admin/orders/ lib/sounds/
git commit -m "feat: admin order management with live Realtime updates

- Supabase Realtime order feed
- Sound + browser notifications on new orders
- Order detail sheet with status actions
- Accept/reject with pickup time/reason
- Status-based filtering"
```

---

## Task 15: Admin Dashboard

**Files:**
- Modify: `app/[locale]/admin/page.tsx`
- Create: `components/admin/dashboard/stats-cards.tsx`
- Create: `components/admin/dashboard/recent-orders.tsx`
- Create: `components/admin/dashboard/popular-products.tsx`
- Create: `app/api/admin/[tenantId]/stats/route.ts`

**Step 1: Stats API**

`GET /api/admin/[tenantId]/stats` — returns:
- Orders today (count + revenue)
- Orders this week (count + revenue)
- Average order value
- Top 5 products by order count
- Last 10 orders

**Step 2: Dashboard page**

- Stat cards at top: Orders Today, Revenue Today, Avg Order, Active Orders
- Recent orders table (clickable → goes to order detail)
- Popular products list with order counts

**Step 3: E2E Verification**

1. Create several test orders with different statuses
2. Visit admin dashboard → verify stats are accurate
3. Verify recent orders match what was created
4. Verify popular products reflect actual order data
5. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin admin-dashboard`

**Step 4: Commit**

```bash
git add app/[locale]/admin/page.tsx components/admin/dashboard/ app/api/admin/*/stats/
git commit -m "feat: admin dashboard with live stats and quick views"
```

---

## Task 16: Admin Settings

**Files:**
- Modify: `app/[locale]/admin/settings/page.tsx`
- Create: `components/admin/settings/operating-hours-form.tsx`
- Create: `components/admin/settings/ordering-config-form.tsx`
- Create: `components/admin/settings/stripe-connect-card.tsx`
- Create: `app/api/admin/[tenantId]/settings/route.ts`

**Step 1: Settings API**

`GET/PUT /api/admin/[tenantId]/settings`:
- Read/update operating hours (7 days)
- Read/update prep time, pause state

**Step 2: Settings page**

Tabbed layout:
- **Hours**: Day-of-week grid with open/close time inputs, closed toggle per day
- **Ordering**: Prep time slider/input (5-60 min), Pause orders toggle (with warning)
- **Payments**: Stripe connection status card, Connect/Dashboard button

**Step 3: E2E Verification**

1. Visit settings → verify current values load
2. Update operating hours → save → refresh → verify persisted
3. Change prep time → verify pickup time selector reflects new time
4. Toggle pause → verify ordering page shows "temporarily closed"
5. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/settings admin-settings`

**Step 4: Commit**

```bash
git add app/[locale]/admin/settings/ components/admin/settings/ app/api/admin/*/settings/
git commit -m "feat: admin settings — hours, ordering config, Stripe connect"
```

---

## Task 17: QR Menu Page (View-Only)

**Files:**
- Create: `app/[locale]/menu/page.tsx`
- Create: `app/[locale]/menu/layout.tsx`
- Create: `components/menu/menu-header.tsx`
- Create: `components/menu/menu-category.tsx`
- Create: `components/menu/menu-product-card.tsx`
- Create: `components/menu/order-cta.tsx`

**Step 1: Menu layout**

Minimal: tenant logo + name header, no auth, no cart. Clean, fast-loading.

**Step 2: Menu display**

- Sticky category nav (horizontal scroll)
- Products grouped by category
- Each product: image, name, description, price
- Modifier info as text (e.g., "Sizes: S, M, L")
- No add-to-cart, no interactive elements

**Step 3: Order CTA**

Fixed bottom bar: tenant-branded "Order Now" button.
- Links to ordering app URL (`order.{domain}`)
- Or app store link if Capacitor app exists

**Step 4: E2E Verification**

1. Visit `/en/menu` → verify menu loads with products
2. Verify no cart, no ordering functionality
3. Verify "Order Now" button present and links correctly
4. Verify it works without auth
5. Screenshot: `node screenshot.mjs http://localhost:3000/en/menu qr-menu`
6. Test mobile: verify clean, scannable layout for QR use case

**Step 5: Commit**

```bash
git add app/[locale]/menu/ components/menu/
git commit -m "feat: QR menu — view-only with order CTA

- Tenant-branded read-only menu
- Category navigation with smooth scroll
- Order Now CTA linking to ordering app"
```

---

## Task 18: PWA Support

**Files:**
- Create: `app/manifest.ts`
- Create: `public/sw.js`
- Create: `components/register-sw.tsx`
- Modify: `app/[locale]/layout.tsx`

**Step 1: Dynamic manifest**

`app/manifest.ts` — generates PWA manifest from tenant config:
- `name` → tenant's pwaName or tenant name
- `short_name` → tenant's pwaShortName or name truncated
- `theme_color` → tenant's pwaThemeColor or primaryColor
- `background_color` → tenant's pwaBgColor or white
- `icons` → tenant's logo in required sizes (192x192, 512x512)
- `display: "standalone"`
- `start_url: "/"`

Note: Dynamic manifests need special handling since manifest.ts runs without request context. Options:
- Generate per-tenant manifest via API route instead: `app/api/manifest/route.ts`
- Or use static manifest with JS injection

**Step 2: Service worker**

`public/sw.js`:
- Push notification handler (display order status notifications)
- Notification click handler (open relevant order page)
- Keep minimal — no offline caching in Phase 1

**Step 3: Registration component**

`components/register-sw.tsx` — registers SW on mount, handles notification permission.

**Step 4: E2E Verification**

1. Visit site in Chrome → check DevTools > Application > Manifest
2. Verify manifest shows tenant name, colors, icons
3. Verify "Install App" prompt appears (or install manually)
4. Install PWA → verify it opens standalone with tenant branding
5. Verify service worker registered (DevTools > Application > Service Workers)
6. Screenshot installed PWA if possible

**Step 5: Commit**

```bash
git add app/manifest.ts public/sw.js components/register-sw.tsx app/[locale]/layout.tsx
git commit -m "feat: PWA with per-tenant manifest and push notifications

- Dynamic manifest from tenant config
- Service worker for push notifications
- Auto-registration component
- Installable as standalone app"
```

---

## Task 19: Seed Data & Presets

**Files:**
- Create: `lib/db/seed.ts`
- Create: `lib/db/presets/coffee-shop.ts`
- Create: `lib/db/presets/souvlaki-shop.ts`
- Create: `lib/db/presets/index.ts`
- Modify: `package.json`

**Step 1: Create presets**

`coffee-shop.ts`:
- Categories: Hot Drinks, Cold Drinks, Snacks, Pastries
- Products: Espresso (€1.80), Cappuccino (€3.50), Freddo Espresso (€3.00), Freddo Cappuccino (€3.50), Filter Coffee (€2.50), Hot Chocolate (€3.50), Croissant (€2.00), Cookie (€1.50), etc.
- Modifier groups:
  - Size: Small (default), Medium (+€0.50), Large (+€1.00) — required, max 1
  - Milk: Regular (default), Oat (+€0.50), Almond (+€0.50), Soy (+€0.30) — optional, max 1
  - Sugar: None, 1 (default), 2 — required, max 1
  - Extras: Extra shot (+€0.80), Whipped cream (+€0.50), Syrup (+€0.50) — optional, max 3

`souvlaki-shop.ts`:
- Categories: Souvlaki, Plates, Salads, Sides, Drinks
- Products: Pita Gyros Pork (€3.50), Pita Gyros Chicken (€3.50), Kalamaki (€2.50), Merida Plate (€9.00), Greek Salad (€6.00), Fries (€3.00), Coke (€2.00), etc.
- Modifier groups:
  - Pita extras: Tzatziki, Tomato, Onion, Fries in pita, Paprika — multiple select
  - Sauce: Tzatziki, Mustard, Ketchup, Hot sauce — optional
  - Size: Regular, Large (+€2.00)

**Step 2: Seed script**

`lib/db/seed.ts`:
1. Create test tenant "Figata Cafe" (slug: figata-cafe) with branding
2. Create TenantConfig with sample colors
3. Set operating hours (Mon-Sat 8:00-23:00, Sun 9:00-22:00)
4. Apply coffee-shop preset
5. Create test user with OWNER role
6. Create InvoiceSequence for the tenant
7. Optionally create a second tenant "Souvlakia.gr" with souvlaki preset

Add to package.json:
```json
"prisma": {
  "schema": "lib/db/schema.prisma",
  "seed": "npx tsx lib/db/seed.ts"
}
```

**Step 3: E2E Verification**

1. Run `pnpm prisma db seed` → verify no errors
2. Run `pnpm prisma studio` → verify all data created
3. Visit `/en/order` → verify full menu displays
4. Visit `/en/menu` → verify QR menu shows products
5. Visit admin → verify dashboard shows the store

**Step 4: Commit**

```bash
git add lib/db/seed.ts lib/db/presets/ package.json
git commit -m "feat: seed data with coffee shop and souvlaki presets

- Coffee shop: 4 categories, 15+ products, 4 modifier groups
- Souvlaki shop: 5 categories, 10+ products, 3 modifier groups
- Full tenant setup with branding and operating hours"
```

---

## Task 20: Super Admin — Tenant Management

**Files:**
- Create: `app/[locale]/admin/super/page.tsx`
- Create: `app/[locale]/admin/super/tenants/page.tsx`
- Create: `app/[locale]/admin/super/tenants/[tenantId]/page.tsx`
- Create: `components/admin/super/tenant-list.tsx`
- Create: `components/admin/super/tenant-form.tsx`
- Create: `components/admin/super/preset-selector.tsx`
- Create: `app/api/admin/super/tenants/route.ts`
- Create: `app/api/admin/super/tenants/[tenantId]/route.ts`
- Modify: `lib/admin/config.ts`

**Step 1: Super admin API**

All routes require SUPER_ADMIN role:
- `GET /api/admin/super/tenants` — list all tenants with order count, revenue, status
- `POST /api/admin/super/tenants` — create tenant + config + operating hours
- `PUT /api/admin/super/tenants/[id]` — update tenant
- `POST /api/admin/super/tenants/[id]/preset` — apply menu preset
- `POST /api/admin/super/tenants/[id]/invite` — invite user as OWNER by email

**Step 2: Tenant list page**

Table showing: name, slug, domain, status (active/paused), order count, revenue, Stripe status. Actions: edit, activate/deactivate.

**Step 3: Tenant create/edit form**

- Basic info: name, slug, domain, phone, email, address
- Branding: logo upload, primary/secondary/accent colors (color pickers)
- PWA config: name, short name, theme color
- Preset selector: Coffee Shop, Souvlaki, Blank
- Owner invite: email input to assign OWNER role

**Step 4: Conditionally show super admin nav**

In `lib/admin/config.ts`, add "Platform" nav group only visible to SUPER_ADMIN role.

**Step 5: E2E Verification**

1. Sign in as SUPER_ADMIN
2. Visit `/en/admin/super/tenants` → verify tenant list
3. Create a new tenant with souvlaki preset → verify created
4. Apply preset → verify menu populated
5. Invite an owner → verify TenantRole created
6. Switch to the new tenant's admin → verify they see their store only
7. Deactivate a tenant → verify ordering page shows "store unavailable"
8. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/super/tenants super-admin`

**Step 6: Commit**

```bash
git add app/[locale]/admin/super/ components/admin/super/ app/api/admin/super/ lib/admin/config.ts
git commit -m "feat: super admin — tenant management with presets

- Tenant CRUD with branding config
- Preset application (coffee/souvlaki/blank)
- Owner role invitation
- Cross-tenant stats overview
- Conditional nav for SUPER_ADMIN"
```

---

## Task 21: Admin — Invoice Management UI

**Files:**
- Create: `app/[locale]/admin/invoices/page.tsx`
- Create: `components/admin/invoices/invoice-list.tsx`
- Create: `components/admin/invoices/invoice-detail-sheet.tsx`
- Create: `components/admin/invoices/manual-invoice-form.tsx`
- Modify: `lib/admin/config.ts`

**Step 1: Invoice list page**

- Table: invoice number, date, amount, payment method, AADE status, order link
- Filters: status (pending/submitted/failed), date range
- Failed invoices highlighted with retry button

**Step 2: Invoice detail sheet**

- Full invoice details, AADE mark/uid
- QR code display (from `qrUrl`)
- AADE errors display for failed invoices
- Retry button for failed

**Step 3: Manual invoice form**

- For phone orders or non-order transactions
- Amount, customer name (optional), customer VAT (optional for B2B)
- Payment method selection
- Submit → creates invoice and sends to AADE

**Step 4: E2E Verification**

1. Complete a Stripe payment → verify invoice appears in list as "submitted"
2. Complete a cash order → verify invoice created
3. Create manual invoice → verify sent to AADE
4. View invoice detail → verify QR code displays
5. Screenshot: `node screenshot.mjs http://localhost:3000/en/admin/invoices admin-invoices`

**Step 5: Commit**

```bash
git add app/[locale]/admin/invoices/ components/admin/invoices/ lib/admin/config.ts
git commit -m "feat: admin invoice management with AADE status tracking

- Invoice list with status filters
- Invoice detail with QR code
- Manual invoice creation
- Failed invoice retry"
```

---

## Task 22: Staff Management UI

**Files:**
- Create: `app/[locale]/admin/staff/page.tsx`
- Create: `components/admin/staff/staff-list.tsx`
- Create: `components/admin/staff/invite-staff-dialog.tsx`
- Create: `app/api/admin/[tenantId]/staff/route.ts`
- Modify: `lib/admin/config.ts`

**Step 1: Staff API**

- `GET /api/admin/[tenantId]/staff` — list staff with roles
- `POST /api/admin/[tenantId]/staff` — invite by email, assign role
- `PUT /api/admin/[tenantId]/staff/[userId]` — change role
- `DELETE /api/admin/[tenantId]/staff/[userId]` — remove staff

**Step 2: Staff page**

- Table: name, email, role, joined date
- Invite button → dialog with email + role selector
- Role dropdown to change existing staff roles
- Remove button with confirmation

**Step 3: E2E Verification**

1. Visit staff page → verify current staff listed
2. Invite a new staff member → verify TenantRole created
3. Change role → verify updated
4. Remove staff → verify role deleted
5. Verify CASHIER can only see orders (test by signing in as cashier)

**Step 4: Commit**

```bash
git add app/[locale]/admin/staff/ components/admin/staff/ app/api/admin/*/staff/
git commit -m "feat: admin staff management with role assignment"
```

---

## Task 23: Final Integration Testing & Polish

**Step 1: Full customer flow E2E**

1. Visit ordering app → browse menu → add items with modifiers
2. Go to checkout → sign in (Google or magic link)
3. Select Stripe → pay with test card → verify confirmation
4. Verify: order in admin, invoice in AADE, customer record created
5. Admin accepts → customer sees ACCEPTED → PREPARING → READY → COMPLETED
6. Repeat with cash payment

**Step 2: Multi-tenant isolation**

1. Create two tenants via super admin
2. Verify: menu data completely separate
3. Verify: orders don't leak between tenants
4. Verify: staff of tenant A cannot access tenant B
5. Verify: different branding loads for each domain

**Step 3: QR menu**

1. Visit `/menu` → verify view-only
2. Verify "Order Now" CTA links correctly
3. Verify no auth required

**Step 4: PWA**

1. Install PWA → verify standalone mode
2. Verify tenant branding in installed app
3. Test push notification (if possible in dev)

**Step 5: Responsive design audit**

Screenshot all key pages at 375px (mobile) and 1280px (desktop):
```bash
node screenshot.mjs http://localhost:3000/en/order order-mobile
node screenshot.mjs http://localhost:3000/en/order/checkout checkout-mobile
node screenshot.mjs http://localhost:3000/en/menu qr-menu-mobile
node screenshot.mjs http://localhost:3000/en/admin admin-desktop
node screenshot.mjs http://localhost:3000/en/admin/orders admin-orders-desktop
node screenshot.mjs http://localhost:3000/en/admin/menu admin-menu-desktop
```

**Step 6: Build verification**

```bash
pnpm lint
pnpm tsc --noEmit
pnpm build
```

All must pass.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: Phase 1 integration testing and polish"
```

---

## Dependency Graph & Parallel Tracks

```
Task 1 (Schema) ─────┬─→ Task 2 (Auth) ───→ Task 7 (Admin Menu API) ───→ Task 8 (Menu UI)
                      │                                                         │
                      ├─→ Task 3 (Tenant Middleware) ─→ Task 4 (Tenant Layout) ─┤
                      │                                                         │
                      ├─→ Task 5 (React Query) ────────────────────────────────→┤
                      │                                                         │
                      ├─→ Task 6 (Public Menu API) ──→ Task 12 (Ordering UI) ──→ Task 13 (Checkout)
                      │                                  │
                      ├─→ Task 18 (Presets) ─→ Task 19 (Seed) ─→ Task 20 (Super Admin)
                      │
                      └─→ Task 9 (Order API) ──┬─→ Task 10 (Stripe) ──→ Task 13 (Checkout)
                                                │
                                                ├─→ Task 11 (AADE) ───→ Task 21 (Invoice UI)
                                                │
                                                ├─→ Task 14 (Order Admin)
                                                │
                                                └─→ Task 15 (Dashboard)

Independent after Task 4:
  Task 16 (QR Menu)
  Task 17 (PWA)
  Task 22 (Staff)

Final:
  Task 23 (Integration Testing) — depends on all above
```

**Recommended parallel tracks:**
- **Track A** (Foundation): Tasks 1 → 2 → 3 → 4 → 5
- **Track B** (Menu): Tasks 6 → 7 → 8 (after Track A)
- **Track C** (Orders + Payments): Tasks 9 → 10 → 11 (after Task 1)
- **Track D** (Customer UI): Tasks 12 → 13 (after Track B + C)
- **Track E** (Admin): Tasks 14 → 15 → 16 (after Task 9)
- **Track F** (Platform): Tasks 18 → 19 → 20 (after Task 1)
- **Track G** (Supporting): Tasks 17, 21, 22 (independent after Task 4)

**Total: 23 tasks**
