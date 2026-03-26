# Whitelabel Ordering App — Production Roadmap

## Current State: ~85% Complete

The core ordering flow works: menu browsing, cart, checkout (Stripe Connect), order management, admin panel, multi-tenant subdomain routing, QR menu, promo codes, coupons, customer groups, AADE invoicing, Supabase Realtime updates, PWA with push notifications, email notifications, analytics with PDF export, KDS with drag-and-drop, refund processing, tips, scheduled orders, reorder carousel.

**What follows is everything needed to go live with 100 stores.**

---

## PHASE 0: Critical Blockers (Must-Have Before First Customer)

### 0.1 Stripe Connect Onboarding Flow — DONE

- **Status:** ~~Fields exist (`stripeAccountId`, `stripeOnboarded`) but no complete OAuth onboarding flow~~ **COMPLETE** — Full Stripe Connect (Accounts v2) Express account creation and onboarding flow at `/api/admin/[tenantId]/stripe/connect/`. Creates account link for OAuth redirect, stores `stripeAccountId` and `stripeOnboarded` status, returns onboarding URL and account capabilities (chargesEnabled, payoutsEnabled).

### 0.2 Stripe Webhook Completion — DONE

- **Status:** ~~Webhook route exists but needs verification~~ **COMPLETE** — Handles all critical events: `payment_intent.succeeded` → PAID, `payment_intent.payment_failed` → FAILED, `charge.refunded` → REFUNDED, `charge.dispute.created` → DISPUTED, `charge.dispute.closed` → resolves based on outcome. Route at `/api/webhooks/stripe/`.

### 0.3 Rate Limiting on API Routes — PARTIAL

- **Status:** Rate limiters defined in `lib/security/rate-limit.ts` (apiLimiter 60/min, authLimiter 10/15min, orderLimiter 10/min, checkoutLimiter 5/min). **Applied to** orders and checkout routes. **NOT yet applied to** auth, menu, and other public endpoints.
- **Remaining work:** Apply rate limiting to all remaining public endpoints
- **Why critical:** One bad actor can DDoS the entire platform for all 100 stores

### 0.4 Tenant Self-Registration / Super Admin Onboarding

- **Status:** Super admin can create tenants via `/admin/super/tenants`, but it's manual
- **Need:** Streamlined flow to onboard a new store in <10 minutes
- **Work:** Wizard or script that creates tenant, sets branding, imports menu, connects Stripe
- **Why critical:** If onboarding takes hours, you can't scale to 100 stores

---

## PHASE 1: Revenue-Critical Features (First 10 Customers)

### 1.1 Per-Order Service Fee System (Your Business Model)

- **Status:** NOT built
- **Need:** The pricing model discussed — charge stores per order or flat subscription
- **Work:**
  - Add to Tenant model: `billingPlan` (PER_ORDER | SUBSCRIPTION), `monthlyFee`, `perOrderFee`, `includedOrders`, `serviceFeeMode` (CUSTOMER_PAYS | STORE_PAYS)
  - Track order counts per billing period
  - If CUSTOMER_PAYS: add visible service fee line in checkout
  - If STORE_PAYS: deduct from their Stripe Connect transfers
  - Admin toggle in store settings
  - Super admin billing dashboard showing revenue per store
- **Priority:** HIGH — this is how you make money

### 1.2 Customer Auth Improvements

- **Status:** Google OAuth + Email magic link
- **Need:** Phone number login (OTP via SMS) — most restaurant customers don't use Google to order food
- **Work:** Add SMS OTP provider (Twilio or cheaper: Vonage/MessageBird)
- **Alternative MVP:** Keep email magic link but make it seamless — pre-fill email, auto-redirect after verification
- **Priority:** HIGH — friction at login = lost orders

### 1.3 Push Notifications (Store Admin) — DONE

- **Status:** ~~No server-side push sending~~ **COMPLETE** — Full Web Push pipeline: VAPID keys in `lib/push/send.ts`, subscription endpoint at `/api/tenants/[tenantSlug]/push/subscribe/`, `PushSubscription` model with role tracking (admin/customer), `sendPushToAdmins()` and `sendPushToCustomer()` helpers, `usePushSubscription()` hook, service worker handler, admin bell toggle, customer soft-prompt on order confirmation, offline fallback page, maskable icons.

### 1.4 Order Printing (Thermal Printer)

