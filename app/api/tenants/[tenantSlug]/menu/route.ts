import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      isPaused: true,
      prepTimeMinutes: true,
      currency: true,
      phone: true,
      email: true,
      address: true,
      config: {
        select: { logo: true, coverImage: true, description: true },
      },
      operatingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, isActive: true },
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

  // Flatten modifier groups structure
  const formattedCategories = categories.map((cat) => ({
    ...cat,
    products: cat.products.map((product) => ({
      ...product,
      modifierGroups: product.modifierGroups.map((pmg) => pmg.modifierGroup),
    })),
  }));

  // Popular products — top 5 by order volume (last 7 days)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const popularRaw = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: { tenantId: tenant.id, createdAt: { gte: weekStart } },
      product: { isActive: true },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const popularProductIds = popularRaw.map((p) => p.productId);

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      isPaused: tenant.isPaused,
      prepTimeMinutes: tenant.prepTimeMinutes,
      currency: tenant.currency,
      logo: tenant.config?.logo,
      coverImage: tenant.config?.coverImage,
      description: tenant.config?.description,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      operatingHours: tenant.operatingHours,
    },
    categories: formattedCategories,
    popularProductIds,
  });
}
