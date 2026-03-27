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

  // localhost — subdomain routing not supported, fall back to lvh.me
  if (hostname === "localhost") {
    return `http://${slug}.lvh.me${portStr}/${locale}/admin`;
  }

  // Production: strip leftmost subdomain to get root domain
  const parts = hostname.split(".");
  const baseDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;
  return `https://${slug}.${baseDomain}/${locale}/admin`;
}
