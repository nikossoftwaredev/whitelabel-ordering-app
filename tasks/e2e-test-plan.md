# E2E Test Plan (Playwright)

Comprehensive end-to-end test plan for the whitelabel ordering app.

---

## 1. Authentication

- [ ] Sign in with Google OAuth
- [ ] Sign in with magic link email
- [ ] Session persists across page navigation
- [ ] Sign out clears session
- [ ] Unauthenticated user cannot access `/order/checkout`
- [ ] Unauthenticated user cannot access `/order/orders`
- [ ] Unauthenticated user cannot access `/order/profile`
- [ ] Non-admin user cannot access `/admin/*` routes (redirected)
- [ ] CASHIER cannot access staff/settings pages
- [ ] SUPER_ADMIN redirected to `/admin/super/tenants`

---

## 2. Menu Browsing (Guest)

- [ ] Landing page loads and shows store info
- [ ] Menu page displays all active categories
- [ ] Clicking a category scrolls to / filters its products
- [ ] Product cards show name, price, image
- [ ] Clicking a product opens product detail sheet
- [ ] Product detail shows description, modifiers, allergens, dietary flags
- [ ] Required modifier group enforces min/max selection
- [ ] Optional modifier group allows 0 selections
- [ ] Price updates dynamically when modifiers are toggled
- [ ] "Add to Cart" adds item with selected modifiers
- [ ] Greek locale (`/el/order`) shows translated product names (`nameEl`)

---

## 3. Cart

- [ ] Cart icon shows item count badge
- [ ] Opening cart sheet shows all items with quantities and prices
- [ ] Increase quantity updates price
- [ ] Decrease quantity to 0 removes item
- [ ] Trash icon removes item
- [ ] Cart subtotal is correct
- [ ] Cart persists across page refreshes (localStorage)
- [ ] Switching tenant slug clears cart automatically
- [ ] "Proceed to checkout" navigates to checkout page
- [ ] Empty cart shows empty state with "Back to Menu" link

---

## 4. Checkout — Pickup Flow

- [ ] Checkout page requires authentication (shows sign-in if not logged in)
- [ ] Pickup is the default order type
- [ ] Pickup location section shows store name and estimated time
- [ ] Customer name is prefilled from session
- [ ] Customer email is prefilled from session
- [ ] Customer phone is prefilled from saved profile
- [ ] Submitting without name shows error toast
- [ ] Submitting without phone shows error toast
- [ ] Selecting CASH payment and submitting creates order
- [ ] Order success redirects to confirmation page with orderId & orderNumber
- [ ] Cart is cleared after successful order

---

## 5. Checkout — Delivery Flow

- [ ] Toggling to "Delivery" shows delivery address section
- [ ] **Submitting without selecting an address shows error toast and blocks submit**
- [ ] Tapping address area opens AddressManagerSheet
- [ ] After selecting an address, it displays label + street + city
- [ ] "Change" link re-opens address sheet
- [ ] `deliveryAddress` string is included in the order body
- [ ] Delivery fee row appears in summary section
- [ ] Order is created with `orderType: "DELIVERY"` and `deliveryAddress` field

---

## 6. Checkout — Stripe Payment

- [ ] Selecting "Card" payment method shows Stripe option
- [ ] Submitting with card creates order then opens Stripe payment dialog
- [ ] Stripe Elements loads and accepts test card (4242...)
- [ ] Successful payment redirects to confirmation page
- [ ] Failed payment shows error in dialog
- [ ] 3D Secure flow (test card 4000000000003220) completes correctly
- [ ] Refreshing during payment reuses existing PaymentIntent (idempotency)
- [ ] Orders below €0.50 are rejected for card payment

---

## 7. Store Status & Guards

- [ ] When store is closed (outside operating hours), checkout shows closed alert
- [ ] Submit button is disabled when store is closed
- [ ] API returns 403 when creating order during closed hours
- [ ] When store is paused (`isPaused: true`), checkout shows paused message
- [ ] API returns 503 when creating order while paused
- [ ] Overnight hours work correctly (e.g., 18:00–02:00)
- [ ] Timezone is respected (tenant timezone, not browser timezone)
- [ ] `StoreClosedBanner` appears on menu page when closed

---

## 8. Order Confirmation & Tracking

