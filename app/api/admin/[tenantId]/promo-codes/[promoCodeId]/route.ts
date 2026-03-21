import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; promoCodeId: string }> }
) {
  const { tenantId, promoCodeId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const {
    code,
    type,
    value,
    minOrder,
    maxDiscount,
    maxUses,
    maxUsesPerUser,
    startDate,
    endDate,
    isActive,
  } = body;

  const promoCode = await prisma.promoCode.update({
    where: { id: promoCodeId, tenantId },
    data: {
      ...(code !== undefined && { code: code.toUpperCase() }),
      ...(type !== undefined && { type }),
      ...(value !== undefined && { value }),
      ...(minOrder !== undefined && { minOrder }),
      ...(maxDiscount !== undefined && { maxDiscount: maxDiscount || null }),
      ...(maxUses !== undefined && { maxUses: maxUses || null }),
      ...(maxUsesPerUser !== undefined && { maxUsesPerUser }),
      ...(startDate !== undefined && {
        startDate: startDate ? new Date(startDate) : null,
      }),
      ...(endDate !== undefined && {
        endDate: endDate ? new Date(endDate) : null,
      }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(promoCode);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string; promoCodeId: string }> }
) {
  const { tenantId, promoCodeId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  await prisma.promoCode.delete({
    where: { id: promoCodeId, tenantId },
  });

  return NextResponse.json({ success: true });
}
