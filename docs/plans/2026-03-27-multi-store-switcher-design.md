# Multi-Store Switcher Design

**Date:** 2026-03-27

## Problem

A client who owns multiple stores (tenants) currently has no way to switch between them in the UI. Each store lives on its own subdomain, so the only way to move between them is to manually type a different URL.

## Goal

Let a multi-store owner switch between their stores from two places:
1. The avatar dropdown (customer-facing order page + admin panel)
2. The admin sidebar footer (within the admin panel)

## Data Layer

**New endpoint:** `GET /api/user/tenants`

Queries `TenantRole` for the authenticated user. Joins tenant name, slug, logo (from `TenantConfig`), and custom domain. Returns:

```ts
[{ id: string; name: string; slug: string; logo: string | null; domain: string | null }]
```

Only tenants where the user holds any role are returned. No pagination needed — a user will realistically own <20 stores.

## Shared Component: `TenantSwitcherItem`

**File:** `components/tenant-switcher-item.tsx`

A single reusable row used in both the avatar dropdown and the sidebar popover:
- Logo thumbnail (32×32, rounded, object-contain) or initial-letter fallback in brand color
- Store name (truncated)
- Checkmark icon when it's the currently active store

**Navigation:** On click → `window.location.href` to `https://${slug}.${baseDomain}/${locale}/admin`. Base domain is derived from `window.location.hostname` at runtime:
- Production: strip the leftmost subdomain to get the root domain
- `lvh.me` / `localhost`: use `${slug}.lvh.me:${port}` or `localhost:${port}` with `__tenant` cookie

If the tenant has a custom `domain`, use that directly instead of constructing a subdomain URL.

## Avatar Dropdown (`components/user-avatar-menu.tsx`)

Replace the existing `isAdmin` / "Admin Panel" check with a `tenants` state:
- Fetch `GET /api/user/tenants` lazily when the dropdown opens (`onOpenChange`)
- While loading: show 2 skeleton rows under a "My Stores" label
- When loaded: render a `TenantSwitcherItem` per store under a `DropdownMenuLabel` "My Stores"
- Separator above and below the stores section
- Section hidden entirely if user has zero tenants (maintains current UX for pure customers)

The `isAdmin` fetch (`/api/user/role`) is removed — replaced by the tenants fetch.

## Admin Sidebar Footer (`components/admin/admin-sidebar.tsx`)

The existing store footer row (logo + name + eye button) becomes a **popover trigger**:
- Wrap the store info area in a `Popover` / `PopoverTrigger`
- `PopoverContent` renders a compact list of `TenantSwitcherItem` rows (current store first with checkmark, others below)
- Fetch `GET /api/user/tenants` on mount (sidebar is always visible, small cost)
- If only 1 store: popover still opens but shows just the one store with checkmark (no switcher needed, but consistent)
- The eye "View Store" button remains — clicking it still opens the storefront, does not trigger the popover
- Collapsed sidebar: the logo becomes the trigger; popover opens to the right

## URL Construction Helper

```ts
// lib/tenant/switcher-url.ts
export function tenantAdminUrl(slug: string, domain: string | null, locale: string): string {
  if (domain) return `https://${domain}/${locale}/admin`;
  const { hostname, port } = window.location;
  if (hostname === "localhost") return `http://localhost:${port}/${locale}/admin`; // needs __tenant cookie
  if (hostname.includes("lvh.me")) return `http://${slug}.lvh.me:${port}/${locale}/admin`;
  const parts = hostname.split(".");
  const baseDomain = parts.slice(-2).join(".");
  return `https://${slug}.${baseDomain}/${locale}/admin`;
}
```

Note: for `localhost`, subdomain routing doesn't work — use `lvh.me` for local multi-tenant testing (already documented in project memory).

## Files Touched

| Action | File |
|--------|------|
| Create | `app/api/user/tenants/route.ts` |
| Create | `components/tenant-switcher-item.tsx` |
| Create | `lib/tenant/switcher-url.ts` |
| Modify | `components/user-avatar-menu.tsx` |
| Modify | `components/admin/admin-sidebar.tsx` |

## Out of Scope

- Super admin "all tenants" view (already exists at `/admin/super/tenants`)
- Aggregate cross-store dashboard
- Assigning roles to other users (already exists in staff management)
