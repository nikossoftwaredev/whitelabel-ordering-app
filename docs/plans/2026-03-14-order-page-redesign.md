# Order Page Redesign — Wolt-style, Mobile-first

## Date: 2026-03-14

## Overview
Redesign the customer ordering page (`/order`) to match Wolt's UX patterns with a mobile-first approach. Use tenant brand colors for whitelabel identity.

## Design

### Header / Hero
- Cover image (from tenant `coverImage`) with dark gradient overlay
- Logo + Store name + description overlaid on cover
- Info bar below cover: prep time, min order amount
- Search bar below info bar

### Category Tabs
- Sticky horizontal scroll tabs below search
- Auto-highlight with Intersection Observer — active tab follows scroll position
- Tap tab → smooth scroll to section
- Brand color for active tab

### Product Layout (Mix)
- **Popular section** first — horizontal carousel with cards (image top, name + price bottom)
- **Other categories** — horizontal cards (text left, image right, one product per row), Wolt-style
- Dietary badges (V, VG, GF) small on card
- "+" button for quick add (if no required modifiers)

### Product Detail — Bottom Sheet
- Slide up, swipe down to dismiss
- Large photo header
- Product name, description, price
- Modifier groups (radio/checkbox) with price adjustments
- Quantity selector
- Full-width "Add to cart" button with total price

### Cart — Floating Bar
- Full-width bar at bottom, visible only when cart has items
- Shows: item count + total price + "View Cart"
- Tap → slide-up cart sheet with items, quantities, checkout button

### Brand Theming
- Primary buttons, active tabs, accents use `--brand-primary`
- Cover image + logo make each store unique
- Light background default, brand colors for accents
