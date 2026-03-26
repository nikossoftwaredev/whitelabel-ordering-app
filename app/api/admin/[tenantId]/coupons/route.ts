import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { computeExpiresAt, generateCouponCode } from "@/lib/coupons/validate";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string }> };

// List all coupons for this tenant
export async function GET(request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "available" | "used" | "expired"
  const customerId = searchParams.get("customerId");
  const source = searchParams.get("source"); // "MILESTONE" | "MANUAL"

  const now = new Date();

  const where: Record<string, unknown> = { tenantId };
  if (customerId) where.customerId = customerId;
  if (source) where.source = source;

  if (status === "available") {
    where.isUsed = false;
    where.isActive = true;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: now } }];
  } else if (status === "used") {
    where.isUsed = true;
  } else if (status === "expired") {
    where.isUsed = false;
    where.isActive = true;
    where.expiresAt = { not: null, lte: now };
  }

  const coupons = await prisma.coupon.findMany({
    where,
    include: {
      customer: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(coupons);
}

const createCouponSchema = z.object({
  customerId: z.string().cuid(),
  noExpiry: z.boolean().default(false),
  type: z.enum(["FIXED", "PERCENTAGE"]),
  value: z.number().int().min(1),
  description: z.string().max(200).optional(),
  minOrder: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(0).optional(),
  validDays: z.number().int().min(1).max(365).default(30),
});

// Create a manual coupon for a specific customer
export async function POST(request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const parsed = createCouponSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    customerId,
    noExpiry,
    type,
    value,
    description,
    minOrder,
    maxDiscount,
    validDays,
  } = parsed.data;

  // Single-use coupon for a specific customer
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
  });
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Generate unique code with retry
  let code: string;
  let attempts = 0;
  do {
    code = generateCouponCode("GIFT");
    const existing = await prisma.coupon.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    if (!existing) break;
    attempts++;
  } while (attempts < 5);

  const expiresAt = computeExpiresAt(noExpiry, validDays);

  const coupon = await prisma.coupon.create({
    data: {
      tenantId,
      customerId,
      code,
      type,
      value,
      description: description || "Gift from the store",
      minOrder: minOrder || null,
      maxDiscount: maxDiscount || null,
      expiresAt,
      source: "MANUAL",
    },
    include: {
      customer: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}
