# Implementation Plan — Whitelabel Ordering App

## Active Tasks

### 19. Reorder Card → Cart Selector Refactor — NOT STARTED

- [ ] Refactor "Order Again" card so clicking opens a sheet/modal instead of adding all items blindly
- [ ] Show previously ordered items as a mini-cart with checkboxes/toggles
- [ ] Allow user to select which items to add to current cart
- [ ] Allow quantity adjustment per item
- [ ] Handle unavailable products gracefully (greyed out, unselectable)
- [ ] Preserve modifier selections from original order
- [ ] "Add Selected to Cart" confirmation button
- [ ] i18n: Translate new labels (EN + EL)

---

## Completed Tasks

### 5. Full Address System (Map Pin + Details) — DONE

- [x] Google Places autocomplete integration
- [x] Address model with lat/lng, street, city, postalCode
- [x] Address manager sheet with add/delete/search
- [x] Browser geolocation support
- [x] Google Maps embed with draggable pin (via @vis.gl/react-google-maps)
- [x] Reverse-geocode pin position to update address text
- [x] Location type selector: House, Apartment, Office, Other
- [x] Conditional fields (floor, entrance, apartment number, company name)
- [x] Access method: Doorbell, Door code, Door is open, Other
- [x] Delivery instructions / notes text field
- [x] Schema: Address detail fields + Order deliveryAddressDetails JSON
- [x] 2-step flow: search → map + details form
- [x] Pass delivery address details JSON to order creation
- [x] Admin: Show structured delivery details in order view
- [x] i18n: All new labels (EN + EL)

---

### 11. Push Notifications (Browser) — DONE

- [x] Service worker with push notification handler
- [x] PWA manifest
- [x] VAPID keys setup
- [x] Client-side subscription logic (usePushSubscription hook)
- [x] Schema: `PushSubscription` model + migration
- [x] Subscribe/unsubscribe API routes
- [x] Server-side push sending on order create (admin) + status change (customer)
- [x] Handle notification click -> open order tracking page
- [x] Admin: bell toggle in header to enable/disable push
- [x] Customer: soft-prompt on order confirmation page
- [x] PWA install banner fix (native Chrome mini-infobar)
- [x] Offline fallback page
- [x] Maskable icon for adaptive Android icons

---

### 13. Live Chat Support — NOT STARTED

- [ ] Schema: `ChatConversation` + `ChatMessage` models
- [ ] Customer UI: Chat button on order page, opens chat sheet/dialog
- [ ] Customer: Send messages, see store replies in real-time
- [ ] Admin UI: Chat inbox showing all active conversations
- [ ] Admin: Multi-chat support (switch between conversations)
- [ ] Admin: Mark conversations as resolved/closed
- [ ] Real-time: SSE or polling for new messages (both sides)
- [ ] Notifications: Browser notification sound + unread count badge
- [ ] i18n: Translate chat labels (EN + EL)

---

### 14. Extract Reusable Components — DONE

- [x] `EmptyState` — icon + title + description (`components/empty-state.tsx`)
- [x] `UserAvatar` — image with initials fallback (`components/user-avatar.tsx`)
- [x] `PageHeader` — title + description section header (`components/page-header.tsx`)
- [x] `PaginationControls` — prev/next with page count (`components/pagination-controls.tsx`)

---

### 15. PWA Back Button Dialog Handling — DONE

- [x] Intercept browser back button / Android back gesture in PWA mode
- [x] If a dialog/sheet is open, close it instead of navigating back
- [x] Use History API (`pushState`/`popstate`) to manage dialog state
- [x] Apply to all dialogs, sheets, and modals globally
- [x] Dialog stack system with back arrow navigation
- [x] Button loading/icon props for API call feedback

---

### 16. Product Popularity Tracking & Display — DONE

- [x] Query top 5 products by order volume (last 7 days) via `orderItem.groupBy` in menu API
- [x] Return `popularProductIds` from menu endpoint
- [x] Show "Most Popular" section on order menu with real data (replaced carousel)
- [x] Rank badges (Flame icon + "Xo in orders") on top 3 products
- [x] i18n: Translate labels (EN + EL)

---

### 17. Phone Input Component — DONE

- [x] Reusable PhoneInput with 58 countries, searchable popover, flag + dial code
- [x] Integrated in checkout form, profile page, profile prompt sheet
- [x] Stores full international number (e.g., +306912345678)

---

### 18. Kanban Board for Admin Orders — DONE

- [x] Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- [x] VALID_TRANSITIONS map in status-config.ts
- [x] Shared order types extracted to components/admin/orders/types.ts
- [x] OrderBoard component with 8 columns, drag-and-drop
- [x] OrderDetailSheet for full order view on card click
- [x] View toggle (board/list) persisted to localStorage
- [x] Polish: drop indicators, empty states, column header colors

---

### 20. Coupon System (Replacing Loyalty) — DONE

- [x] Coupon model with MILESTONE, MANUAL, RECURRING sources
- [x] Admin management UI (`components/admin/coupons/coupon-management.tsx`)
- [x] Customer-facing coupon modal in checkout (`components/order/checkout/coupon-modal.tsx`)
- [x] Validation logic (`lib/coupons/validate.ts`) — ownership, expiry, min order, max discount
- [x] Auto-generated milestone coupons on spending/order count thresholds
- [x] Configurable per tenant via TenantConfig (type, value, expiry, limits)
- [x] E2E test coverage (`e2e/coupons.spec.ts`)

---

### 21. Promo Code Management — DONE

