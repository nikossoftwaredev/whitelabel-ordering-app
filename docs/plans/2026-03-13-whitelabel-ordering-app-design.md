# White-Label Ordering App — Design Document

**Date:** 2026-03-13
**Status:** Approved

## Overview

A white-label ordering platform that coffee shops, souvlaki joints, and similar businesses can use as their own dedicated app. Each client gets a fully branded experience (custom domain, PWA install, future App Store listing) while sharing a single codebase and database. No "powered by" branding — the client's customers never know it's a platform.

## Multi-Tenant Architecture

### Strategy: Single codebase, single DB, tenant resolved by domain

```
Shared PostgreSQL Database (Supabase)
  ├── Tenant: Figata Cafe
  ├── Tenant: Souvlakia.gr
  └── Tenant: Future Client
         ▲
         │
  Single Next.js Deployment
  (resolves tenant by domain)
         │
  ├── order.figatacafe.gr    (ordering app)
  ├── menu.figatacafe.gr     (QR menu, view-only)
  └── order.figatacafe.gr/admin  (admin panel)
```

- Incoming request matches domain to tenant in DB
- Tenant config (logo, colors, name, domain) injected via CSS variables at layout level
- All components use semantic color tokens so they auto-adapt per tenant
- Every data query filters by `tenantId` — complete data isolation

### Branding & Ownership Feel

- Custom domains per client (their domain, not ours)
- PWA manifest generated per tenant (app icon = client logo, app name = client name, theme color = client color)
- Custom favicon, splash screen, OG images per tenant
- Zero platform branding visible to end users
- When Capacitor phase arrives: separate App Store listing per client

## Database Schema

### Core Models

```
Tenant (the store)
 ├── TenantConfig (branding, colors, logo, domain, PWA manifest config)
 ├── OperatingHours (per day of week, open/close times)
 ├── Category (menu categories, sortable)
 │    └── Product (items, sortable)
 │         ├── ProductImage[]
 │         └── ModifierGroup[] (e.g., "Choose size", "Add extras")
 │              └── ModifierOption[] (e.g., "Large +1euro", "Extra cheese +0.50euro")
 ├── Order
 │    ├── OrderItem[]
 │    │    └── OrderItemModifier[] (selected options)
 │    ├── Payment (stripe/cash, status, myAADE invoice ref)
 │    └── linked to Customer
 ├── Customer (per-tenant, linked to global User)
 │    └── Favorite[] (saved products for quick reorder)
 ├── Coupon (Stripe-powered promotions)
 └── Preset (pre-filled menu templates)

User (global, across all tenants)
 ├── TenantRole[] (userId + tenantId + role enum)
 └── Customer[] (per tenant)
```

### Role Hierarchy

- **SUPER_ADMIN** — platform owner, manages all tenants, sets branding
- **OWNER** — store owner, full access to their store
- **ADMIN** — store manager, menu/orders but not billing
- **CASHIER** — orders only (view, accept/reject, change status)

### Key Design Decisions

- **User is global** — one Google/magic link account works across all tenant apps
- **Customer is per-tenant** — order history, preferences, visit count scoped per store
- **TenantRole is a join table** — no separate StaffMember model, just User + Tenant + Role
- **Products have `sortOrder`** — drag-and-drop reordering in admin
- **ModifierGroups have `minSelect`/`maxSelect`/`isRequired`** — flexible configuration
- **Presets** — pre-filled menu templates ("Coffee Shop", "Souvlaki Shop") for fast onboarding

## Order Flow (Phase 1 — Pickup Only)

### Customer Flow

```
Browse Menu (search, dietary filters, favorites) -> Add to Cart -> Review Cart
  -> Login (Google/Magic Link) -> Choose Payment (Stripe embedded/Cash)
  -> Enter Promo Code (optional) -> Select Pickup Time -> Place Order -> Confirmation
```

**Menu features:**
- Search bar — filter products by name
- Dietary filter chips — Vegan, Vegetarian, Gluten-Free toggles
- Allergen badges on product cards (V, VG, GF, etc.)
- Favorite products — heart icon, saved per customer per tenant
- Order history — view past orders with "Reorder" button to re-add items to cart

### Pickup Time Logic

