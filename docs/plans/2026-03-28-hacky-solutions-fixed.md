# Hacky Solutions Fixed — 2026-03-28

> **Prompt used:** "Go through the codebase and investigate places where we do hacky solutions. Search the web or think about what is the best practice to do it using shadcn native ways, props, or other native ways. We need to reduce the possible bugs that will come in the future for our hacky solutions!"

---

## Fix 1 — ViewportHeightSync deleted → `100dvh`

**Files:** `components/viewport-height-sync.tsx` (deleted), `app/[locale]/layout.tsx`, `app/[locale]/globals.css`

### Before
A 31-line client component that manually set a CSS variable `--vvh` by reading `window.visualViewport.height` on every `resize` and `scroll` event (iOS Safari fires `scroll`, not `resize`, when the keyboard opens). The CSS used `height: var(--vvh, 100dvh)` — meaning the `dvh` fallback was already the right answer.

```tsx
// components/viewport-height-sync.tsx
export function ViewportHeightSync() {
  useEffect(() => {
    const vv = window.visualViewport;
    const sync = () => {
      const next = `${vv ? vv.height : window.innerHeight}px`;
      document.documentElement.style.setProperty("--vvh", next);
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync); // iOS quirk workaround
    return () => { vv?.removeEventListener(...); vv?.removeEventListener(...); };
  }, []);
  return null;
}
```

```css
/* globals.css */
height: var(--vvh, 100dvh);
```

### After
Component deleted. Pure CSS using `dvh` (dynamic viewport height) — the CSS unit that _is_ the viewport minus browser chrome, supported in Safari 16+, Chrome 108+, Firefox 110+.

```css
/* globals.css */
height: 100dvh;
```

**Why it's better:** No JS, no event listeners, no race conditions on mount, no iOS-specific branch, no manual DOM mutation. The browser handles it natively.

---

## Fix 2 — CSS `!important` scroll-lock overrides → `scrollbar-gutter: stable`

**File:** `app/[locale]/globals.css`

### Before
`!important` overrides fighting Radix UI's scroll-lock behavior. When a dialog opened, Radix hid the scrollbar and added `margin-right` compensation to prevent layout shift — so we fought back with `!important` to undo all of it.

```css
html,
html.with-scroll-bars-hidden {
  scroll-behavior: smooth;
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

### After
`scrollbar-gutter: stable` tells the browser to always reserve space for the scrollbar gutter. Radix detects a 0px scrollbar width and adds 0px compensation — no layout shift happens, no `!important` needed.

```css
html {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}
```

**Why it's better:** Works with Radix's mechanism rather than against it. No specificity arms race. Fewer CSS rules. `scrollbar-gutter: stable` is the W3C-specified solution for exactly this problem.

---

## Fix 3 — Polling + `statusRef` → Realtime reconnect refetch (order-confirmation.tsx)

**File:** `components/order/order-confirmation.tsx`

### Before
Three separate effects: (1) Supabase Realtime subscription, (2) `useRef` + `useEffect` to sync state into a mutable ref so it could be read inside a closure, (3) a 10-second `setInterval` polling fallback.

```tsx
// statusRef pattern — syncing state into a ref just to read it in polling closure
const statusRef = useRef(status);
useEffect(() => {
  statusRef.current = status;
}, [status]);

