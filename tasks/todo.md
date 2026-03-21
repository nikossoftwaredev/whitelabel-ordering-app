# Implementation Plan — Whitelabel Ordering App

## Phase 1: Quick Wins — DONE

### 1. Tips / Gratuity — DONE
- [x] Schema: `tipAmount` on Order
- [x] Customer UI: Tip selector in checkout
- [x] Include tip in total calculation
- [x] Show tip in order confirmation + admin order details
- [x] Tip goes to tenant's Stripe account
- [x] Email: tip included in confirmation

### 2. Email Notifications (Resend) — DONE
- [x] Resend integration with email templates
- [x] `sendOrderConfirmation()` + `sendOrderStatusUpdate()`
- [x] Order details in emails (items, total, estimated time, store info)
- [x] Triggered on order creation and admin status change

---

## Phase 2: Core Order Features — DONE

### 3. Order Scheduling — DONE
- [x] Schema: `scheduledFor` on Order
- [x] Customer UI: Schedule toggle with date/time picker
- [x] Min 30min advance validation
- [x] Scheduled time in confirmation + emails

### 4. Coupons / Promotions — DONE
- [x] Schema: `PromoCode` model with PERCENTAGE/FIXED types, usage limits, date ranges
- [x] API: CRUD + validate endpoints
- [x] Admin UI: Promo codes management page
- [x] Customer UI: Promo code input in checkout with live validation
- [x] Discount breakdown in cart/checkout

---

## Phase 3: Address Overhaul (Partially Done)

### 5. Full Address System (Map Pin + Details)
**Done:**
- [x] Google Places autocomplete integration
- [x] Address model with lat/lng, street, city, postalCode
- [x] Address manager sheet with add/delete/search
- [x] Browser geolocation support

**Remaining — Map with draggable pin:**
- [ ] Integrate Google Maps embed in address flow
- [ ] When user searches an address, show pin on map
- [ ] Allow user to drag/refine pin position ("Refine the pin to your door")
- [ ] Reverse-geocode pin position to update address text

**Remaining — Address details form:**
- [ ] Location type selector: House, Apartment, Office, Other
- [ ] Conditional fields (floor, entrance, apartment number, company name)
- [ ] Access method: Doorbell, Door code, Door is open, Other
- [ ] Delivery instructions / notes text field
- [ ] Schema: Add fields (locationType, entrance, floor, apartmentNumber, accessMethod, accessDetails, deliveryInstructions)

**Remaining — Integration:**
- [ ] Update address manager with 2-step flow (map -> details)
- [ ] Show address details in checkout summary
- [ ] Pass address details to order (driver sees floor, buzzer code, etc.)
- [ ] Admin: Show full address details in order view
- [ ] i18n: Translate all new labels (EN + EL)

### 6. Delivery Zone Validation
**Done:**
- [x] Schema: `deliveryRangeKm` on Tenant
- [x] Admin UI: Delivery range configuration

**Remaining:**
- [ ] Calculate actual distance from store to delivery address (using lat/lng)
- [ ] Reject addresses outside delivery zone with clear error message
- [ ] Show delivery zone on map (optional: circle overlay)

---

## Phase 4: Loyalty & Rewards — DONE

### 7. Loyalty / Rewards System — DONE
- [x] Schema: `LoyaltyRedemption` model, config fields on TenantConfig
- [x] Track completed order count per customer
- [x] Admin: Loyalty settings (requiredOrders, rewardAmount, toggle)
- [x] Customer UI: Loyalty progress + redemption at checkout
- [x] API: Eligibility, progress, and reward amount endpoint

---

## Phase 5: Admin & Ops (Partially Done)

### 8. Analytics Dashboard — DONE
- [x] Revenue + orders charts (7-day window)
- [x] Popular products breakdown
- [x] Peak hours analysis
- [x] Order type breakdown (delivery vs pickup)

