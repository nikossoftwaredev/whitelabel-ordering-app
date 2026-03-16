import {
  FileText,
  LayoutDashboard,
  LucideIcon,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
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
  Store: [
    { label: "Dashboard", href: "", icon: LayoutDashboard },
    { label: "Orders", href: "orders", icon: ShoppingBag },
    { label: "Menu", href: "menu", icon: UtensilsCrossed },
  ],
  Management: [
    { label: "Customers", href: "customers", icon: UserSearch },
    { label: "Staff", href: "staff", icon: Users },
    { label: "Invoices", href: "invoices", icon: FileText },
  ],
  System: [
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
