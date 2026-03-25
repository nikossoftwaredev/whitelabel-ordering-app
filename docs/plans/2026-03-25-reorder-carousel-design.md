# Reorder Carousel Design

**Goal:** Let returning customers quickly reorder from their last 5 orders via a horizontal carousel at the top of the menu page.

**Position:** Above "Most Popular" section in order-menu.tsx. Hidden if user is not authenticated or has no previous orders.

---

## Data Flow

1. Update `/api/tenants/[tenantSlug]/orders/history` to return `productId`, `productImage`, and `modifiers` (modifierOptionId, name, priceAdjustment) per item
2. Add `forReorder=true` query param — filters to only completed/delivered orders
3. Client fetches `?limit=5&forReorder=true` on mount (only if authenticated)
4. On "+" click, loop through order items, validate each `productId` against menu data already loaded in page
5. Skip unavailable items silently (product inactive or deleted)
6. Add valid items to cart via `cart.addItem()`
7. Show toast: "Added X items to cart" or "X of Y items added — some items unavailable"

## UI

- Section title: "Order Again" (i18n: `orderAgain` key)
- Horizontal ScrollArea (shadcn) with max 5 cards
- Card: `bg-card border rounded-lg`, fixed ~180px width
  - Top: truncated item list ("1x Greek Salad, 2x Souvlaki, +1 more")
  - Bottom: total price (left), circular `+` button (right)
  - `+` button: `bg-primary text-primary-foreground rounded-full`
- Theme-agnostic — uses semantic colors only
- Hidden entirely when no data (no empty state)

## Decisions

- Skip unavailable items silently (Option A)
- Fix API to return productId + modifiers (not match by name)
- Use existing menu data for availability check (no extra API call)
- Also fixes the broken reorder button on order-history.tsx page