- **Status:** NOT built
- **Need:** Kitchen needs to print order tickets on thermal printers (80mm ESC/POS)
- **Work:**
  - Option A: Browser `window.print()` with thermal-printer-friendly CSS (simplest)
  - Option B: Integration with cloud printing service (e.g., Star CloudPRNT)
  - MVP: Go with Option A — create a print-friendly order view, auto-print on new order
- **Priority:** HIGH — 90% of Greek kitchens use thermal printers

### 1.5 Table/Dine-In Ordering (McDonald's Mode)

- **Status:** DINE_IN order type exists in schema, but no table management
- **Need:** Customer scans QR at table, orders from phone, kitchen receives order with table number
- **Work:**
  - Add `tableNumber` field to Order model
  - QR code generator in admin (one per table, encodes table number in URL)
  - Customer flow: scan QR → menu → order → select "pay now" or "pay at counter"
  - Kitchen display shows table number on order
- **Priority:** MEDIUM-HIGH — this is a unique selling point vs eFood

---

## PHASE 2: Operational Excellence (10-50 Customers)

### 2.1 Kitchen Display System (KDS) Polish — DONE

- **Status:** ~~Basic KDS page~~ **COMPLETE** — Full kanban board with NEW | PREPARING | READY columns, drag-and-drop via `@dnd-kit`, elapsed time timers with color coding (green→amber→red), sound alerts with mute toggle, rejection dialog with reason capture, order detail sheet. Separate admin order board with 8 columns and view toggle (board/list) persisted to localStorage.

### 2.2 Customer Order Tracking Page — DONE

- **Status:** ~~Order confirmation exists, SSE stream~~ **COMPLETE** — Real-time order tracking banner via Supabase Realtime (broadcast channel) with polling fallback. Animated status icons showing progression: NEW → ACCEPTED → PREPARING → READY. Shows current status, estimated ready time, price. Dismissible UI with status colors (amber→blue→orange→green).

### 2.3 SMS Notifications

- **Status:** Email only
- **Need:** SMS to customer when order is READY ("Your order at Nikos Cafe is ready for pickup!")
- **Work:** Twilio/Vonage integration, configurable per tenant (on/off)
- **Priority:** MEDIUM — many customers prefer SMS over email

### 2.4 Favorites & Reorder — DONE

- **Status:** ~~`Favorite` model exists but no UI~~ **COMPLETE** — Reorder carousel on menu page showing last 5 completed orders with horizontal scroll. One-tap "Order Again" button adds all items to cart (filters out unavailable products, preserves modifiers). Toast notification on success. Favorite model with API endpoint at `/api/tenants/[tenantSlug]/favorites/`.

### 2.5 Scheduled Orders UI — DONE

- **Status:** ~~`scheduledFor` field exists, no UI~~ **COMPLETE** — Collapsible schedule selector in checkout (`checkout-schedule-card.tsx`) with Standard/Schedule for Later toggle, Today/Tomorrow date selection, 30-min time slot picker (0:00–23:30). Backend validates 30min minimum delay.

### 2.6 Refund Processing — DONE

- **Status:** ~~REFUNDED status exists but no admin flow~~ **COMPLETE** — Full/partial refund endpoint at `/api/admin/[tenantId]/orders/[orderId]/refund/`. Stripe refund API integration. Order model tracks `refundAmount`, `refundedAt`, `refundReason`, `stripeRefundId`. Validates PAID state before refunding. Sends refund notification email to customer.

### 2.7 Tips UI — DONE

- **Status:** ~~`tipAmount` field exists but no selection UI~~ **COMPLETE** — Tip selector component (`checkout-tip-chips.tsx`) with preset options: No Tip, €0.50, €1.00, €1.50, €2.00, and Custom input. Validation (0–100 range). Selected chips show brand color highlighting.

---

## PHASE 3: Scale & Polish (50-100 Customers)

### 3.1 Analytics Dashboard V2 — DONE

- **Status:** ~~Basic analytics~~ **COMPLETE** — Full analytics with recharts: revenue/orders by day, order type breakdown (pie chart), peak hours analysis, payment method distribution. Detail dialog with tabs and date range filtering (today, last 7 days, this/last month, this/last year, custom). Date presets utility (`lib/general/date-presets.ts`). PDF export via html2canvas + jsPDF (`lib/general/pdf-export.ts`). Calendar component for custom ranges. API routes at `/api/admin/[tenantId]/analytics/` and `/api/admin/[tenantId]/analytics/detailed/`.

