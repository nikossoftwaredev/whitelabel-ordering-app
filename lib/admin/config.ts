import {
  ChefHat,
  FileText,
  LayoutDashboard,
  LucideIcon,
  MessageCircle,
  Settings,
  Shield,
  ShoppingBag,
  Tag,
  Ticket,
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
  Overview: [{ label: "Dashboard", href: "", icon: LayoutDashboard }],
  Operations: [
    { label: "Orders", href: "orders", icon: ShoppingBag },
    { label: "Kitchen", href: "kitchen", icon: ChefHat },
    { label: "Menu", href: "menu", icon: UtensilsCrossed },
    { label: "Delivery", href: "delivery", icon: Truck },
    { label: "Chat", href: "chat", icon: MessageCircle },
  ],
  People: [
    { label: "Customers", href: "customers", icon: UserSearch },
    { label: "Staff", href: "staff", icon: Users },
  ],
  Marketing: [
    { label: "Coupons", href: "coupons", icon: Ticket },
    { label: "Promo Codes", href: "promo-codes", icon: Tag },
  ],
  Finance: [{ label: "Invoices", href: "invoices", icon: FileText }],
  Settings: [{ label: "Settings", href: "settings", icon: Settings }],
  Platform: [
    {
      label: "Tenants",
      href: "super/tenants",
      icon: Shield,
      superAdminOnly: true,
    },
  ],
};