- Admin sets estimated prep time per store (e.g., 15 min)
- Customer picks: "ASAP" (now + prep time) or a specific future time
- Operating hours determine available slots
- Admin can temporarily pause orders

### Order Lifecycle

```
New -> Accepted (admin sets pickup time) -> Preparing -> Ready for Pickup -> Completed
  \-> Rejected (with reason)
```

### Customer Notifications

- Order accepted: "Your order will be ready at 14:30"
- Ready for pickup: "Your order is ready! Come pick it up"
- Rejected: "Sorry, your order was declined: {reason}"
- Via browser push notifications (PWA) + email fallback

## Payments

### Stripe Connect (Standard Accounts)

- Platform has one Stripe account
- Each tenant connects their own Stripe account via Stripe Connect
- Payments go directly to tenant's Stripe account
- Coupons/promotions via Stripe Promotion Codes per tenant

### Payment Flows

| Event | Action |
|-------|--------|
| Stripe payment | Charge captured -> myAADE invoice auto-uploaded -> order created |
| Cash on pickup | Order created (payment pending) -> admin marks paid -> myAADE invoice uploaded |
| Manual order (admin) | Admin enters items + customer -> marks paid -> myAADE invoice uploaded |

## QR Menu (View-Only)

- Separate subdomain: `menu.{client}.gr`
- Same product data as ordering app
- Browse categories, products, prices, images, descriptions
- "Order Now" CTA button linking to the ordering app / app store
- Fully branded per tenant
- We generate the QR code pointing to this URL

## Admin Panel

### Super Admin (Platform Owner)

- Tenant CRUD (create, configure, activate/deactivate)
- Set branding per tenant (logo, colors, domain, PWA config)
- Load presets for new tenants
- Cross-tenant stats (revenue, orders, active stores)
- Manage global preset templates

### Store Owner/Admin

| Section | Features |
|---------|----------|
| Dashboard | Today's orders, revenue, popular items, quick stats |
| Orders | Live feed with sound alert, accept/reject, status changes, filters |
| Menu | Categories/products CRUD, images, modifiers, drag-and-drop sort, availability toggles |
| Customers | Customer list, order history per customer, total spent, visits |
| Analytics | Revenue charts (daily/weekly/monthly), top products, peak hours |
| Invoicing | myAADE history, manual invoice creation, auto-invoice status |
| Settings | Operating hours, prep time, pause orders, pickup slots, Stripe connection |
| Staff | Invite by email, assign roles, remove |
| Promotions | Stripe coupons/promo codes, validity periods, usage stats |

### Cashier

- Orders section only

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL (Supabase) via Prisma |
| Auth | NextAuth + Google OAuth + Magic Link |
| Payments | Stripe Connect (Standard accounts) |
| Invoicing | myAADE API |
| Client State | Zustand |
| Server Data | React Query |
| UI | Tailwind CSS 4 + shadcn/ui + Lucide icons |
| i18n | next-intl (en, el) |
| File Uploads | Supabase S3 + sharp compression |
| Mobile | PWA first, Capacitor wrap later |
| Notifications | Browser Push API + service worker |
| Real-time | Supabase Realtime (live order updates) |

### Capacitor-Ready Practices (From Day One)

- Client-side data fetching via React Query for customer-facing pages
- Token-based auth flow portable to native
- Mobile-first responsive design (44px touch targets, safe area awareness)
- No SSR dependency for ordering flow
- Clean REST API layer consumable by both web and future native app

## Phased Rollout

### Phase 1 — Core Platform

- Multi-tenant schema + tenant resolution
- Auth (Google + Magic Link)
- Menu management (categories, products, modifiers, presets)
- Customer ordering flow (pickup)
- Stripe Connect payments + cash option
- Admin panel (orders, menu, dashboard, settings)
- QR menu page (view-only + order CTA)
- PWA support (manifest, service worker, installable)

### Phase 2 — Business Features

- myAADE invoice integration (auto + manual)
- Analytics dashboard
- Customer management
- Promotions/coupons (Stripe)
- Staff roles & permissions
- Super admin panel

### Phase 3 — Native & Expansion

- Capacitor native wrap (iOS + Android)
- Native push notifications
- Delivery option (address, zones, fees)
- Advanced analytics
