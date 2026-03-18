"use client";

import { Command, Eye } from "lucide-react";

import { useTenant } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
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
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="View Store">
              <div className="flex items-center gap-2">
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
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 shrink-0"
                  asChild
                >
                  <Link href="/order" target="_blank">
                    <Eye className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
};
