import { cache } from "react";
import type { Tenant, TenantConfig } from "@prisma/client";

export type TenantWithConfig = Tenant & { config: TenantConfig | null };

const tenantStore = cache(() => ({
  tenant: null as TenantWithConfig | null,
}));

export const setCurrentTenant = (tenant: TenantWithConfig) => {
  tenantStore().tenant = tenant;
};

export const getCurrentTenant = (): TenantWithConfig | null => {
  return tenantStore().tenant;
};

export const requireCurrentTenant = (): TenantWithConfig => {
  const tenant = getCurrentTenant();
  if (!tenant) throw new Error("No tenant in context");
  return tenant;
};
