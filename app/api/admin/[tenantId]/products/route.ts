import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const categoryId = request.nextUrl.searchParams.get("categoryId");

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      ...(categoryId && { categoryId }),
    },
    orderBy: { sortOrder: "asc" },
    include: {
      category: { select: { id: true, name: true } },
      modifierGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          modifierGroup: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(products);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const {
    categoryId,
    name,
    nameEl,
    description,
    descriptionEl,
    image,
    price,
    isVegan,
    isVegetarian,
    isGlutenFree,
    isDairyFree,
    containsNuts,
    isSpicy,
    allergens,
    modifierGroupIds,
    offerType,
    offerPrice,
    offerStart,
    offerEnd,
  } = body;

  if (!name || !categoryId || price === undefined) {
    return NextResponse.json(
      { error: "name, categoryId, and price are required" },
      { status: 400 }
    );
  }

  const maxSort = await prisma.product.aggregate({
    where: { tenantId, categoryId },
    _max: { sortOrder: true },
  });

  const product = await prisma.product.create({
    data: {
      tenantId,
      categoryId,
      name,
      nameEl,
      description,
      descriptionEl,
      image,
      price,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      isVegan: isVegan ?? false,
      isVegetarian: isVegetarian ?? false,
      isGlutenFree: isGlutenFree ?? false,
      isDairyFree: isDairyFree ?? false,
      containsNuts: containsNuts ?? false,
      isSpicy: isSpicy ?? false,
      allergens,
      offerType: offerType || null,
      offerPrice: offerPrice ?? null,
      offerStart: offerStart ? new Date(offerStart) : null,
      offerEnd: offerEnd ? new Date(offerEnd) : null,
      ...(modifierGroupIds?.length && {
        modifierGroups: {
          create: modifierGroupIds.map((groupId: string, i: number) => ({
            modifierGroupId: groupId,
            sortOrder: i,
          })),
        },
      }),
    },
    include: {
      category: { select: { id: true, name: true } },
      modifierGroups: {
        include: { modifierGroup: { include: { options: true } } },
      },
    },
  });

  return NextResponse.json(product, { status: 201 });
}
