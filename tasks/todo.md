# Implementation Plan — Whitelabel Ordering App

## Remaining Tasks

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

### 14. Extract Reusable Components — NOT STARTED
- [ ] `EmptyState` — icon + title + description (4+ duplications across admin pages)
- [ ] `UserAvatar` — image with initials fallback (3 duplications)
- [ ] `PageHeader` — title + description section header (7+ duplications)
- [ ] `PaginationControls` — prev/next with page count (3 duplications)

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

## Priority Summary
| # | Feature | Complexity | Status |
|---|---------|-----------|--------|
| 5 | Address Overhaul (map + details) | Large | **Done** |
| 11 | Push Notifications | Medium | **Done** |
| 13 | Live Chat Support | Large | Not started |
| 14 | Extract Reusable Components | Small | Not started |
| 15 | PWA Back Button Dialog Handling | Small | **Done** |
| 16 | Product Popularity Tracking & Display | Medium | **Done** |
| 17 | Phone Input Component | Small | **Done** |
| 18 | Kanban Board for Admin Orders | Large | **Done** |
