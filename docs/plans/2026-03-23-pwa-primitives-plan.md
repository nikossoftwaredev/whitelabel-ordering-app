# PWA Primitives Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add loading state to Button component and replace the dialog system with a PWA-safe stack-based approach where back button closes dialogs and nested dialogs replace content instead of layering.

**Architecture:** Two independent workstreams: (1) Enhance Button with `loading`/`icon` props, (2) Replace single-dialog Zustand store with a stack, add history.pushState integration, migrate all 6 dialogs to the centralized DialogProvider.

**Tech Stack:** React, Zustand, Radix Dialog, Lucide icons, next-intl, History API

---

## Task 1: Add `loading` and `icon` props to Button

**Files:**
- Modify: `components/ui/button.tsx`

**Step 1: Add loading and icon props to Button**

Replace the entire `components/ui/button.tsx` with:

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { Slot } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  icon,
  children,
  disabled,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    icon?: React.ReactNode
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </Comp>
  )
}

export { Button, buttonVariants }
```

Key changes:
- Added `loading?: boolean` and `icon?: React.ReactNode` props
- When `loading=true`: renders `Loader2` with `animate-spin` in the icon slot, disables the button
- When `icon` is provided and not loading: renders the icon in the same slot
- `disabled` is merged with `loading` so the button is always disabled while loading
- `children` is always rendered (caller controls text like `{loading ? "Sending..." : "Send"}`)
- No `asChild` conflict: icon/loading only applies to non-asChild usage

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No new errors

**Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat: add loading and icon props to Button component"
```

---

## Task 2: Rewrite dialog store with stack + history API

**Files:**
- Modify: `lib/stores/dialog-store.ts`

**Step 1: Replace dialog store with stack-based implementation**

Replace `lib/stores/dialog-store.ts` with:

```tsx
import { create } from "zustand";

interface DialogEntry {
  key: string;
  data: unknown;
  onSuccess?: () => void;
}

interface DialogStore {
  stack: DialogEntry[];
  openDialog: (key: string, data?: unknown, onSuccess?: () => void) => void;
  closeDialog: () => void;
  goBack: () => void;
  closeAll: () => void;
}

export const useDialogStore = create<DialogStore>((set, get) => ({
  stack: [],

  openDialog: (key, data, onSuccess) => {
    set((state) => ({
      stack: [...state.stack, { key, data: data ?? null, onSuccess }],
    }));
    // Push a history entry so the phone back button closes the dialog
    if (typeof window !== "undefined") {
      history.pushState({ dialogStack: true }, "");
    }
  },

  closeDialog: () => {
    const { stack } = get();
    if (stack.length === 0) return;
    set({ stack: stack.slice(0, -1) });
  },

  goBack: () => {
    // Same as closeDialog but triggers history.back() so popstate stays in sync
    const { stack } = get();
    if (stack.length === 0) return;
    if (typeof window !== "undefined") {
      history.back();
    }
  },

  closeAll: () => {
    const { stack } = get();
    if (stack.length === 0) return;
    const depth = stack.length;
    set({ stack: [] });
    // Go back N history entries
    if (typeof window !== "undefined" && depth > 0) {
      history.go(-depth);
    }
  },
}));

// ── Selector helpers (avoid re-renders) ──

export const selectCurrentDialog = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].key : null;

export const selectDialogData = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].data : null;

export const selectOnSuccess = (s: DialogStore) =>
  s.stack.length > 0 ? s.stack[s.stack.length - 1].onSuccess : undefined;

export const selectStackDepth = (s: DialogStore) => s.stack.length;
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: Errors in files that use the old `closeDialog(key)` signature — expected, will fix in next tasks.

**Step 3: Commit**

```bash
git add lib/stores/dialog-store.ts
git commit -m "feat: rewrite dialog store with stack + history API"
```

---

## Task 3: Update DialogProvider with single shell + popstate listener

**Files:**
- Modify: `components/dialog-provider.tsx`
- Modify: `components/ui/dialog.tsx` (add back arrow support)

**Step 1: Add back arrow support to DialogContent**

In `components/ui/dialog.tsx`, update the `DialogContent` component to accept `onBack` and `onCloseAll` props. Add an `ArrowLeft` button to the top-left when `onBack` is provided:

Inside `DialogContent`, after the existing close button block (line 95-103), add the back arrow. Also change the X button to call `onCloseAll` if provided.

Update the `DialogContent` function signature to:

```tsx
function DialogContent({
  className,
  children,
  showCloseButton = true,
  variant = "responsive",
  onBack,
  onCloseAll,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  variant?: "responsive" | "default"
  onBack?: () => void
  onCloseAll?: () => void
}) {
```

And update the buttons inside the content:

```tsx
{/* Back arrow — only shown for nested dialogs */}
{onBack && (
  <button
    onClick={onBack}
    className="absolute top-4 left-4 z-10 size-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors duration-200 cursor-pointer"
  >
    <ArrowLeft className="size-5" />
    <span className="sr-only">Back</span>
  </button>
)}
{showCloseButton && (
  <DialogPrimitive.Close
    data-slot="dialog-close"
    className="absolute top-4 right-4 z-10 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
    {...(onCloseAll ? { onClick: (e: React.MouseEvent) => { e.preventDefault(); onCloseAll(); } } : {})}
  >
    <XIcon />
    <span className="sr-only">Close</span>
  </DialogPrimitive.Close>
)}
```

Add `ArrowLeft` to the lucide imports.

**Step 2: Rewrite DialogProvider as the single dialog shell**

Replace `components/dialog-provider.tsx` with:

```tsx
"use client";

import { useEffect } from "react";

import { ConfirmContent } from "@/components/confirm-dialog";
import { StoreInfoContent } from "@/components/order/store-info-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  selectCurrentDialog,
  selectStackDepth,
  useDialogStore,
} from "@/lib/stores/dialog-store";

