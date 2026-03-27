"use cache";

import { cacheTag } from "next/cache";

import { prisma } from "@/lib/db";

export async function getCachedMenu(tenantId: string, tenantSlug: string) {
  cacheTag(`menu-${tenantSlug}`);

  const categories = await prisma.category.findMany({
    where: { tenantId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      nameEl: true,
      description: true,
      image: true,
      products: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          nameEl: true,
          description: true,
          descriptionEl: true,
          image: true,
          price: true,
          hasPreset: true,
          presetOptionIds: true,
          isVegan: true,
          isVegetarian: true,
          isGlutenFree: true,
          isDairyFree: true,
          containsNuts: true,
          isSpicy: true,
          allergens: true,
          offerType: true,
          offerPrice: true,
          offerStart: true,
          offerEnd: true,
          modifierGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              freeCount: true,
              modifierGroup: {
                select: {
                  id: true,
                  name: true,
                  nameEl: true,
                  required: true,
                  minSelect: true,
                  maxSelect: true,
                  options: {
                    where: { isActive: true },
                    orderBy: { sortOrder: "asc" },
                    select: {
                      id: true,
                      name: true,
                      nameEl: true,
                      priceAdjustment: true,
                      isDefault: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  return categories.map((cat) => ({
    ...cat,
    products: cat.products.map((product) => ({
      ...product,
      modifierGroups: product.modifierGroups.map((pmg) => ({
        ...pmg.modifierGroup,
        freeCount: pmg.freeCount,
      })),
    })),
  }));
}

export async function getCachedPopularProducts(tenantId: string, tenantSlug: string) {
  cacheTag(`popular-${tenantSlug}`);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const popularRaw = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { tenantId, createdAt: { gte: weekStart } },
      product: { isActive: true },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  return popularRaw.map((p) => p.productId);
}