- [ ] Confirmation page shows order number
- [ ] Progress steps show for pickup: Received → Accepted → Preparing → Ready
- [ ] Progress steps show for delivery: Received → Accepted → Preparing → Ready → Delivering
- [ ] Initial status is NEW ("Waiting for the store to accept...")
- [ ] SSE connection is established to `/api/tenants/[slug]/orders/[orderId]/stream`
- [ ] When admin accepts, status updates to ACCEPTED in real-time
- [ ] When admin marks preparing, status updates to PREPARING
- [ ] When admin marks ready, status updates to READY
- [ ] Delivery order: when admin marks "Out for Delivery", status updates to DELIVERING
- [ ] When admin completes, status updates to COMPLETED with success message
- [ ] When admin rejects, page shows declined state with reason
- [ ] "Back to Menu" link works from completed/rejected states

---

## 9. Active Order Banner

- [ ] Banner appears on menu page when user has an active order
- [ ] Banner shows order number and current status
- [ ] Banner updates in real-time via polling
- [ ] Tapping banner navigates to order confirmation/tracking page
- [ ] Banner disappears after order is COMPLETED or REJECTED

---

## 10. Order History

- [ ] Shows list of past orders sorted by date (newest first)
- [ ] Each order shows number, status badge, total, date, items
- [ ] "Reorder" adds all items from a past order to cart
- [ ] "Cancel" button appears only on NEW orders
- [ ] Cancelling a NEW order updates status to CANCELLED
- [ ] Cannot cancel ACCEPTED/PREPARING/READY orders
- [ ] Empty state shows when no orders exist

---

## 11. Customer Profile

- [ ] Profile page shows current name, email, phone
- [ ] Email is read-only
- [ ] Updating name and phone saves successfully
- [ ] Phone saved on profile is prefilled in checkout next time

---

## 12. Address Management

- [ ] AddressManagerSheet opens from checkout and profile
- [ ] Add new address with label, street, city, postal code
- [ ] Edit existing address
- [ ] Delete address
- [ ] Set default address
- [ ] Selected address persists in Zustand store (localStorage)
- [ ] Geolocation button populates lat/lng (when browser supports it)

---

## 13. Favorites

- [ ] Heart icon toggles favorite on product card
- [ ] Favorited products show filled heart
- [ ] Favorites persist across sessions (server-side)
- [ ] Favorites are per-tenant

---

## 14. Admin — Dashboard

- [ ] Dashboard shows today's revenue and order count
- [ ] Active orders count is correct
- [ ] Week revenue is calculated correctly
- [ ] Popular products list shows top 5 by quantity
- [ ] Recent orders list shows last 5 orders
- [ ] REJECTED orders are excluded from revenue calculations

---

## 15. Admin — Order Management

