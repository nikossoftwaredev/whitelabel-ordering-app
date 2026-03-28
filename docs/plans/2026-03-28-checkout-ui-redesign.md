# Checkout UI Redesign — 2026-03-28

## Goal
Polish the checkout screen with three targeted changes inspired by efood's UX:
1. Address card with Google Maps Static thumbnail
2. Order summary collapsed to a total row + "Ανάλυση παραγγελίας" bottom drawer
3. Fixed footer with legal/allergen text above the submit button

## Scope (Approach C — Hybrid)

### 1. Address Card (`checkout-address-card.tsx`)
- Add a Google Maps Static API thumbnail (72×72, rounded-lg) on the left
- URL: `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size=144x144&scale=2&key=NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Fallback: styled placeholder (muted bg + MapPin icon) when no coordinates
- Layout: `[map thumbnail] [street bold / city muted] [ChevronRight]`
- Tapping still opens the existing address-manager dialog

### 2. Summary Card → Total Row + Drawer (`checkout-summary-card.tsx`)
- Remove the bordered card box
- Show two inline rows (no box):
  - `Σύνολο πληρωμής` | `{total} €` (bold)
  - `Ανάλυση παραγγελίας >` (small, muted, tappable)
- Tapping "Ανάλυση παραγγελίας >" opens a shadcn `Sheet` (side=bottom)
- Sheet content: full breakdown (subtotal, promo discount, coupon discount, group discount, delivery fee, tip, total)
- Sheet has a drag handle, closes on backdrop tap

### 3. Fixed Footer (`checkout-submit-button.tsx`)
- Add a legal text band above the button inside the fixed footer
- Legal copy (Greek, placeholder):
  - "Με την υποβολή της παραγγελίας αποδέχεσαι τους **Όρους Χρήσης** και την **Πολιτική Απορρήτου** μας."
  - Terms and Privacy Policy are `<a>` links (href="#" placeholder, configurable later)
- Allergen icon (ⓘ) on the left of the legal line; tapping opens a `Popover` with:
  - "Πληροφορίες για αλλεργιογόνα: Τα προϊόντα μας ενδέχεται να περιέχουν αλλεργιογόνα. Για πλήρη λίστα επικοινωνήστε με το κατάστημα."
- Button remains unchanged (brand variant, full width, shows total)

## Files to Change
| File | Change |
|------|--------|
| `components/order/checkout/checkout-address-card.tsx` | Add map thumbnail, new layout |
| `components/order/checkout/checkout-summary-card.tsx` | Collapse to total row + drawer trigger + Sheet |
| `components/order/checkout/checkout-submit-button.tsx` | Add legal text band with allergen popover |

## Files NOT Changed
- `checkout-form.tsx` — layout/ordering untouched
- `checkout-coupon-card.tsx` — already good
- `checkout-payment-card.tsx` — already good
- All other checkout sub-components

## Env
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — already set in `.env`

## Non-Goals
- No new API routes
- No schema/DB changes
- No new Zustand stores
- Real terms/privacy URLs are out of scope (placeholder `#` links)
