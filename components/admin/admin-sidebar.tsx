"use client";

import { ChevronsUpDown, Command, Eye } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { useTenant } from "@/components/tenant-provider";
import { TenantSummary, TenantSwitcherItem } from "@/components/tenant-switcher-item";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { adminNavItems } from "@/lib/admin/config";
import { Link, usePathname } from "@/lib/i18n/navigation";

export const AdminSidebar = () => {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const tenant = useTenant();
  const { data: session } = useSession();
  const [tenants, setTenants] = useState<TenantSummary[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/tenants")
      .then((r) => r.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session?.user]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin" onClick={() => setOpenMobile(false)}>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Admin Panel</span>
                  <span className="truncate text-xs">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {Object.entries(adminNavItems).map(([group, buttons]) => {
          const visibleButtons = buttons.filter((b) => !b.superAdminOnly);
          if (visibleButtons.length === 0) return null;
          return (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleButtons.map((button) => {
                  const href = `/admin/${button.href}`;
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);

                  return (
                    <SidebarMenuItem key={button.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={button.label}
                      >
                        <Link href={href} onClick={() => setOpenMobile(false)}>
                          <button.icon className="size-4" />
                          <span>{button.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="relative">
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
                      className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary"
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
              <PopoverContent side="top" align="start" className="w-64 p-2" sideOffset={8}>
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground mb-1">
                  My Stores
                </p>
                {tenants.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">Loading…</div>
                ) : (
                  tenants.map((t) => (
                    <TenantSwitcherItem key={t.id} tenant={t} isActive={t.id === tenant.id} />
                  ))
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-7 shrink-0 z-10"
              asChild
            >
              <Link href="/order" target="_blank">
                <Eye className="size-3.5" />
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
