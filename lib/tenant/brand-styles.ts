import type { TenantConfig } from "@prisma/client";

export const generateBrandStyles = (config: TenantConfig | null): string => {
  if (!config) return "";

  return `
    :root {
      --brand-primary: ${config.primaryColor};
      --brand-secondary: ${config.secondaryColor};
      --brand-accent: ${config.accentColor};
    }
  `;
};
