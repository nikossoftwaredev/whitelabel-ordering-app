"use cache";

import { cacheTag } from "next/cache";

import { prisma } from "@/lib/db";

/**
 * Cached tenant lookup by slug. Serves all customer-facing routes.
 * Cached forever until invalidated by `revalidateTag("tenant-{slug}")`.
 */
export async function getCachedTenantBySlug(slug: string) {
  cacheTag(`tenant-${slug}`);

  return prisma.tenant.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      isPaused: true,
      timezone: true,
      currency: true,
      phone: true,
      email: true,
      address: true,
      prepTimeMinutes: true,
      storeLat: true,
      storeLng: true,
      deliveryRangeKm: true,
      stripeAccountId: true,
      config: {
        select: {
          logo: true,
          coverImage: true,
          description: true,
          primaryColor: true,
          loyaltyEnabled: true,
          loyaltyRequiredOrders: true,
          loyaltyRewardAmount: true,
        },
      },
      operatingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: {
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
        },
      },
    },
  });
}
