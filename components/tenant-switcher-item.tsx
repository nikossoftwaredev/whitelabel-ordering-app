"use client";

import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import { tenantAdminUrl } from "@/lib/tenant/switcher-url";

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
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
      aria-current={isActive ? "true" : undefined}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors duration-300 cursor-pointer text-left"
    >
      {/* Logo or initial fallback */}
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-md overflow-hidden"
        style={{ backgroundColor: tenant.primaryColor ?? "hsl(var(--primary))" }}
      >
        {tenant.logo ? (
          <img
            src={tenant.logo}
            alt={tenant.name}
            className="size-full object-contain p-0.5"
          />
        ) : (
          <span className="text-xs font-bold text-white">
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