### 3.2 Inventory/Stock Management

- **Status:** NOT built — all products assumed always available
- **Need:** "Mark as unavailable" toggle per product (not full inventory counting)
- **Work:** Add `isAvailable` field (or reuse `isActive`), admin toggle, grey out in menu
- **Priority:** MEDIUM — "sorry we're out of that" is a bad customer experience

### 3.3 Multi-Language Admin Panel

- **Status:** Admin is English-only, customer side has en/el
- **Need:** Greek admin panel (your stores are in Greece)
- **Work:** Add admin translation keys to el.json
- **Priority:** MEDIUM — Greek store owners want Greek admin

### 3.4 Custom Domain Setup — DONE

- **Status:** ~~Manual Vercel setup~~ **COMPLETE** — `TenantDomain` model supports multiple domains per tenant with `isPrimary` flag. Domain management UI in super admin panel (`tenant-management.tsx`). Can assign custom domains, designate primary domain.

### 3.5 Store Landing Page

- **Status:** Landing page exists but seems to be a single template
- **Need:** Each store gets a mini landing page at their subdomain root (hero, about, hours, menu link, install app CTA)
- **Work:** Dynamic landing page pulling from TenantConfig
- **Priority:** MEDIUM — first impression matters

### 3.6 Review/Rating System

- **Status:** NOT built
- **Need:** Post-order rating (1-5 stars + optional comment)
- **Work:** New model, prompt after order completion, display average in store page
- **Priority:** LOW — nice to have, not critical

### 3.7 Audit Logging

- **Status:** NOT built
- **Need:** Track who changed what in admin (menu changes, order status, settings)
- **Work:** Simple audit log table (who, what, when, before/after)
- **Priority:** LOW — becomes important at scale for dispute resolution

---

## PHASE 4: Growth & Competitive Advantage

### 4.1 Store Discovery Page

- **Need:** Public page listing all stores on the platform (like a mini eFood but for YOUR stores)
- **Work:** `/stores` page with search, filters, location
- **Priority:** LOW — only matters when you have 20+ stores

### 4.2 Google Reviews Integration — PARTIAL

- **Status:** `googlePlaceId` field exists on TenantConfig. Display-only component (`GoogleReviews.tsx`) fetches reviews from Google Places API and shows rating + review count. **Missing:** No in-app customer ratings stored, display only.
- **Priority:** LOW — social proof

### 4.3 Advanced Loyalty (Tiers, Points) — REPLACED

- **Status:** ~~Basic order-counting loyalty~~ **REPLACED** by the coupon system (milestone + manual + recurring coupons). Legacy loyalty removed. See "Bonus Features" section below.
- **Need:** Points system, tier levels, birthday rewards could still be built on top of coupons
- **Priority:** LOW — coupon system covers most use cases

### 4.4 Delivery Driver App

- **Status:** NOT built, delivery fee/range exists
- **Need:** Separate driver view: see assigned deliveries, mark as picked up / delivered
- **Priority:** LOW — most small Greek stores use their own drivers who don't need an app

### 4.5 Platform Admin Dashboard

- **Need:** Super admin dashboard showing: total revenue, active stores, orders across all tenants, billing status per store, MRR tracking
- **Priority:** MEDIUM — you need this to run the business, but can use DB queries initially

---

## Infrastructure Notes

### Current Stack (Handles 100 Stores Easily)

| Service        | Cost/Month     | Notes                                                    |
| -------------- | -------------- | -------------------------------------------------------- |
| Supabase Pro   | $25            | DB + Storage + Realtime (500 concurrent WS, 5M messages) |
| Vercel Pro     | $20            | If bandwidth exceeds, switch to Railway ($5-20)          |
| .gr domain     | ~$1            | Wildcard subdomain for all stores                        |
| Resend (email) | $0-20          | Free tier: 3k emails/month, then $20 for 50k             |
| **Total**      | **~$50/month** |                                                          |

### Scaling Triggers

