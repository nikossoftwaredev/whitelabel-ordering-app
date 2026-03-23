# Fix Dialog/Dropdown Layout Shift (Radix UI + shadcn/ui)

## Problem

When opening a Radix UI dialog, dropdown, or popover (via shadcn/ui), the page scrollbar disappears and the body shifts to the right, leaving empty space. This happens because `react-remove-scroll-bar` injects styles that hide the scrollbar and add compensating `margin-right`/`padding-right` to the body.

## Fix

Add the following CSS overrides to your `globals.css` (after your theme variables):

```css
/* ── Prevent layout shift when Radix dialogs open ──
   Radix injects scroll-locking styles that hide the scrollbar and add
   compensating margin/padding, causing the page to jump. Override all
   of that so the scrollbar stays visible and the layout never moves. */
html,
html.with-scroll-bars-hidden {
  overflow-y: scroll !important;
  padding-right: 0 !important;
}

html body[data-scroll-locked] {
  margin-right: 0 !important;
  padding-right: 0 !important;
  margin-left: 0 !important;
  padding-left: 0 !important;
}
```

## Why It Works

1. **`html.with-scroll-bars-hidden`** — Radix applies this class directly to `<html>` with `overflow: hidden !important` and `padding-right: {gap}px !important`. Our rule matches the same selector and forces `overflow-y: scroll` and `padding-right: 0`, keeping the scrollbar visible.

2. **`html body[data-scroll-locked]`** — Radix injects a `<style>` tag targeting `body[data-scroll-locked]` (specificity 0-1-1). Our selector `html body[data-scroll-locked]` has higher specificity (0-1-2), so it wins regardless of DOM order, zeroing out all compensating margin/padding.

## Applies To

- `Dialog` / `AlertDialog`
- `DropdownMenu`
- `Popover`
- `Select`
- Any Radix primitive that uses `react-remove-scroll-bar` internally
