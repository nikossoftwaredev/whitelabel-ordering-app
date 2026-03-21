# Store Info Dialog Design

## Goal

Replace the current bottom Sheet for store information (Πληροφορίες καταστήματος) with a global Dialog. The phone number must be the most prominent element so users can quickly call the store.

## Structure (top to bottom)

1. **Header** — Store name as dialog title, description as subtitle
2. **Call CTA (hero)** — Full-width primary button with Phone icon + number. `tel:` link. "Tap to call" helper text below.
3. **Operating Hours card** — Rounded card with all 7 days, today highlighted
4. **Contact & Location card** — Email (`mailto:`) + address. Phone excluded (already in hero).

## Technical Approach

- New file: `components/order/store-info-dialog.tsx`
- Dialog key: `STORE_INFO_DIALOG`
- Register in `components/dialog-provider.tsx`
- Data via `dialogData`: `{ storeName, description, phone, email, address, operatingHours }`
- Trigger from `order-menu.tsx` via `openDialog(STORE_INFO_DIALOG, data)`
- Remove old Sheet code from `order-menu.tsx`
- Uses shadcn `Dialog` component
- New translation keys: `Menu.tapToCall` (en/el)