- [x] Admin CRUD for promo codes (`components/admin/promo-codes/promo-code-management.tsx`)
- [x] Validation endpoint at `/api/tenants/[tenantSlug]/promo-codes/validate`
- [x] Fixed and percentage discount support

---

### 22. Customer Groups & Discounts — DONE

- [x] `CustomerGroup` and `CustomerGroupMember` models in schema
- [x] API routes at `/api/admin/[tenantId]/customer-groups/` with member management
- [x] Discount types: FIXED or PERCENTAGE with min order and max discount caps
- [x] `calculateBestGroupDiscount()` in `lib/groups/discount.ts`
- [x] Auto-applied at checkout if customer is in eligible group

---

### 23. Analytics V2 (Detail Dialog + PDF Export) — DONE

- [x] Analytics charts with recharts (revenue, orders, order types, peak hours)
- [x] Detail dialog with tabs and date range filtering (`analytics-detail-dialog.tsx`)
- [x] Date presets: today, last 7 days, this/last month, this/last year, custom (`lib/general/date-presets.ts`)
- [x] PDF export via html2canvas + jsPDF (`lib/general/pdf-export.ts`)
- [x] Calendar component for custom date ranges (`components/ui/calendar.tsx`)
- [x] API routes: `/api/admin/[tenantId]/analytics/` and `.../detailed/`
- [x] E2E test coverage (`e2e/analytics-detail.spec.ts`)

---

### 24. Scheduled Orders UI — DONE

- [x] Collapsible schedule selector in checkout (`checkout-schedule-card.tsx`)
- [x] Standard vs "Schedule for Later" toggle
- [x] Today/Tomorrow date selection with 30-min time slot picker
- [x] Backend validation enforces 30min minimum delay

---

### 25. Tips UI — DONE

- [x] Tip selector component (`checkout-tip-chips.tsx`)
- [x] Preset options: No Tip, €0.50, €1.00, €1.50, €2.00, Custom
- [x] Custom tip input with validation (0–100 range)

---

### 26. Refund Processing — DONE

- [x] Full/partial refund endpoint at `/api/admin/[tenantId]/orders/[orderId]/refund/`
- [x] Stripe refund API integration
- [x] Order tracks `refundAmount`, `refundedAt`, `refundReason`, `stripeRefundId`
- [x] Validates PAID state before refunding
- [x] Sends refund notification email to customer

---

### 27. Real-Time Order Tracking — DONE

- [x] Active order banner with Supabase Realtime (broadcast channel)
- [x] Polling fallback for reliability
- [x] Animated status progression: NEW → ACCEPTED → PREPARING → READY
- [x] Shows current status, estimated ready time, price
- [x] Dismissible UI with status-based colors

---

### 28. Stripe Connect Onboarding — DONE

- [x] Full Express account creation flow at `/api/admin/[tenantId]/stripe/connect/`
- [x] OAuth redirect to Stripe onboarding
- [x] Stores `stripeAccountId` and `stripeOnboarded` status
- [x] Returns account capabilities (chargesEnabled, payoutsEnabled)

---

### 29. Stripe Webhooks — DONE

- [x] Handles `payment_intent.succeeded`, `payment_intent.payment_failed`
- [x] Handles `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
- [x] Auto-updates order status based on webhook events

---

### 30. Quantity Stepper Component — DONE

- [x] 3 variants: "overlay" (on images), "inline" (in lists), "detail" (product sheet)
- [x] Collapsible minus button, shake animation on add
- [x] Used in cart-sheet, order-menu, product-detail-sheet, checkout-items-list

---

### 31. Reorder Carousel — DONE

- [x] Horizontal scroll showing last 5 completed orders
- [x] Item summary with product image, count, and total
- [x] One-tap "Order Again" adds items to cart
- [x] Filters out unavailable products, preserves modifiers
- [x] Toast notification on successful reorder

---

## Priority Summary

| #      | Feature                                   | Complexity | Status          |
| ------ | ----------------------------------------- | ---------- | --------------- |
| **19** | **Reorder Card → Cart Selector Refactor** | **Medium** | **Not started** |
| **13** | **Live Chat Support**                     | **Large**  | **Not started** |
| 5      | Address Overhaul (map + details)          | Large      | **Done**        |
| 11     | Push Notifications                        | Medium     | **Done**        |
| 14     | Extract Reusable Components               | Small      | **Done**        |
| 15     | PWA Back Button Dialog Handling           | Small      | **Done**        |
| 16     | Product Popularity Tracking & Display     | Medium     | **Done**        |
| 17     | Phone Input Component                     | Small      | **Done**        |
| 18     | Kanban Board for Admin Orders             | Large      | **Done**        |
| 20     | Coupon System                             | Large      | **Done**        |
| 21     | Promo Code Management                     | Medium     | **Done**        |
| 22     | Customer Groups & Discounts               | Medium     | **Done**        |
| 23     | Analytics V2 (Detail + PDF Export)        | Large      | **Done**        |
| 24     | Scheduled Orders UI                       | Small      | **Done**        |
| 25     | Tips UI                                   | Small      | **Done**        |
| 26     | Refund Processing                         | Medium     | **Done**        |
| 27     | Real-Time Order Tracking                  | Medium     | **Done**        |
| 28     | Stripe Connect Onboarding                 | Medium     | **Done**        |
| 29     | Stripe Webhooks                           | Medium     | **Done**        |
| 30     | Quantity Stepper Component                | Small      | **Done**        |
| 31     | Reorder Carousel                          | Medium     | **Done**        |
