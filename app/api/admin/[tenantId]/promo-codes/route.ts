import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  try {
    const promoCodes = await prisma.promoCode.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { usages: true } } },
    });

    return NextResponse.json(promoCodes);
  } catch (err) {
    console.error("[Promo GET]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
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
    code,
    type = "FIXED",
    value,
    minOrder = 0,
    maxDiscount,
    maxUses,
    maxUsesPerUser = 1,
    startDate,
    endDate,
  } = body;

  if (!code || !value) {
    return NextResponse.json(
      { error: "Code and value are required" },
      { status: 400 }
    );
  }

  // Check for duplicate code
  const existing = await prisma.promoCode.findUnique({
    where: { tenantId_code: { tenantId, code: code.toUpperCase() } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A promo code with this code already exists" },
      { status: 409 }
    );
  }

  const promoCode = await prisma.promoCode.create({
    data: {
      tenantId,
      code: code.toUpperCase(),
      type,
      value,
      minOrder,
      maxDiscount: maxDiscount || null,
      maxUses: maxUses || null,
      maxUsesPerUser,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  return NextResponse.json(promoCode, { status: 201 });
}
