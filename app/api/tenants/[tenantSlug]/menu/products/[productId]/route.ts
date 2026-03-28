import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { apiLimiter, getClientIp } from "@/lib/security/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; productId: string }> }
) {
  const { success } = await apiLimiter.limit(getClientIp(request));
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { tenantSlug, productId } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: { id: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: tenant.id, isActive: true },
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
      category: { select: { id: true, name: true, nameEl: true } },
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
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...product,
    modifierGroups: product.modifierGroups.map((pmg) => ({
      ...pmg.modifierGroup,
      freeCount: pmg.freeCount,
    })),
  });
}
