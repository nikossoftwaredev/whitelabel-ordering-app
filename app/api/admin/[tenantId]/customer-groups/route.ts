import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string }> };

// List all customer groups for this tenant with member count
export async function GET(_request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const groups = await prisma.customerGroup.findMany({
    where: { tenantId },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(groups);
}

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  customerIds: z.array(z.string().cuid()).optional(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).optional(),
  discountValue: z.number().int().min(0).optional(),
  minOrder: z.number().int().min(0).optional(),
  maxDiscount: z.number().int().min(0).optional(),
  description: z.string().max(200).optional(),
  discountEnabled: z.boolean().optional(),
});

// Create a new customer group with optional initial members
export async function POST(request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, customerIds, discountType, discountValue, minOrder, maxDiscount, description, discountEnabled } = parsed.data;

  // Check name uniqueness within tenant
  const existing = await prisma.customerGroup.findUnique({
    where: { tenantId_name: { tenantId, name } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A group with this name already exists" },
      { status: 409 }
    );
  }

  // Validate that all customerIds belong to this tenant
  if (customerIds && customerIds.length > 0) {
    const validCustomers = await prisma.customer.count({
      where: { id: { in: customerIds }, tenantId },
    });
    if (validCustomers !== customerIds.length) {
      return NextResponse.json(
        { error: "One or more customers do not belong to this tenant" },
        { status: 400 }
      );
    }
  }

  const group = await prisma.customerGroup.create({
    data: {
      tenantId,
      name,
      discountType: discountType ?? null,
      discountValue: discountValue ?? null,
      minOrder: minOrder ?? null,
      maxDiscount: maxDiscount ?? null,
      description: description ?? null,
      discountEnabled: discountEnabled ?? false,
      ...(customerIds && customerIds.length > 0
        ? {
            members: {
              create: customerIds.map((customerId) => ({ customerId })),
            },
          }
        : {}),
    },
    include: {
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(group, { status: 201 });
}
