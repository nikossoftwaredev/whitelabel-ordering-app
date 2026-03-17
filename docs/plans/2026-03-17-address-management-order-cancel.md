# Address Management, Header Redesign & Order Cancellation

**Date:** 2026-03-17

## Summary

Three features:
1. **Header redesign** — address selector top-left, new cart icon, profile right of cart
2. **Address management** — CRUD addresses per customer with Google Maps Places + geolocation
3. **Order cancellation** — customer can cancel orders before acceptance

## 1. Header Redesign

### Current
```
[Logo + Store Name]  [spacer]  [User Dropdown] [Cart]
```

### New
```
[📍 Address ▼]  [spacer]  [🛍️ Cart badge] [👤 Profile]
```

- Address selector opens bottom sheet with saved addresses
- Cart icon changes from `ShoppingBasket` to `ShoppingBag` (Lucide)
- Profile moves to right of cart
- Logo/store name stays in store hero section only

## 2. Address Model

### Prisma Schema
```prisma
model Address {
  id         String   @id @default(cuid())
  customerId String   @map("customer_id")
  label      String   @default("Home")
  street     String
  city       String?
  postalCode String?  @map("postal_code")
  country    String?
  lat        Float?
  lng        Float?
  isDefault  Boolean  @default(false) @map("is_default")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@map("addresses")
}
```

Customer gets `addresses Address[]` relation.

### API Routes
- `GET /api/tenants/[slug]/addresses` — list customer addresses
- `POST /api/tenants/[slug]/addresses` — create address
- `PUT /api/tenants/[slug]/addresses/[id]` — update address
- `DELETE /api/tenants/[slug]/addresses/[id]` — delete address

### Address Input Methods
1. **Google Maps Places Autocomplete** — search with suggestions
2. **Use current location** — browser Geolocation API + Nominatim reverse geocode
3. Both auto-fill fields, user picks label (Home/Work/Custom) and saves

### Zustand Store
- `address-store.ts` — tracks selected address for current session
- Initializes from customer's default address

### Env Variable
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

## 3. Order Cancellation

- New enum value: `CANCELLED` added to `OrderStatus`
- Customer can cancel only if `status = NEW`
- No automatic Stripe refund — handled manually by store
- Cancel button on order confirmation page and order history
- Admin sees cancelled orders in rejected tab

### API
- `PATCH /api/tenants/[slug]/orders/[id]` with `{ status: "CANCELLED" }`
- Server validates current status is `NEW` before allowing

## Implementation Order

1. Prisma schema changes (Address model + CANCELLED status)
2. Migration
3. Address API routes (CRUD)
4. Address Zustand store
5. Address manager UI (sheet with list + add form)
6. Header redesign (address selector, new icons, profile position)
7. Order cancellation API logic
8. Cancel button in order confirmation + order history
9. Admin panel: show cancelled orders
