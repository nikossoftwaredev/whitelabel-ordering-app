# Multi-Store Switcher Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a user who owns multiple stores switch between them from the avatar dropdown (all views) and the admin sidebar footer (admin panel).

**Architecture:** New `GET /api/user/tenants` endpoint returns all tenants the user has a role in. A shared `TenantSwitcherItem` component renders a logo row used in both the avatar dropdown (lazy-fetched on open) and the admin sidebar footer (Popover on click). Navigation is `window.location.href` since tenants are on different subdomains.

**Tech Stack:** Next.js App Router, Prisma, shadcn/ui (DropdownMenu, Popover), next-auth session, Lucide icons.

---

### Task 1: API — `GET /api/user/tenants`

**Files:**
- Create: `app/api/user/tenants/route.ts`

**Step 1: Create the route**

```ts
// app/api/user/tenants/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 });
  }

  const roles = await prisma.tenantRole.findMany({
    where: { userId: session.user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          config: { select: { logo: true } },
        },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  const tenants = roles.map((r) => ({
    id: r.tenant.id,
    name: r.tenant.name,
    slug: r.tenant.slug,
    logo: r.tenant.config?.logo ?? null,
    domain: r.tenant.domain ?? null,
    role: r.role,
  }));

  return NextResponse.json(tenants);
}
```

**Step 2: Verify TypeScript**

```bash
cd c:/Users/nikos/Desktop/repos/whitelabel-ordering-app && pnpm tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add app/api/user/tenants/route.ts
git commit -m "feat: add GET /api/user/tenants endpoint"
```

---

### Task 2: URL helper — `lib/tenant/switcher-url.ts`

**Files:**
- Create: `lib/tenant/switcher-url.ts`

**Step 1: Create the helper**

```ts
// lib/tenant/switcher-url.ts
/**
 * Constructs the admin URL for a tenant given the current browser context.
 * Call this only on the client (uses window.location).
 */
export function tenantAdminUrl(
  slug: string,
  domain: string | null,
  locale: string
): string {
  if (domain) return `https://${domain}/${locale}/admin`;

  const { hostname, port, protocol } = window.location;
  const portStr = port ? `:${port}` : "";

  // lvh.me — wildcard subdomain works locally
  if (hostname.includes("lvh.me")) {
    return `${protocol}//${slug}.lvh.me${portStr}/${locale}/admin`;
  }

  // localhost — subdomain routing not supported, fall back to lvh.me guidance
  if (hostname === "localhost") {
    return `http://${slug}.lvh.me${portStr}/${locale}/admin`;
  }

  // Production: strip leftmost subdomain to get root domain
  const parts = hostname.split(".");
  const baseDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
  return `https://${slug}.${baseDomain}/${locale}/admin`;
}
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add lib/tenant/switcher-url.ts
git commit -m "feat: add tenantAdminUrl helper for cross-subdomain navigation"
```

---

### Task 3: Shared component — `TenantSwitcherItem`

**Files:**
- Create: `components/tenant-switcher-item.tsx`

**Step 1: Create the component**

```tsx
// components/tenant-switcher-item.tsx
"use client";

import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import { tenantAdminUrl } from "@/lib/tenant/switcher-url";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  domain: string | null;
  role: string;
}

interface TenantSwitcherItemProps {
  tenant: TenantSummary;
  isActive?: boolean;
  onNavigate?: () => void;
}

