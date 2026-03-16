import { headers } from "next/headers";
import { cache } from "react";

import { prisma } from "@/lib/db";

/**
 * Resolve a tenant from the request hostname.
 *
 * Resolution order:
 *  1. Exact domain match (e.g. custom domain "app.figata.gr")
 *  2. Subdomain slug match (e.g. "figata.lvh.me" → slug "figata")
 */
export const getTenantByDomain = cache(async (host: string) => {
  // Strip port (e.g. "figata.lvh.me:3000" → "figata.lvh.me")
  const domain = host.split(":")[0];
  // Extract subdomain slug (e.g. "figata.lvh.me" → "figata")
  const slug = domain.split(".")[0];

  return prisma.tenant.findFirst({
    where: {
      OR: [{ domain }, { slug }],
      isActive: true,
    },
    include: { config: true },
  });
});

/**
 * Resolve the tenant from the current request's x-tenant-host header.
 * Convenience wrapper around getTenantByDomain for server components/routes.
 */
export async function getRequestTenant() {
  const headerList = await headers();
  const host = headerList.get("x-tenant-host") || "localhost:3000";
  return getTenantByDomain(host);
}

export const getTenantBySlug = cache(async (slug: string) => {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { config: true },
  });
});