| When                           | Action                                        | Cost Impact |
| ------------------------------ | --------------------------------------------- | ----------- |
| 500+ concurrent WS connections | Supabase handles it, extra $10/1k connections | +$5-10/mo   |
| 100+ stores, heavy traffic     | Upgrade Vercel or move to Railway/Hetzner     | +$20-50/mo  |
| 50k+ emails/month              | Upgrade Resend plan                           | +$20/mo     |
| Need SMS                       | Add Twilio (~$0.05/SMS)                       | Usage-based |

### SSE vs Supabase Realtime — MIGRATED

~~Current implementation uses SSE with in-memory EventEmitter.~~ **DONE** — Migrated to **Supabase Realtime** (broadcast channel) for order status updates. Works across all server instances, with polling fallback for reliability.

---

## Bonus Features (Not Originally in Roadmap — DONE)

### B.1 Coupon System (Replacing Loyalty)

- **Status:** DONE — Full coupon system with MILESTONE (auto-generated on spending/order count), MANUAL, and RECURRING sources. Admin management UI (`coupon-management.tsx`), customer-facing modal (`coupon-modal.tsx`), validation logic (`lib/coupons/validate.ts`). Configurable per tenant: type, value, expiry, min order, max savings, max coupons per order. Auto-generated codes (e.g., "LOYAL-X8K2"). E2E test coverage.

### B.2 Promo Code Management

- **Status:** DONE — Separate from coupons. Admin CRUD for promo codes (`promo-code-management.tsx`). Validation endpoint at `/api/tenants/[tenantSlug]/promo-codes/validate`. Supports fixed and percentage discounts.

### B.3 Customer Groups with Discounts

- **Status:** DONE — `CustomerGroup` and `CustomerGroupMember` models. API routes at `/api/admin/[tenantId]/customer-groups/`. Discount types: FIXED or PERCENTAGE with min order thresholds and max discount caps. `calculateBestGroupDiscount()` in `lib/groups/discount.ts`. Discount auto-applied at checkout if customer is in eligible group.

### B.4 Checkout Component Modularization

- **Status:** DONE — Checkout refactored into modular components: `checkout-coupon-card.tsx`, `checkout-items-list.tsx`, `checkout-summary-card.tsx`, `checkout-address-card.tsx`, `checkout-schedule-card.tsx`, `checkout-tip-chips.tsx`.

### B.5 Quantity Stepper Component

- **Status:** DONE — Reusable `QuantityStepper` with 3 variants: "overlay" (on product images), "inline" (in lists), "detail" (product sheet). Collapsible minus button, shake animation on add. Used across cart, menu, product detail, and checkout.

### B.6 PDF Export for Analytics

- **Status:** DONE — `lib/general/pdf-export.ts` converts charts to PDF via html2canvas + jsPDF. SVG-to-canvas conversion for proper rendering. Exports with title, timestamp, landscape layout.

---

## Priority Summary

| Phase                    | Original Items | Done              | Remaining Effort                                             |
| ------------------------ | -------------- | ----------------- | ------------------------------------------------------------ |
| **Phase 0** (Blockers)   | 4              | 2 done, 1 partial | ~1 week (rate limiting + onboarding wizard)                  |
| **Phase 1** (Revenue)    | 5              | 1 done, 1 partial | ~2-3 weeks (service fees, phone auth, printing, tables)      |
| **Phase 2** (Operations) | 7              | 6 done            | ~1 week (SMS notifications only)                             |
| **Phase 3** (Scale)      | 7              | 2 done            | ~3-4 weeks (stock, i18n admin, landing page, reviews, audit) |
| **Phase 4** (Growth)     | 5              | 1 partial         | Ongoing                                                      |
| **Bonus**                | 6              | 6 done            | —                                                            |

---

## The Bottom Line

You have a **production-ready platform**. Stripe Connect onboarding, webhooks, real-time order tracking, push notifications, KDS with drag-and-drop, refund processing, tips, scheduled orders, coupons, promo codes, customer groups, analytics with PDF export — all built and working.

**To go live with your first paying customer, you need:** finish rate limiting (0.3) and build the service fee system (1.1). That's ~2 weeks of work.

**Remaining critical gaps:**

1. **Service fee system** (1.1) — your business model, how you make money
2. **Rate limiting completion** (0.3) — protect all public endpoints
3. **Tenant onboarding wizard** (0.4) — scale to 100 stores efficiently
4. **Phone/SMS auth** (1.2) — reduce friction for restaurant customers
5. **Order printing** (1.4) — Greek kitchens need thermal printer support
