import {
  FileText,
  LayoutDashboard,
  LucideIcon,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  Truck,
  Users,
  UserSearch,
  UtensilsCrossed,
} from "lucide-react";

interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  superAdminOnly?: boolean;
}

export const adminNavItems: Record<string, AdminNavItem[]> = {
  Overview: [
    { label: "Dashboard", href: "", icon: LayoutDashboard },
  ],
  Operations: [
    { label: "Orders", href: "orders", icon: ShoppingBag },
    { label: "Menu", href: "menu", icon: UtensilsCrossed },
    { label: "Delivery", href: "delivery", icon: Truck },
  ],
  People: [
    { label: "Customers", href: "customers", icon: UserSearch },
    { label: "Staff", href: "staff", icon: Users },
  ],
  Finance: [
    { label: "Invoices", href: "invoices", icon: FileText },
  ],
  Settings: [
    { label: "Settings", href: "settings", icon: Settings },
  ],
  Platform: [
    {
      label: "Tenants",
      href: "super/tenants",
      icon: Shield,
      superAdminOnly: true,
    },
  ],
};