// Dialog keys registry
export const DIALOG_KEYS = {
  CONFIRM: "confirm",
  STORE_INFO: "store-info",
  CART: "cart",
  PRODUCT_DETAIL: "product-detail",
  AUTH: "auth",
  ADDRESS_MANAGER: "address-manager",
} as const;

export const DialogProvider = () => {
  const currentDialog = useDialogStore(selectCurrentDialog);
  const stackDepth = useDialogStore(selectStackDepth);
  const goBack = useDialogStore((s) => s.goBack);
  const closeAll = useDialogStore((s) => s.closeAll);
  const closeDialog = useDialogStore((s) => s.closeDialog);

  // ── popstate listener: phone back button closes top dialog ──
  useEffect(() => {
    const handlePopState = () => {
      const { stack } = useDialogStore.getState();
      if (stack.length > 0) {
        // closeDialog (not goBack) because popstate already went back in history
        closeDialog();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [closeDialog]);

  if (!currentDialog) return null;

  return (
    <Dialog
      open={!!currentDialog}
      onOpenChange={(open) => {
        if (!open) closeAll();
      }}
    >
      <DialogContent
        showCloseButton
        onBack={stackDepth > 1 ? goBack : undefined}
        onCloseAll={closeAll}
      >
        {currentDialog === DIALOG_KEYS.CONFIRM && <ConfirmContent />}
        {currentDialog === DIALOG_KEYS.STORE_INFO && <StoreInfoContent />}
        {/* Cart, ProductDetail, Auth, AddressManager will be added as they are migrated */}
      </DialogContent>
    </Dialog>
  );
};
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 4: Commit**

```bash
git add components/dialog-provider.tsx components/ui/dialog.tsx
git commit -m "feat: DialogProvider single shell with popstate + back arrow"
```

---

## Task 4: Migrate ConfirmDialog to stack system

**Files:**
- Modify: `components/confirm-dialog.tsx`

**Step 1: Convert ConfirmDialog to a content-only component**

Replace `components/confirm-dialog.tsx` with:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  selectDialogData,
  selectOnSuccess,
  selectStackDepth,
  useDialogStore,
} from "@/lib/stores/dialog-store";

export const CONFIRM_DIALOG = "confirm";

interface ConfirmDialogData {
  title: string;
  description: string;
  actionLabel: string;
}

export const ConfirmContent = () => {
  const dialogData = useDialogStore(selectDialogData);
  const onSuccess = useDialogStore(selectOnSuccess);
  const stackDepth = useDialogStore(selectStackDepth);
  const goBack = useDialogStore((s) => s.goBack);
  const closeAll = useDialogStore((s) => s.closeAll);

  const { title, description, actionLabel } =
    (dialogData as ConfirmDialogData) ?? {};

  const handleConfirm = () => {
    onSuccess?.();
    // If opened from another dialog, go back to it; otherwise close all
    if (stackDepth > 1) {
      goBack();
    } else {
      closeAll();
    }
  };

  return (
    <div className="p-6">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex-row justify-center gap-2 sm:justify-center mt-4">
        <Button variant="outline" onClick={stackDepth > 1 ? goBack : closeAll}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          {actionLabel}
        </Button>
      </DialogFooter>
    </div>
  );
};
```

Note: We keep exporting `CONFIRM_DIALOG` so existing `openDialog(CONFIRM_DIALOG, ...)` call sites in `address-manager-sheet.tsx` continue to work.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add components/confirm-dialog.tsx
git commit -m "feat: migrate ConfirmDialog to stack-based content component"
```

---

## Task 5: Migrate StoreInfoDialog to stack system

**Files:**
- Modify: `components/order/store-info-dialog.tsx`

**Step 1: Convert to content-only component**

Replace the component to export `StoreInfoContent` instead of the full dialog wrapper. Remove the `<Dialog>` and `<DialogContent>` wrapper — just render the content. Use `selectDialogData` from the store.

```tsx
"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { selectDialogData, useDialogStore } from "@/lib/stores/dialog-store";

export const STORE_INFO_DIALOG = "store-info";

// ... keep existing interfaces (OperatingHour, StoreInfoDialogData) ...

export const StoreInfoContent = () => {
  const t = useTranslations("Menu");
  const dialogData = useDialogStore(selectDialogData);

  const data = dialogData as StoreInfoDialogData | null;
  const storeName = data?.storeName ?? "";
  const { description, phone, email, address, operatingHours } = data ?? {};
  const today = new Date().getDay();

  return (
    <div className="flex flex-col">
      <DialogHeader className="p-6 pb-4">
        <DialogTitle className="text-lg">{storeName}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>

      <div className="flex flex-col gap-4 px-6 pb-6">
        {/* ... keep all the existing content JSX (phone CTA, hours, contact) exactly as-is ... */}
      </div>
    </div>
  );
};
```

Keep the full JSX content from the original — just remove the `<Dialog>` and `<DialogContent>` wrapper and the open/close logic.

**Step 2: Update any imports**

Search for `StoreInfoDialog` imports and update to `StoreInfoContent`. The dialog-provider already imports `StoreInfoContent`.

**Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 4: Commit**

```bash
git add components/order/store-info-dialog.tsx components/dialog-provider.tsx
git commit -m "feat: migrate StoreInfoDialog to stack-based content component"
```

---

## Task 6: Migrate AuthDialog to stack system

**Files:**
- Modify: `components/order/auth-dialog.tsx`
- Modify: `components/dialog-provider.tsx` (register)

**Step 1: Convert AuthDialog to content-only**

```tsx
"use client";

import { useTranslations } from "next-intl";

import { SignInForm } from "@/components/auth/signin-form";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const AUTH_DIALOG = "auth";

export function AuthContent() {
  const t = useTranslations("AuthDialog");

  return (
    <div className="p-6 space-y-6">
      <DialogHeader className="space-y-2">
        <DialogTitle className="text-2xl font-bold">{t("title")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
      </DialogHeader>
      <SignInForm callbackUrl="/order" />
    </div>
  );
}
```

**Step 2: Register in DialogProvider**

Add to imports in `dialog-provider.tsx`:
```tsx
import { AuthContent } from "@/components/order/auth-dialog";
```

Add to the render:
```tsx
{currentDialog === DIALOG_KEYS.AUTH && <AuthContent />}
```

**Step 3: Update call sites**

In `cart-sheet.tsx` and `address-manager-sheet.tsx`, replace local `AuthDialog` rendering with `openDialog("auth")`:
- Remove `useState` for `showAuthDialog` / `authOpen`
- Remove `<AuthDialog>` JSX
- Replace `setShowAuthDialog(true)` / `setAuthOpen(true)` with `openDialog("auth")`

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add components/order/auth-dialog.tsx components/dialog-provider.tsx components/order/cart-sheet.tsx components/order/address-manager-sheet.tsx
git commit -m "feat: migrate AuthDialog to stack-based content component"
```

---

## Task 7: Migrate AddressManagerSheet to stack system

**Files:**
- Modify: `components/order/address-manager-sheet.tsx`
- Modify: `components/dialog-provider.tsx` (register)

**Step 1: Convert to content-only component**

Remove the `<Dialog>` and `<DialogContent>` wrapper. Remove `open`/`onOpenChange` props. Replace `onOpenChange(false)` calls with `closeAll()` or `goBack()` as appropriate. Remove the nested `<AuthDialog>` (now handled via `openDialog("auth")`).

The component keeps its internal `view` state (`list` / `search` / `form`) — that's internal navigation, not dialog stacking.

Key changes:
- Export as `AddressManagerContent`
- Remove `AddressManagerSheetProps` interface
- Accept `initialView` via `dialogData` from the store instead of props
- Replace `onOpenChange(false)` with `useDialogStore((s) => s.closeAll)()` for "done" actions
- Replace `setAuthOpen(true)` with `openDialog("auth")`
- Keep the existing back arrow logic for internal view navigation (list/search/form)

**Step 2: Register in DialogProvider**

Add to imports and render block.

**Step 3: Update call sites**

In `cart-sheet.tsx`:
- Remove `useState` for `addressOpen`
- Remove `<AddressManagerSheet>` JSX
- Replace `setAddressOpen(true)` with `openDialog("address-manager")`

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add components/order/address-manager-sheet.tsx components/dialog-provider.tsx components/order/cart-sheet.tsx
git commit -m "feat: migrate AddressManagerSheet to stack-based content component"
```

---

## Task 8: Migrate CartSheet to stack system

**Files:**
- Modify: `components/order/cart-sheet.tsx`
- Modify: `components/dialog-provider.tsx` (register)
- Modify: `components/order/order-menu.tsx` (update call site)
- Modify: `components/order/customer-header.tsx` (update call site)

**Step 1: Convert CartSheet to content-only**

Remove the `<Dialog>` and `<DialogContent>` wrapper. Remove `open`/`onOpenChange` props. The component reads its data from the cart store (already does).

Key changes:
- Export as `CartContent`
- Remove `CartSheetProps`
- Remove nested `<AddressManagerSheet>` and `<AuthDialog>` — now opened via `openDialog()`
- Replace `onOpenChange(false)` with `closeAll()`
- Replace `setAddressOpen(true)` with `openDialog("address-manager")`
- Replace `setShowAuthDialog(true)` with `openDialog("auth")`
- The `CartContents` inner component merges into `CartContent`
- Auto-close when cart becomes empty: use `useEffect` watching `items.length` + `closeAll()`
- For "Proceed to Checkout" link: `closeAll()` then navigate

**Step 2: Register in DialogProvider**

Add to imports and render block.

**Step 3: Update call sites**

In `order-menu.tsx` (line 859):
- Remove `const [cartOpen, setCartOpen] = useState(false)` (or wherever it's defined)
- Remove `<CartSheet>` JSX
- Replace `setCartOpen(true)` with `openDialog("cart")`

In `customer-header.tsx` (line 168):
- Same pattern: remove local state, use `openDialog("cart")`

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add components/order/cart-sheet.tsx components/dialog-provider.tsx components/order/order-menu.tsx components/order/customer-header.tsx
git commit -m "feat: migrate CartSheet to stack-based content component"
```

---

## Task 9: Migrate ProductDetailSheet to stack system

**Files:**
- Modify: `components/order/product-detail-sheet.tsx`
- Modify: `components/dialog-provider.tsx` (register)
- Modify: `components/order/order-menu.tsx` (update call site)

**Step 1: Convert to content-only**

Remove the `<Dialog>` and `<DialogContent>` wrapper. The product data and editingCartItem come from `dialogData` via the store instead of props.

Key changes:
- Export as `ProductDetailContent`
- Remove `ProductDetailSheetProps`
- Read product/editingCartItem from `selectDialogData`:
  ```tsx
  const dialogData = useDialogStore(selectDialogData) as { product: Product; editingCartItem?: CartItemEdit } | null;
  const product = dialogData?.product ?? null;
  const editingCartItem = dialogData?.editingCartItem ?? null;
  ```
- Replace `onClose()` with `closeAll()` (or `goBack()` when appropriate)
- Remove the custom close button (X) — the DialogContent shell handles it

**Step 2: Register in DialogProvider**

Add to imports and render block.

**Step 3: Update call sites**

In `order-menu.tsx` (line 858):
- Remove `<ProductDetailSheet>` JSX
- Replace `setSelectedProduct(product)` with `openDialog("product-detail", { product, editingCartItem })`
- Remove local `selectedProduct` and `editingCartItem` state

**Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 5: Commit**

```bash
git add components/order/product-detail-sheet.tsx components/dialog-provider.tsx components/order/order-menu.tsx
git commit -m "feat: migrate ProductDetailSheet to stack-based content component"
```

---

## Task 10: Handle cart remove-item AlertDialog via stack

**Files:**
- Modify: `components/order/cart-sheet.tsx`

**Step 1: Replace inline AlertDialog with openDialog(CONFIRM_DIALOG)**

In `CartContent`, the remove-item confirmation currently uses a local `AlertDialog`. Replace with:

```tsx
// Instead of setRemoveConfirm({ cartItemId, name })
openDialog(CONFIRM_DIALOG, {
  title: t("removeTitle"),
  description: t("removeDescription", { item: name }),
  actionLabel: t("remove"),
}, () => cart.removeItem(cartItemId));
```

Remove the `removeConfirm` state, the `AlertDialog` imports, and the `AlertDialog` JSX block.

**Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`

**Step 3: Commit**

```bash
git add components/order/cart-sheet.tsx
git commit -m "feat: use confirm dialog stack for cart item removal"
```

---

## Task 11: Final verification

**Step 1: TypeScript check**

Run: `pnpm tsc --noEmit`
Expected: Clean, no errors

**Step 2: Lint check**

Run: `pnpm lint`
Expected: Clean or only pre-existing warnings

**Step 3: Build check**

Run: `pnpm build`
Expected: Successful build

**Step 4: Manual testing checklist**

Test on `http://figata-cafe.lvh.me:3000/en/order`:

1. Open product detail → X closes → back to menu
2. Open cart → open address manager → back arrow returns to cart → X closes all
3. Open cart → proceed (not logged in) → auth dialog appears with back arrow → back returns to cart
4. In address manager → delete address → confirm dialog with back arrow → back returns to address manager
5. Phone back button: open cart → press back → cart closes, stays on page (not navigate away)
6. Phone back button: cart → address → back → back to cart → back → closes all
7. Button loading: any API button shows spinner and disables during request

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any issues found during verification"
```

---

## Task 12: Clean up unused imports and dead code

**Step 1: Search for orphaned imports**

Check for any remaining imports of the old dialog patterns:
- `AlertDialog` imports in cart-sheet (should be removed)
- `AuthDialog` component imports (should be removed from cart-sheet, address-manager)
- `AddressManagerSheet` component imports (should be removed from cart-sheet)
- Old `closeDialog(key)` call pattern (should all be parameterless now)

**Step 2: Remove any unused files or exports**

If any dialog component files are now empty or only re-export, clean them up.

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: clean up unused dialog imports and dead code"
```
