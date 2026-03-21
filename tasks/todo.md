# Implementation Plan — Whitelabel Ordering App

## Phase 1: Quick Wins

### 1. Tips / Gratuity
- [ ] Schema: Add `tipAmount` (Int, cents, default 0) field on Order
- [ ] Customer UI: Tip selector in checkout (0%, 5%, 10%, 15%, custom amount)
- [ ] Include tip in total calculation (subtotal + delivery fee + tip)
- [ ] Show tip in order confirmation + admin order details
- [ ] Tip goes to tenant's Stripe account (included in PaymentIntent amount)
- [ ] Admin dashboard: Show tips collected in stats

### 2. Email Notifications (Resend)
- [ ] Create email templates (order confirmation, status updates: accepted, ready, delivering, completed, rejected)
- [ ] Add `sendOrderConfirmation()` util — triggered after order creation
- [ ] Add `sendOrderStatusUpdate()` util — triggered on admin status change
- [ ] Include order details: items, total, estimated time, store info
- [ ] Use tenant branding (name, logo, colors) in emails
- [ ] Add admin setting to enable/disable email notifications per tenant

---

## Phase 2: Core Order Features

### 3. Order Scheduling
- [ ] Schema: Add `scheduledFor` (DateTime?) field on Order
- [ ] Customer UI: Toggle "Schedule for later" in checkout
- [ ] Customer UI: Date/time picker (only within operating hours, min 30min ahead)
- [ ] Validate scheduled time against tenant operating hours + timezone
- [ ] Show scheduled time in order confirmation page
- [ ] Admin: Show scheduled orders distinctly in order list (badge/filter)
- [ ] Admin: Sort/filter by scheduled time
- [ ] Email: Include scheduled time in confirmation email

### 4. Coupons / Promotions
- [ ] Schema: `PromoCode` model (code, type: PERCENTAGE/FIXED, value, minOrder, maxUses, usesCount, startDate, endDate, tenantId, active)
- [ ] Schema: `PromoCodeUsage` model (promoCodeId, customerId, orderId) to track per-customer usage
- [ ] API: CRUD endpoints for admin promo code management
- [ ] API: Validate promo code endpoint (check active, dates, usage limits, min order)
- [ ] Apply discount in order creation logic (server-side validation)
- [ ] Store discount amount on Order (add `discountAmount` field)
- [ ] Admin UI: Promo codes management page (create, list, edit, deactivate)
- [ ] Customer UI: Promo code input field in checkout with live validation
- [ ] Show discount breakdown in cart/checkout summary

---

## Phase 3: Address Overhaul (Big Task)

### 5. Full Address System (Map Pin + Details)
**Map with draggable pin:**
- [ ] Integrate Google Maps / Mapbox embed in address flow
- [ ] When user searches an address, move pin to exact location
- [ ] Allow user to drag/refine pin position ("Refine the pin to your door")
- [ ] Reverse-geocode pin position to update address text
- [ ] "All good?" confirmation step with Continue button
- [ ] Store final lat/lng from pin position (not just autocomplete)

**Address details form (after pin confirmation):**
- [ ] Location type selector: House, Apartment, Office, Other
- [ ] Conditional fields based on type:
  - Apartment: Entrance/Staircase, Floor, Apartment number
  - Office: Floor, Company name
  - House: (minimal extra fields)
- [ ] "How do we get in?" section with radio options:
  - Doorbell / Intercom
  - Door code (show text input for code)
  - Door is open
  - Other (show text input for instructions)
- [ ] Delivery instructions / notes text field
- [ ] Schema: Add fields to Address model (locationType, entrance, floor, apartmentNumber, accessMethod, accessDetails, deliveryInstructions)

**Integration:**
- [ ] Update address manager sheet with new 2-step flow (map → details)
- [ ] Show address details in checkout summary
- [ ] Pass address details to order (so driver sees floor, buzzer code, etc.)
- [ ] Admin: Show full address details in order view
- [ ] i18n: Translate all new labels (EN + EL)