useEffect(() => {
  const poll = setInterval(async () => {
    const current = statusRef.current;
    if (current === "COMPLETED" || current === "REJECTED" || current === "CANCELLED") return;
    try {
      const res = await fetch(`/api/tenants/${tenant.slug}/orders/active`);
      const data = await res.json();
      if (data.order && data.order.status !== statusRef.current) {
        setStatus(data.order.status);
      }
    } catch { /* silently ignore */ }
  }, 10_000);
  return () => clearInterval(poll);
}, [orderId, tenant.slug]);
```

### After
The Supabase `subscribe()` callback receives connection status events. When `SUBSCRIBED` fires for the second time (reconnected), we do a one-time refetch. No interval, no ref, no stale closure problem.

```tsx
useEffect(() => {
  if (!orderId) return;
  const supabase = getSupabaseBrowserClient();
  let everSubscribed = false;

  const channel = supabase
    .channel(`order:${orderId}`)
    .on("broadcast", { event: "status_change" }, ({ payload }) => {
      setStatus(payload.status as OrderStatus);
    })
    .subscribe(async (realtimeStatus) => {
      if (realtimeStatus !== "SUBSCRIBED") return;
      if (everSubscribed) {
        // Reconnected — refetch to catch any missed events
        try {
          const res = await fetch(`/api/tenants/${tenant.slug}/orders/active`);
          const data = await res.json();
          if (data.order) setStatus(data.order.status);
        } catch {}
      }
      everSubscribed = true;
    });

  channelRef.current = channel;
  return () => { supabase.removeChannel(channel); channelRef.current = null; };
}, [orderId, tenant.slug]);
```

**Why it's better:** One effect instead of three. No ref syncing pattern. Refetch is triggered only when needed (on reconnect), not every 10 seconds. Removes ~30 lines of code.

---

## Fix 4 — Polling + `orderStatusRef` → Realtime reconnect refetch (active-order-banner.tsx)

**File:** `components/order/active-order-banner.tsx`

Same pattern as Fix 3. Additionally extracted a local `applyStatus()` helper to avoid duplicating the "COMPLETED/REJECTED → hide banner" logic between the broadcast handler and the reconnect refetch.

### Before
Same `useRef` + sync effect + `setInterval` pattern as order-confirmation.

### After
Single effect with reconnect-triggered one-time refetch. `applyStatus()` helper deduplicates the dismiss logic.

---

## Fix 5 — Manual debounce ref → `useEffect` cleanup (address-manager-sheet.tsx)

**File:** `components/order/address-manager-sheet.tsx`

### Before
Manual `debounceRef` using `useRef<ReturnType<typeof setTimeout>>`. The ref was stored, manually cleared at the top of the effect, and also cleared in the cleanup — which is redundant since `useEffect`'s cleanup function already handles the previous timer automatically.

```tsx
const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (debounceRef.current) clearTimeout(debounceRef.current); // redundant
  if (query.length < 3) { setPredictions([]); return; }
  debounceRef.current = setTimeout(async () => {
    const results = await searchPlaces(query, "address");
    setPredictions(results);
  }, 350);
  return () => { if (debounceRef.current) clearTimeout(debounceRef.current); }; // this is sufficient alone
}, [query]);
```

### After
`useEffect` cleanup handles the cancel — no ref needed. Also removed unused `useRef` from the import.

```tsx
useEffect(() => {
  if (query.length < 3) { setPredictions([]); return; }
  const timer = setTimeout(async () => {
    const results = await searchPlaces(query, "address");
    setPredictions(results);
  }, 350);
  return () => clearTimeout(timer);
}, [query]);
```

**Why it's better:** Every `useEffect` re-run cancels the previous cleanup automatically. The ref was solving a problem that didn't exist. Also removed `useRef` from imports.

---

## Fix 6 — `setTimeout(600)` race condition → double-rAF (location-prompt.tsx)

**File:** `components/order/location-prompt.tsx`

### Before
Arbitrary 600ms delay to "let the page render first" before showing the location prompt sheet.

```tsx
// Small delay so the page renders first
const timer = setTimeout(() => setOpen(true), 600);
return () => clearTimeout(timer);
```

**Why it was fragile:** A race condition — if the page takes longer than 600ms to render (slow device, cold cache), the sheet appears before content is ready. If it's faster, 600ms is wasted.

### After
Double `requestAnimationFrame` fires _after_ the browser has completed one paint cycle — guaranteed to run after first render, no arbitrary delay.

```tsx
// Double-rAF: fires after the browser has painted once
let raf1: number;
let raf2: number;
raf1 = requestAnimationFrame(() => {
  raf2 = requestAnimationFrame(() => setOpen(true));
});
return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
```

**Why it's better:** Guaranteed timing semantics (post-paint), not a guess. Faster on fast devices, correct on slow ones.

---

## Fix 7 — Global `activeUploadId` → local `isHoveredRef` (image-upload.tsx)

**File:** `components/image-upload.tsx`

### Before
A module-level mutable global variable tracking which `ImageUpload` instance "owns" paste events. Using `useId()` to generate instance IDs and comparing against the global to decide whether to handle paste.

```tsx
// Module-level mutable global — not React-idiomatic
let activeUploadId: string | null = null;

// In the component:
const instanceId = useId();

const handleMouseEnter = () => {
  activeUploadId = instanceId; // mutate global
  setIsActive(true);
};

