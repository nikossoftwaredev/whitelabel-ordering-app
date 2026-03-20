import type { MetadataRoute } from "next";
import { cookies, headers } from "next/headers";

import { getTenantByDomain } from "@/lib/tenant/resolve";
import { getBaseUrl } from "@/lib/tenant/url";

/**
 * Dynamic web app manifest — resolved per-tenant from the requesting domain.
 *
 * Uses headers() which opts this into dynamic rendering, so each domain
 * gets its own manifest with the correct store name, icons, and colors.
 *
 * Next.js serves this at /manifest.webmanifest and auto-adds the
 * <link rel="manifest"> tag to <head>.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Resolve tenant the same way the middleware does:
  // 1. Check __tenant cookie (Vercel preview URL fallback)
  // 2. Fall back to raw host header
  const cookieStore = await cookies();
  const headerList = await headers();
  const tenantCookie = cookieStore.get("__tenant")?.value;
  const host = tenantCookie
    ? `${tenantCookie}.app`
    : headerList.get("x-tenant-host") || headerList.get("host") || "localhost:3000";

  const tenant = await getTenantByDomain(host);

  if (!tenant) {
    return {
      name: "Order App",
      short_name: "Order",
      start_url: "/order",
      display: "standalone",
      icons: [],
    };
  }

  const config = tenant.config;
  const baseUrl = getBaseUrl(host);

  // Use the tenant's uploaded logo for PWA icons when available.
  // Browsers will resize as needed. Fall back to generic static icons.
  const tenantLogo = config?.logo || config?.logoSmall;

  const icons: MetadataRoute.Manifest["icons"] = tenantLogo
    ? [
        { src: tenantLogo, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: tenantLogo, sizes: "512x512", type: "image/png", purpose: "any" },
      ]
    : [
        { src: "/images/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/images/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ];

  return {
    id: `${baseUrl}/order`,
    name: config?.pwaName || tenant.name || "Order App",
    short_name: config?.pwaShortName || tenant.name?.slice(0, 12) || "Order",
    description: config?.description || `Order online from ${tenant.name}`,
    start_url: "/order",
    scope: "/",
    display: "standalone",
    background_color: config?.pwaBgColor || "#ffffff",
    theme_color: config?.pwaThemeColor || config?.primaryColor || "#000000",
    orientation: "portrait",
    icons,
  };
}