- [ ] Order list loads with all orders
- [ ] Filter by status (NEW, ACCEPTED, PREPARING, READY, etc.)
- [ ] Clicking order shows full details (items, modifiers, customer info)
- [ ] Accept order → sets status to ACCEPTED, sets `estimatedReadyAt`
- [ ] **Accept with custom prep time (number input, default = store's prepTimeMinutes)**
- [ ] Mark as PREPARING
- [ ] Mark as READY
- [ ] **Delivery order: "Out for Delivery" button appears at READY status**
- [ ] Mark as DELIVERING (delivery orders)
- [ ] Mark as COMPLETED
- [ ] Cash order: payment status set to PAID on completion
- [ ] Reject order with reason
- [ ] Invalid transitions return 400 (e.g., NEW → READY)
- [ ] SSE: new order notification appears in real-time
- [ ] SSE: status change updates order list in real-time
- [ ] Manual order creation works

---

## 16. Admin — Menu Management

### Categories
- [ ] List all categories with sort order
- [ ] Create category with name (EN + EL), description, image
- [ ] Edit category
- [ ] Delete category (blocked if it has products)
- [ ] Drag-to-reorder categories

### Products
- [ ] List products within categories
- [ ] Create product with all fields (name, nameEl, description, price, image)
- [ ] Set dietary flags (vegan, vegetarian, gluten-free, dairy-free, spicy)
- [ ] Set allergens text
- [ ] Attach modifier groups to product
- [ ] Upload product image (auto-compressed to WebP)
- [ ] Edit product
- [ ] Delete product
- [ ] Toggle product active/inactive
- [ ] Inactive products don't appear on customer menu

### Modifier Groups
- [ ] Create modifier group with name, required flag, min/max
- [ ] Add modifier options with name and price adjustment
- [ ] Edit modifier group and options
- [ ] Delete modifier group
- [ ] Default option is preselected on product detail

---

## 17. Admin — Settings

- [ ] Load current settings on page open
- [ ] Update store name
- [ ] Toggle pause ordering on/off
- [ ] Set default prep time (minutes)
- [ ] Set minimum order amount
- [ ] Enable/disable delivery
- [ ] Set delivery fee
- [ ] Set free delivery threshold
- [ ] Set delivery range (km)
- [ ] Configure operating hours per day (open time, close time, closed toggle)
- [ ] Set timezone
- [ ] Update store config (logo, cover image, description, colors)
- [ ] Update social links (Instagram, Facebook, Google Place ID)
- [ ] Update currency (saved to Tenant, not TenantConfig)
- [ ] Settings save persists and reloads correctly

---

## 18. Admin — Staff Management

- [ ] List current staff with roles
- [ ] Add staff member by email (must be existing user)
- [ ] Assign ADMIN or CASHIER role
- [ ] Remove staff member
- [ ] Only OWNER role can access staff management
- [ ] Cannot add same user twice

---

## 19. Admin — Customers

- [ ] List customers with order count and total spent
- [ ] Search/filter customers
- [ ] Customer stats update after new orders

---

## 20. Admin — Invoices (AADE/myDATA)

- [ ] List invoices with search
- [ ] Create invoice from existing order
- [ ] Auto-generated invoice sequence number
- [ ] Transmit invoice to AADE
- [ ] Cancel AADE invoice
- [ ] View invoice details and status
- [ ] Cannot create duplicate invoice for same order

---

## 21. Internationalization (i18n)

- [ ] `/en/order` shows English translations
- [ ] `/el/order` shows Greek translations
- [ ] Switching locale via LanguageSwitcher updates URL and content
- [ ] Product names show `nameEl` in Greek locale
- [ ] Category names show translated names in Greek locale
- [ ] All checkout labels/buttons are translated
- [ ] Order confirmation messages are translated
- [ ] Admin pages use correct translations
- [ ] Invalid locale returns 404

---

## 22. Multi-Tenant

- [ ] Tenant resolves from subdomain (e.g., `store1.example.com`)
- [ ] Tenant resolves from slug in URL path
- [ ] Menu shows only products for the current tenant
- [ ] Orders are scoped to current tenant
- [ ] Customers are per-tenant records
- [ ] Admin can only manage their own tenant's data
- [ ] Inactive tenant returns 404
- [ ] Switching between tenants clears cart

---

## 23. PWA

- [ ] `/api/manifest` returns valid manifest JSON with tenant branding
- [ ] Install prompt appears on mobile
- [ ] App opens in standalone mode after install
- [ ] Theme color matches tenant config

---

## 24. Stripe Webhooks

- [ ] `payment_intent.succeeded` webhook updates order `paymentStatus` to PAID
- [ ] `payment_intent.payment_failed` webhook is handled gracefully
- [ ] Webhook signature validation rejects invalid requests

---

## 25. Edge Cases & Error Handling

- [ ] Adding a product that was deleted/deactivated since page load shows error
- [ ] Submitting order with out-of-stock product shows validation error
- [ ] Network failure during checkout shows appropriate error toast
- [ ] Double-clicking submit doesn't create duplicate orders (loading state disables button)
- [ ] Very long notes/addresses are truncated or validated (500 char limit)
- [ ] Price mismatch between client and server is caught by `validateCart`
- [ ] Expired session during checkout redirects to sign-in
- [ ] Admin updating order that was already updated shows conflict

---

## Setup Notes

### Test Users
- Customer user (Google OAuth or seeded)
- Admin/Owner user with tenant role
- Cashier user with limited permissions
- Super Admin user

### Test Data
- At least 2 tenants with different settings
- Categories with products and modifier groups
- Operating hours covering open/closed/overnight scenarios

### Environment
- Use Playwright test fixtures for auth state
- Mock Stripe with test keys (`pk_test_*`, `sk_test_*`)
- Mock AADE API for invoice tests
- Use test database (seeded before each run)
- SSE tests may need `page.waitForEvent` or polling assertions
