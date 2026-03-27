import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { invalidateMenuCache } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";
import { deleteFile } from "@/lib/files/upload";

type Params = { params: Promise<{ tenantId: string; productId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { tenantId, productId } = await params;
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
    isActive,
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
    hasPreset,
    presetOptionIds,
    freeCountByGroup,
  } = body;

  // If image is being changed, track the old one for cleanup
  let oldImageUrl: string | null = null;
  if (image !== undefined) {
    const existing = await prisma.product.findUnique({
      where: { id: productId, tenantId },
      select: { image: true },
    });
    if (existing?.image && existing.image !== image) {
      oldImageUrl = existing.image;
    }
  }

  // Update modifier group attachments if provided
  if (modifierGroupIds !== undefined) {
    await prisma.productModifierGroup.deleteMany({
      where: { productId },
    });
    if (modifierGroupIds.length > 0) {
      await prisma.productModifierGroup.createMany({
        data: modifierGroupIds.map((groupId: string, i: number) => ({
          productId,
          modifierGroupId: groupId,
          sortOrder: i,
          freeCount: freeCountByGroup?.[groupId] ?? 0,
        })),
      });
    }
  }

  const product = await prisma.product.update({
    where: { id: productId, tenantId },
    data: {
      ...(categoryId !== undefined && { categoryId }),
      ...(name !== undefined && { name }),
      ...(nameEl !== undefined && { nameEl }),
      ...(description !== undefined && { description }),
      ...(descriptionEl !== undefined && { descriptionEl }),
      ...(image !== undefined && { image }),
      ...(price !== undefined && { price }),
      ...(isActive !== undefined && { isActive }),
      ...(isVegan !== undefined && { isVegan }),
      ...(isVegetarian !== undefined && { isVegetarian }),
      ...(isGlutenFree !== undefined && { isGlutenFree }),
      ...(isDairyFree !== undefined && { isDairyFree }),
      ...(containsNuts !== undefined && { containsNuts }),
      ...(isSpicy !== undefined && { isSpicy }),
      ...(allergens !== undefined && { allergens }),
      ...(hasPreset !== undefined && { hasPreset }),
      ...(presetOptionIds !== undefined && { presetOptionIds }),
      ...(offerType !== undefined && { offerType: offerType || null }),
      ...(offerPrice !== undefined && { offerPrice: offerPrice ?? null }),
      ...(offerStart !== undefined && { offerStart: offerStart ? new Date(offerStart) : null }),
      ...(offerEnd !== undefined && { offerEnd: offerEnd ? new Date(offerEnd) : null }),
    },
    include: {
      category: { select: { id: true, name: true } },
      modifierGroups: {
        include: { modifierGroup: { include: { options: true } } },
      },
    },
  });

  if (oldImageUrl) {
    deleteFile(oldImageUrl).catch(() => {});
  }

  await invalidateMenuCache(tenantId);

  return NextResponse.json(product);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { tenantId, productId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const product = await prisma.product.findUnique({
    where: { id: productId, tenantId },
    select: { image: true },
  });

  await prisma.product.delete({
    where: { id: productId, tenantId },
  });

  if (product?.image) {
    deleteFile(product.image).catch(() => {});
  }

  await invalidateMenuCache(tenantId);

  return NextResponse.json({ success: true });
}
