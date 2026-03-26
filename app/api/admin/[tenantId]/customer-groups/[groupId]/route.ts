import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { requireGroup } from "@/lib/groups/require-group";

type Params = { params: Promise<{ tenantId: string; groupId: string }> };

// Get group detail with full member list
export async function GET(_request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const groupOrError = await requireGroup(groupId, tenantId);
  if (groupOrError instanceof NextResponse) return groupOrError;

  const group = await prisma.customerGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          customer: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(group);
}

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).nullable().optional(),
  discountValue: z.number().int().min(0).nullable().optional(),
  minOrder: z.number().int().min(0).nullable().optional(),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  description: z.string().max(200).nullable().optional(),
  discountEnabled: z.boolean().optional(),
});

// Update a customer group (name, discount config)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, discountType, discountValue, minOrder, maxDiscount, description, discountEnabled } = parsed.data;

  const groupOrError = await requireGroup(groupId, tenantId);
  if (groupOrError instanceof NextResponse) return groupOrError;

  // Check name uniqueness (excluding current group) if name is being changed
  if (name) {
    const existing = await prisma.customerGroup.findUnique({
      where: { tenantId_name: { tenantId, name } },
    });
    if (existing && existing.id !== groupId) {
      return NextResponse.json(
        { error: "A group with this name already exists" },
        { status: 409 }
      );
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (discountType !== undefined) data.discountType = discountType;
  if (discountValue !== undefined) data.discountValue = discountValue;
  if (minOrder !== undefined) data.minOrder = minOrder;
  if (maxDiscount !== undefined) data.maxDiscount = maxDiscount;
  if (description !== undefined) data.description = description;
  if (discountEnabled !== undefined) data.discountEnabled = discountEnabled;

  const updated = await prisma.customerGroup.update({
    where: { id: groupId },
    data,
    include: {
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(updated);
}

// Delete a customer group (cascades to members and recurring coupons via DB)
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const groupOrError = await requireGroup(groupId, tenantId);
  if (groupOrError instanceof NextResponse) return groupOrError;

  await prisma.customerGroup.delete({
    where: { id: groupId },
  });

  return NextResponse.json({ success: true });
}
