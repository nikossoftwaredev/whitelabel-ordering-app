import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { validatePromoCode } from "@/lib/promo/validate";
import { apiLimiter } from "@/lib/security/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await apiLimiter.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { code, subtotal } = await request.json();
  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const result = await validatePromoCode(tenant.id, code, subtotal || 0);
  if (!result.valid) {
    const status = result.error === "Invalid promo code" ? 404 : 400;
    return NextResponse.json(
      { error: result.error, ...(result.minOrder ? { minOrder: result.minOrder } : {}) },
      { status }
    );
  }

  // Check per-user usage
  const customer = await prisma.customer.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
  });
  if (customer) {
    const userUsages = await prisma.promoCodeUsage.count({
      where: { promoCodeId: result.promo.id, customerId: customer.id },
    });
    if (userUsages >= result.promo.maxUsesPerUser) {
      return NextResponse.json(
        { error: "You have already used this promo code" },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    valid: true,
    code: result.promo.code,
    type: result.promo.type,
    value: result.promo.value,
    discount: result.discount,
    maxDiscount: result.promo.maxDiscount,
  });
}