### 6. Delivery Zone Validation
- [ ] Calculate actual distance from store to delivery address (using stored lat/lng)
- [ ] Compare against tenant's delivery range (km)
- [ ] Reject addresses outside delivery zone with clear error message
- [ ] Show delivery zone on map (optional: circle overlay)

---

## Phase 4: Loyalty & Rewards

### 7. Loyalty / Rewards System
- [ ] Schema: `LoyaltyProgram` model (tenantId, requiredOrders, rewardAmount cents, minOrderAmount?, active)
- [ ] Schema: `LoyaltyRedemption` model (customerId, programId, orderId, amount)
- [ ] Track completed order count per customer
- [ ] Admin UI: Loyalty settings page — configure "Every X orders -> Y EUR discount"
- [ ] Admin UI: Show ROI calculation preview:
  - "If avg order = 25 EUR, customer spends 250 EUR over 10 orders to earn 5 EUR = 2% effective discount"
  - Pull actual avg order value from tenant's data for real calculation
- [ ] Admin UI: Toggle loyalty program on/off
- [ ] Customer UI: Show loyalty progress ("3/10 orders — 7 more for 5 EUR reward!")
- [ ] Auto-apply or prompt to redeem at checkout when threshold reached
- [ ] Reset counter after redemption
- [ ] Admin: View customer loyalty status in customer list

---

## Phase 5: Admin & Ops

### 8. Analytics Dashboard
- [ ] Revenue chart (daily/weekly/monthly) with date range picker
- [ ] Orders chart (volume over time)
- [ ] Popular products breakdown (bar chart, not just top 5 list)
- [ ] Peak hours heatmap (when do most orders come in?)
- [ ] Average order value trend
- [ ] New vs returning customers
- [ ] Delivery vs pickup breakdown

### 9. Kitchen Display System (KDS)
- [ ] Dedicated fullscreen route (`/admin/kitchen`)
- [ ] Large cards showing order items, modifiers, notes
- [ ] Real-time SSE updates (new orders appear automatically)
- [ ] Status flow: NEW -> PREPARING -> READY (tap to advance)
- [ ] Timer showing how long each order has been waiting
- [ ] Color coding: green (on time), yellow (getting late), red (overdue)
- [ ] Sound notification for new orders
- [ ] Optimized for large screens / tablets in kitchen

### 10. Refund Processing
- [ ] Admin UI: "Refund" button on completed/rejected orders
- [ ] Partial refund option (select amount or items)
- [ ] Stripe Refund API integration
- [ ] Track refund status on order (refunded amount, date, reason)
- [ ] Email notification to customer on refund
- [ ] Dashboard: Show refunds in financial stats

---

## Phase 6: Engagement

### 11. Push Notifications (Browser)
- [ ] Service worker push notification handler
- [ ] Ask permission + store subscription in DB (PushSubscription model)
- [ ] Send push on order status changes (accepted, ready, delivering, completed)
- [ ] Admin: Send push to trigger (reuses same event as email notifications)
- [ ] Handle notification click → open order tracking page

---

## Cleanup
- [ ] Remove expenses page/route entirely (not needed)

---

## Priority Summary
| # | Feature | Complexity | Impact |
|---|---------|-----------|--------|
| 1 | Tips | Small | Medium |
| 2 | Email Notifications | Medium | High |
| 3 | Order Scheduling | Medium | High |
| 4 | Coupons/Promotions | Medium | High |
| 5 | Address Overhaul | Large | Critical |
| 6 | Delivery Zone Validation | Small | High |
| 7 | Loyalty/Rewards | Large | High |
| 8 | Analytics Dashboard | Medium | Medium |
| 9 | Kitchen Display (KDS) | Medium | High |
| 10 | Refund Processing | Medium | Medium |
| 11 | Push Notifications | Medium | Medium |