// In paste handler:
if (activeUploadId !== instanceId || ...) return;
```

**Why it was fragile:** Global state across all instances. If two uploads mounted simultaneously, one could steal the global. Not React-idiomatic. Leaked state if component unmounted while hovered.

### After
Component-local `useRef<boolean>` tracks hover state. No global, no `useId`, no cross-instance coordination needed.

```tsx
const isHoveredRef = useRef(false);

const handleMouseEnter = () => { isHoveredRef.current = true; setIsActive(true); };
const handleMouseLeave = () => { isHoveredRef.current = false; setIsActive(false); };

// In paste handler:
if (!isHoveredRef.current || ...) return;
```

**Why it's better:** Self-contained, no shared state, correct per-instance behavior, no `useId` import needed.

---

## Fix 8 — `crypto.randomUUID?.()` polyfill → `crypto.randomUUID()` (cart-store.ts)

**File:** `lib/stores/cart-store.ts`

### Before
Optional chaining + weak `Date.now()` + `Math.random()` fallback for `crypto.randomUUID`.

```tsx
const cartItemId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
```

**Why it was fragile:** The fallback generates a weak, non-UUID string with low entropy. If `crypto.randomUUID` were somehow unavailable, cart item IDs would be predictable and collision-prone. Also TypeScript has no way to tell you the optional chaining is unnecessary.

### After
```tsx
const cartItemId = crypto.randomUUID();
```

**Why it's better:** `crypto.randomUUID()` is available in all supported browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and Node.js 14.17+. The fallback was dead code. Direct call gives TypeScript full type safety.

---

## Fix 9 — `as unknown as` type assertions → `declare global` Navigator augmentation (pwa-install-prompt.tsx)

**File:** `components/pwa-install-prompt.tsx`

### Before
Double type assertions to access non-standard browser APIs.

```tsx
// iOS standalone detection
(window.navigator as unknown as { standalone?: boolean }).standalone === true

// Chrome Android PWA detection
(navigator as unknown as { getInstalledRelatedApps(): Promise<unknown[]> })
  .getInstalledRelatedApps()
```

**Why it was fragile:** `as unknown as X` bypasses TypeScript entirely — typos, wrong signatures, and wrong property names all compile silently.

### After
Proper `declare global` augmentation of the `Navigator` interface with JSDoc explaining each non-standard API.

```tsx
declare global {
  interface Window { __pwaInstallPrompt?: BeforeInstallPromptEvent; }
  interface Navigator {
    /** iOS Safari standalone mode detection */
    standalone?: boolean;
    /** Chrome Android: detect if PWA is already installed */
    getInstalledRelatedApps?(): Promise<unknown[]>;
  }
}

// Usage — now fully typed, no casting:
navigator.standalone === true
navigator.getInstalledRelatedApps?.()
```

**Why it's better:** TypeScript-safe. Optional typing (`?:`) correctly models that these APIs may not exist. Future callers benefit from the typed interface. Documents why these non-standard APIs are used.

---

## Summary Table

| # | File | What was hacky | Fix applied | Lines removed |
|---|------|---------------|-------------|---------------|
| 1 | `components/viewport-height-sync.tsx` | JS-based viewport height sync via `visualViewport` events | Deleted — use `100dvh` CSS unit | −31 |
| 2 | `app/[locale]/globals.css` | `!important` fighting Radix scroll-lock | `scrollbar-gutter: stable` | −10 |
| 3 | `components/order/order-confirmation.tsx` | 10s polling + `statusRef` sync pattern | Realtime reconnect refetch | −30 |
| 4 | `components/order/active-order-banner.tsx` | Same 10s polling + `orderStatusRef` | Realtime reconnect refetch | −28 |
| 5 | `components/order/address-manager-sheet.tsx` | Redundant `debounceRef` manual cancel | `useEffect` cleanup handles it | −5 |
| 6 | `components/order/location-prompt.tsx` | `setTimeout(600)` race condition | Double `requestAnimationFrame` | 0 (swap) |
| 7 | `components/image-upload.tsx` | Module-level mutable `activeUploadId` global | Component-local `isHoveredRef` | −3 |
| 8 | `lib/stores/cart-store.ts` | `crypto.randomUUID?.()` weak fallback | `crypto.randomUUID()` direct call | −1 |
| 9 | `components/pwa-install-prompt.tsx` | `as unknown as` double type assertions | `declare global Navigator` augmentation | −3 |
