# PWA Primitives: Button Loading + Dialog Stack System

**Date:** 2026-03-23

---

## 1. Button Loading State

### Problem
Buttons that trigger API calls have no loading feedback. Users can double-tap, see no progress, and get confused — especially on slow mobile networks in a PWA.

### Design

Enhance `components/ui/button.tsx` with two new optional props:

```tsx
interface ButtonProps {
  loading?: boolean   // shows spinner, disables button
  icon?: React.ReactNode  // optional left-side icon, replaced by spinner when loading
}
```

**Behavior:**
- `loading=true` → spinner (`Loader2` from lucide, animated) renders in left icon slot
- If `icon` is provided, spinner replaces it (same slot = no layout shift)
- If no `icon`, spinner appears on the left with the existing `gap` from buttonVariants
- Button is disabled when loading (pointer-events-none + opacity-50)
- Text change is caller-controlled: `{loading ? "Sending..." : "Send"}`

**Spinner sizing:** matches the existing `[&_svg:not([class*='size-'])]:size-4` pattern per size variant.

---

## 2. Dialog Stack System (PWA-safe)

### Problem
Current dialog system has three issues for PWA:
1. **Back button kills the app** — no history state management, so phone back button navigates away
2. **Dialog layering** — opening a dialog from another dialog stacks DOM layers (cart → auth → address), causing z-index issues and multiple overlays
3. **Inconsistent patterns** — some dialogs use Zustand store, some use local props, making it hard to enforce consistent behavior

### Design

#### A. Dialog Stack Store (`lib/stores/dialog-store.ts`)

Replace single `currentDialog` with a stack:

```tsx
interface DialogEntry {
  key: string
  data: unknown
  onSuccess?: () => void
}

interface DialogStore {
  stack: DialogEntry[]
  // Computed
  currentDialog: string | null  // stack[top]?.key
  dialogData: unknown           // stack[top]?.data
  onSuccess?: () => void        // stack[top]?.onSuccess
  // Actions
  openDialog: (key: string, data?: unknown, onSuccess?: () => void) => void  // push
  closeDialog: () => void       // pop top
  goBack: () => void            // pop top (alias, semantic)
  closeAll: () => void          // clear stack
  stackDepth: number            // stack.length
}
```

- `openDialog` pushes onto stack + calls `history.pushState()`
- `closeDialog` / `goBack` pops top + calls `history.back()`
- `closeAll` clears stack + goes back N history entries
- Existing `closeDialog(key)` call sites migrated to parameterless `closeDialog()`

#### B. Browser Back Button (PWA-safe)

Global `popstate` listener (in `DialogProvider`):
- On `popstate` → if stack is non-empty, pop top dialog
- This makes the phone back button close the current dialog instead of leaving the app
- Each `openDialog` pushes a history entry; each close pops one

#### C. Dialog Header with Navigation

Standardized header for all stacked dialogs:

- **X button** (top-right) — always present, calls `closeAll()` (returns to page)
- **← Back arrow** (top-left) — shown when `stackDepth > 1`, calls `goBack()`
- Built into `DialogContent` component so it's automatic

#### D. Single Shell Rendering

`DialogProvider` renders ONE `<Dialog>` shell. The content switches based on `currentDialog`:

```tsx
// DialogProvider renders:
<Dialog open={stack.length > 0}>
  <DialogContent>
    {currentDialog === CART && <CartContent />}
    {currentDialog === PRODUCT_DETAIL && <ProductDetailContent />}
    {currentDialog === AUTH && <AuthContent />}
    {currentDialog === ADDRESS_MANAGER && <AddressManagerContent />}
    {currentDialog === STORE_INFO && <StoreInfoContent />}
    {currentDialog === CONFIRM && <ConfirmContent />}
    ...
  </DialogContent>
</Dialog>
```

Only the topmost dialog's content renders. Previous dialogs stay in the stack but are not visible. Transition between content uses a fade or slide animation.

#### E. Migration Plan

Each existing dialog gets refactored:
1. **Extract content** from the Dialog wrapper into a standalone content component
2. **Register** in `DialogProvider` with a unique key
3. **Replace** local `open`/`onOpenChange` props with `openDialog(KEY, data)`
4. **Remove** individual `<Dialog>` wrappers from each component

**Dialogs to migrate:**
- `ConfirmDialog` (already uses store) — adapt to stack API
- `StoreInfoDialog` (already uses store) — adapt to stack API
- `CartSheet` → `CartContent` — currently uses local props
- `ProductDetailSheet` → `ProductDetailContent` — currently uses local props
- `AuthDialog` → `AuthContent` — currently uses local props
- `AddressManagerSheet` → `AddressManagerContent` — currently uses local props

#### F. Confirm Dialog Special Case

`ConfirmDialog` is lightweight and blocking. Two options:
- **Option A:** Treat it like any other dialog in the stack (push on top, back arrow returns)
- **Option B:** Render it as an `AlertDialog` overlay on top of the current dialog (current behavior)

**Decision: Option A** — keep it in the stack for consistency. The back arrow returns to the previous dialog naturally.

---

## Non-Goals

- URL-based routing for dialogs (no `/cart`, `/product/123` routes)
- Animations between dialog transitions (keep it simple with fade, enhance later)
- Drawer/sheet distinction — everything becomes a responsive dialog (full-screen mobile, centered desktop)
