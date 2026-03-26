import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string; couponId: string }> };

// Revoke (deactivate) an unused coupon
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { tenantId, couponId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, tenantId },
  });

  if (!coupon) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  if (coupon.isUsed) {
    return NextResponse.json(
      { error: "Cannot revoke a coupon that has already been used" },
      { status: 400 }
    );
  }

  await prisma.coupon.update({
    where: { id: couponId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