export const TenantSwitcherItem = ({
  tenant,
  isActive = false,
  onNavigate,
}: TenantSwitcherItemProps) => {
  const locale = useLocale();

  const handleClick = () => {
    onNavigate?.();
    window.location.href = tenantAdminUrl(tenant.slug, tenant.domain, locale);
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors duration-150 cursor-pointer text-left"
    >
      {/* Logo or initial fallback */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md overflow-hidden bg-muted">
        {tenant.logo ? (
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-full object-contain p-0.5"
          />
        ) : (
          <span
            className="text-xs font-bold text-white"
            style={{ backgroundColor: "hsl(var(--primary))" }}
          >
            {tenant.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 truncate font-medium">{tenant.name}</span>

      {/* Active checkmark */}
      {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
    </button>
  );
};
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

**Step 3: Commit**

```bash
git add components/tenant-switcher-item.tsx lib/tenant/switcher-url.ts
git commit -m "feat: add TenantSwitcherItem shared component"
```

---

### Task 4: Update avatar dropdown — `UserAvatarMenu`

**Files:**
- Modify: `components/user-avatar-menu.tsx`

**Context:** Currently the component fetches `/api/user/role` on mount when `showCustomerLinks=true` and shows a single "Admin Panel" link if `isAdmin`. We're replacing this with a lazy fetch of `/api/user/tenants` triggered when the dropdown opens, showing a "My Stores" section with one row per tenant.

**Step 1: Replace the `isAdmin` state and fetch**

Remove:
```ts
const [isAdmin, setIsAdmin] = useState(false);

useEffect(() => {
  if (!user || !showCustomerLinks) {
    setIsAdmin(false);
    return;
  }
  fetch("/api/user/role")
    .then((r) => r.json())
    .then((data) => setIsAdmin(data.isAdmin))
    .catch(() => setIsAdmin(false));
}, [user, showCustomerLinks]);
```

Add:
```ts
const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
const [tenantsLoading, setTenantsLoading] = useState(false);

const fetchTenants = useCallback(() => {
  if (!user || !showCustomerLinks || tenants !== null) return;
  setTenantsLoading(true);
  fetch("/api/user/tenants")
    .then((r) => r.json())
    .then((data) => setTenants(data))
    .catch(() => setTenants([]))
    .finally(() => setTenantsLoading(false));
}, [user, showCustomerLinks, tenants]);
```

**Step 2: Add import for `TenantSummary` and `useCallback`**

At the top:
```ts
import { useCallback, useEffect, useState } from "react";
import { TenantSummary, TenantSwitcherItem } from "@/components/tenant-switcher-item";
```

Remove `useEffect` from import if it's no longer needed (it won't be — the fetch is now triggered by `onOpenChange`).

**Step 3: Wire `onOpenChange` to trigger the fetch**

Find the `<DropdownMenu>` opening tag and add:
```tsx
<DropdownMenu onOpenChange={(open) => { if (open) fetchTenants(); }}>
```

**Step 4: Replace the "Admin Panel" block with "My Stores" section**

Remove:
```tsx
{isAdmin && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link href="/admin">
        <Settings className="mr-2 size-4" />
        Admin Panel
      </Link>
    </DropdownMenuItem>
  </>
)}
```

Add (inside the `{showCustomerLinks && (...)}` block, after the My Orders item):
```tsx
{showCustomerLinks && (tenants === null || tenants.length > 0) && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1">
      My Stores
    </DropdownMenuLabel>
    {tenantsLoading || tenants === null ? (
      // Loading skeletons
      <>
        <div className="mx-2 my-1 h-8 rounded-md bg-muted animate-pulse" />
        <div className="mx-2 my-1 h-8 rounded-md bg-muted animate-pulse" />
      </>
    ) : (
      tenants.map((tenant) => (
        <TenantSwitcherItem key={tenant.id} tenant={tenant} />
      ))
    )}
  </>
)}
```

Note: `(tenants === null || tenants.length > 0)` shows the section while loading (null) and when there are tenants, hides it when the array is empty (pure customer, no stores).

**Step 5: Remove unused imports**

`Settings` icon is now only used for the standalone "Settings" menu item — keep it. Remove it only if it's fully unused after the edit.

**Step 6: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

**Step 7: Commit**

```bash
git add components/user-avatar-menu.tsx
git commit -m "feat: replace Admin Panel link with My Stores switcher in avatar dropdown"
```

---

### Task 5: Update admin sidebar footer — store switcher popover

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Context:** The sidebar footer currently shows the tenant logo + name + an eye button (opens storefront). We're wrapping the store info area in a `Popover` that opens a list of the user's stores for switching. The eye button remains unchanged.

**Step 1: Add imports**

Add to existing imports:
```ts
import { ChevronsUpDown } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { TenantSummary, TenantSwitcherItem } from "@/components/tenant-switcher-item";
import { useTenant } from "@/components/tenant-provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
```

(`useTenant` is already imported — keep it.)

**Step 2: Add state and fetch inside the component**

After `const tenant = useTenant();` add:
```ts
const { data: session } = useSession();
const [tenants, setTenants] = useState<TenantSummary[]>([]);

useEffect(() => {
  if (!session?.user) return;
  fetch("/api/user/tenants")
    .then((r) => r.json())
    .then(setTenants)
    .catch(() => {});
}, [session?.user]);
```

**Step 3: Replace the store footer content**

The current footer `<SidebarMenuButton size="lg" asChild>` wraps a `<div>` with the logo + name + eye button. Replace the entire `<SidebarMenuButton>` with a Popover:

```tsx
<SidebarMenuItem>
  <Popover>
    <PopoverTrigger asChild>
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
        tooltip={tenant.name}
      >
        {/* Store logo */}
        {tenant.logo ? (
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-muted">
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="size-full object-contain p-0.5"
            />
          </div>
        ) : (
          <div
            className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}
          >
            <span className="text-white text-sm font-bold">
              {tenant.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{tenant.name}</span>
          <span className="truncate text-xs text-muted-foreground">Switch store</span>
        </div>
        <ChevronsUpDown className="ms-auto size-4 shrink-0" />
      </SidebarMenuButton>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="start"
      className="w-64 p-2"
      sideOffset={8}
    >
      <p className="px-2 py-1 text-xs font-medium text-muted-foreground mb-1">
        My Stores
      </p>
      {tenants.map((t) => (
        <TenantSwitcherItem
          key={t.id}
          tenant={t}
          isActive={t.id === tenant.id}
        />
      ))}
      {tenants.length === 0 && (
        <p className="px-2 py-2 text-xs text-muted-foreground">Loading…</p>
      )}
    </PopoverContent>
  </Popover>

  {/* Keep the View Store eye button separately */}
  <Button variant="ghost" size="icon" className="absolute right-2 size-7" asChild>
    <Link href="/order" target="_blank">
      <Eye className="size-3.5" />
    </Link>
  </Button>
</SidebarMenuItem>
```

Note: The eye button is moved outside the PopoverTrigger so clicking it doesn't open the popover. Use `relative` positioning on `<SidebarMenuItem>` if needed: `<SidebarMenuItem className="relative">`.

**Step 4: Remove the old `asChild` from SidebarMenuButton**

The previous implementation had `<SidebarMenuButton size="lg" asChild>` wrapping a plain div. The new one doesn't use `asChild` (it's a button itself). Make sure the `asChild` prop is removed.

**Step 5: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

**Step 6: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat: add store switcher popover to admin sidebar footer"
```

---

### Task 6: Manual verification

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Test avatar dropdown (customer view)**

- Navigate to `http://tenant1.lvh.me:3000/en/order`
- Sign in as a user who has roles in 2+ tenants
- Click avatar → confirm "My Stores" section appears with logo rows
- Click a different store → confirm navigation to that store's admin

**Step 3: Test avatar dropdown (single store)**

- Sign in as a user with exactly 1 tenant role
- Click avatar → confirm "My Stores" shows with 1 row

**Step 4: Test admin sidebar**

- Navigate to `http://tenant1.lvh.me:3000/en/admin`
- Confirm footer shows store name with "Switch store" subtitle and chevron
- Click footer → popover opens with store list, active store has checkmark
- Click another store → navigates to that store's admin

**Step 5: Test pure customer (no stores)**

- Sign in as a user with no TenantRole records
- Click avatar → confirm "My Stores" section is hidden entirely
