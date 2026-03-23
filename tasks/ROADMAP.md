# Whitelabel Ordering App — Production Roadmap

## Current State: ~75% Complete

The core ordering flow works: menu browsing, cart, checkout (Stripe Connect), order management, admin panel, multi-tenant subdomain routing, QR menu, promo codes, loyalty, AADE invoicing, SSE real-time updates, PWA manifest, email notifications.

**What follows is everything needed to go live with 100 stores.**

---

## PHASE 0: Critical Blockers (Must-Have Before First Customer)

### 0.1 Stripe Connect Onboarding Flow
- **Status:** Fields exist (`stripeAccountId`, `stripeOnboarded`) but no complete OAuth onboarding flow
- **Need:** When a new store signs up, they must connect their Stripe account to receive payments
- **Work:** Build the full Stripe Connect onboarding redirect flow in admin settings
- **Why critical:** No Stripe Connect = no online payments = no revenue

### 0.2 Stripe Webhook Completion
- **Status:** Webhook route exists at `/api/webhooks/stripe` but needs verification
- **Need:** Handle `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.dispute.created`
- **Work:** Ensure order status updates automatically when payment confirms/fails
- **Why critical:** Without this, cash flow breaks — orders might show as unpaid even after payment

### 0.3 Rate Limiting on API Routes
- **Status:** Rate limiter exists in `lib/security/rate-limit.ts` but is NOT applied to any routes
- **Need:** Apply to all public endpoints, especially order creation, checkout, and auth
- **Work:** Add middleware or per-route rate limiting
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

### 1.3 Push Notifications (Store Admin)
- **Status:** SSE works for real-time, browser sound notifications exist
- **Need:** Web push notifications so store owners get alerts even when browser tab is closed
- **Work:** Web Push API with service worker (depends on Phase 0.2)
- **Priority:** HIGH — missed order notification = unhappy store owner

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

### 2.1 Kitchen Display System (KDS) Polish
- **Status:** Basic KDS page exists at `/admin/kitchen`
- **Need:** Full kanban board: NEW | PREPARING | READY columns, drag to change status, timer per order, sound alerts
- **Work:** Polish existing component, add drag-and-drop, add elapsed time counters
- **Priority:** MEDIUM — current order management works, KDS is a nice-to-have upgrade

### 2.2 Customer Order Tracking Page
- **Status:** Order confirmation exists, SSE stream per order exists
- **Need:** Beautiful real-time tracking page (like Domino's tracker)
- **Work:** Animated status stepper: Received → Preparing → Ready → Enjoy!
- **Priority:** MEDIUM — improves customer experience significantly

### 2.3 SMS Notifications
- **Status:** Email only
- **Need:** SMS to customer when order is READY ("Your order at Nikos Cafe is ready for pickup!")
- **Work:** Twilio/Vonage integration, configurable per tenant (on/off)
- **Priority:** MEDIUM — many customers prefer SMS over email

### 2.4 Favorites & Reorder
- **Status:** `Favorite` model exists but no UI
- **Need:** "Order Again" button on past orders, save favorite products
- **Work:** Build favorites UI, one-tap reorder from order history
- **Priority:** MEDIUM — increases repeat orders (= more revenue for you)

### 2.5 Scheduled Orders UI
- **Status:** `scheduledFor` field exists in Order model, backend validates 30min minimum
- **Need:** Customer-facing time picker in checkout
- **Work:** Add scheduling UI component in checkout flow
- **Priority:** MEDIUM — useful for catering, lunch pre-orders

### 2.6 Refund Processing
- **Status:** REFUNDED status exists but no admin flow
- **Need:** Admin button to refund an order (full or partial) via Stripe
- **Work:** Stripe refund API call from admin panel, update order payment status
- **Priority:** MEDIUM — you WILL need this when a customer complains

### 2.7 Tips UI
- **Status:** `tipAmount` field exists but no selection UI
- **Need:** Tip selection in checkout (round up, 5%, 10%, 15%, custom)
- **Work:** Tip selector component before payment
- **Priority:** LOW-MEDIUM — nice revenue boost for stores

---

## PHASE 3: Scale & Polish (50-100 Customers)

### 3.1 Analytics Dashboard V2
- **Status:** Basic analytics exist
- **Need:** Revenue by day/week/month, top products, peak hours, customer retention, order type breakdown
- **Work:** Aggregate queries + charts (recharts already in project)
- **Priority:** MEDIUM — stores love seeing their numbers

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

### 3.4 Custom Domain Setup Automation
- **Status:** Custom domains supported in DB, manual Vercel setup
- **Need:** Admin UI where store owner enters their domain, auto-configures DNS instructions + Vercel
- **Work:** Vercel API for domain addition, DNS instruction page
- **Priority:** LOW-MEDIUM

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

### 4.2 Google Reviews Integration
- **Status:** `googlePlaceId` field exists on TenantConfig
- **Work:** Pull and display Google reviews on store page
- **Priority:** LOW — social proof

### 4.3 Advanced Loyalty (Tiers, Points)
- **Status:** Basic order-counting loyalty exists
- **Need:** Points system, tier levels, birthday rewards
- **Priority:** LOW — current system works fine for now

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

| Service | Cost/Month | Notes |
|---------|------------|-------|
| Supabase Pro | $25 | DB + Storage + Realtime (500 concurrent WS, 5M messages) |
| Vercel Pro | $20 | If bandwidth exceeds, switch to Railway ($5-20) |
| .gr domain | ~$1 | Wildcard subdomain for all stores |
| Resend (email) | $0-20 | Free tier: 3k emails/month, then $20 for 50k |
| **Total** | **~$50/month** | |

### Scaling Triggers

| When | Action | Cost Impact |
|------|--------|-------------|
| 500+ concurrent WS connections | Supabase handles it, extra $10/1k connections | +$5-10/mo |
| 100+ stores, heavy traffic | Upgrade Vercel or move to Railway/Hetzner | +$20-50/mo |
| 50k+ emails/month | Upgrade Resend plan | +$20/mo |
| Need SMS | Add Twilio (~$0.05/SMS) | Usage-based |

### SSE vs Supabase Realtime

Current implementation uses **SSE (Server-Sent Events)** with in-memory EventEmitter. This works but has a limitation: **it only works within a single server instance**. If Vercel routes requests to different serverless functions, SSE connections won't share state.

**Recommendation:** Migrate to **Supabase Realtime** (Postgres Changes) for order updates. This is database-driven, works across any number of server instances, and is included in your Pro plan. This should be done in Phase 1-2.

---

## Priority Summary

| Phase | Effort | Impact | Timeline |
|-------|--------|--------|----------|
| **Phase 0** (Blockers) | 2-3 weeks | Must-have | Before first customer |
| **Phase 1** (Revenue) | 3-4 weeks | High — enables billing & key features | First 3 months |
| **Phase 2** (Operations) | 4-6 weeks | Medium — polish & efficiency | Months 3-6 |
| **Phase 3** (Scale) | 4-6 weeks | Medium — handles growth | Months 6-12 |
| **Phase 4** (Growth) | Ongoing | Low-Medium — competitive moat | Year 2+ |

---

## The Bottom Line

You have a **seriously solid foundation**. The multi-tenant architecture, ordering flow, Stripe Connect, AADE invoicing, admin panel, and real-time updates are all built and working. Most competitors charge $10k-50k to build what you already have.

**To go live with your first paying customer, you need Phase 0 (2-3 weeks of work).** Everything else can be built iteratively while you're already making money.

The most important thing you're missing is **your own billing system** (Phase 1.1) — without it, you have a product but no business. Build that first after Phase 0.