### 9. Kitchen Display System (KDS) — DONE
- [x] Dedicated route (`/admin/kitchen`)
- [x] 3-column Kanban: NEW -> PREPARING -> READY
- [x] 30-second auto-refresh
- [x] Sound notifications (mute/unmute toggle)
- [x] Status transition buttons

### 10. Refund Processing — PARTIAL
**Done:**
- [x] Schema: `REFUNDED` payment status
- [x] Stripe dispute webhook handling (charge.dispute.created/closed)

**Remaining:**
- [ ] Admin UI: "Refund" button on completed/rejected orders
- [ ] Partial refund option (select amount or items)
- [ ] Stripe Refund API integration (manual refunds, not just disputes)
- [ ] Track refund details on order (amount, date, reason)
- [ ] Email notification to customer on refund
- [ ] Dashboard: Show refunds in financial stats

---

## Phase 6: Engagement — PARTIAL

### 11. Push Notifications (Browser) — PARTIAL
**Done:**
- [x] Service worker with push notification handler
- [x] PWA manifest

**Remaining:**
- [ ] VAPID keys setup
- [ ] Client-side subscription logic (ask permission, store subscription)
- [ ] Schema: `PushSubscription` model
- [ ] Server-side push sending on order status changes
- [ ] Handle notification click -> open order tracking page

---

## Phase 7: New Features

### 12. 1+1 Offers (BOGO) — DONE
- [x] Schema: `offerType`, `offerPrice`, `offerStart`, `offerEnd` fields on Product
- [x] Admin product form: toggle 1+1, set pair price, optional start/end dates
- [x] Menu display: 1+1 badge on product cards (popular + list), offer price with strikethrough
- [x] Product detail sheet: offer pricing, default quantity 2, min quantity 2
- [x] Cart store: BOGO pricing logic (pairs at offer price, remainder at regular)
- [x] Server-side validation: validate-cart.ts handles BOGO pricing securely
- [x] API routes: POST/PUT handle offer fields

### 13. Live Chat Support
- [ ] Schema: `ChatConversation` model (tenantId, customerId, status: OPEN/CLOSED, createdAt)
- [ ] Schema: `ChatMessage` model (conversationId, senderId, senderRole: CUSTOMER/STAFF, content, createdAt, readAt)
- [ ] Customer UI: Chat button on order page, opens chat sheet/dialog
- [ ] Customer: Send messages, see store replies in real-time
- [ ] Admin UI: Chat inbox showing all active conversations
- [ ] Admin: Multi-chat support (switch between conversations)
- [ ] Admin: Mark conversations as resolved/closed
- [ ] Real-time: SSE or polling for new messages (both sides)
- [ ] Notifications: Browser notification sound for new messages (admin side)
- [ ] Notifications: Unread count badge on chat icon (customer + admin)
- [ ] i18n: Translate chat labels (EN + EL)

---

## Cleanup
- [x] Remove expenses page/route entirely — removed orphaned translation keys
- [x] Store info dialog — replaced bottom Sheet with global Dialog, prominent phone CTA

---

## Cleanup: Extract Reusable Components

### 14. Identify and Extract Shared Components
- [ ] Audit codebase for similar/duplicate component patterns
- [ ] Extract shared components (e.g. status badges, price formatters, order cards, section headers, empty states)
- [ ] Replace inline duplicates with the extracted components
- [ ] Keep it pragmatic — only extract where 3+ usages exist, no over-engineering

---

## What's Left — Priority Summary
| # | Feature | Complexity | Status |
|---|---------|-----------|--------|
| 5 | Address Overhaul (map + details) | Large | Partial — needs map pin + detail fields |
| 6 | Delivery Zone Validation | Small | Partial — needs distance calculation |
| 10 | Refund Processing | Medium | Partial — needs manual refund UI + Stripe API |
| 11 | Push Notifications | Medium | Partial — needs subscription + sending logic |
| 13 | Live Chat Support | Large | Not started |
