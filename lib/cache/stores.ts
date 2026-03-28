"use cache";

import { cacheTag } from "next/cache";

import { prisma } from "@/lib/db";

export type CachedStore = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  logo: string | null;
  primaryColor: string;
};

/**
 * Cached store list for the StoreSelector screen.
 * Cached forever until invalidated by `revalidateTag("stores")`.
 * Bust this when a tenant is created, updated, or deactivated.
 */
export async function getCachedStores(): Promise<CachedStore[]> {
  cacheTag("stores");

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      config: {
        select: {
          logo: true,
          primaryColor: true,
        },
      },
    },
  });

  return tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    address: t.address,
    logo: t.config?.logo ?? null,
    primaryColor: t.config?.primaryColor ?? "#000000",
  }));
}
