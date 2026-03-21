import type { TenantConfig } from "@prisma/client";

export const generateBrandStyles = (config: TenantConfig | null): string => {
  if (!config) return "";

  const fontLine = config.fontFamily
    ? `--brand-font: "${config.fontFamily}", var(--font-roboto);`
    : "";

  return `
    :root {
      --brand-primary: ${config.primaryColor};
      --brand-secondary: ${config.secondaryColor};
      --brand-accent: ${config.accentColor};
      ${fontLine}
    }
  `;
};
