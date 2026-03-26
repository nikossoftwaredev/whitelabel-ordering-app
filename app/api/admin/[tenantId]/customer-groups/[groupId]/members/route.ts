import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { requireGroup } from "@/lib/groups/require-group";

type Params = { params: Promise<{ tenantId: string; groupId: string }> };

const addMembersSchema = z.object({
  customerIds: z.array(z.string().cuid()).min(1),
});

// Add members to a customer group
export async function POST(request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const parsed = addMembersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { customerIds } = parsed.data;

  const groupOrError = await requireGroup(groupId, tenantId);
  if (groupOrError instanceof NextResponse) return groupOrError;

  // Validate all customers belong to this tenant
  const validCustomers = await prisma.customer.count({
    where: { id: { in: customerIds }, tenantId },
  });
  if (validCustomers !== customerIds.length) {
    return NextResponse.json(
      { error: "One or more customers do not belong to this tenant" },
      { status: 400 }
    );
  }

  // Add members, skipping any that already exist
  await prisma.customerGroupMember.createMany({
    data: customerIds.map((customerId) => ({
      customerGroupId: groupId,
      customerId,
    })),
    skipDuplicates: true,
  });

  // Return updated member count
  const memberCount = await prisma.customerGroupMember.count({
    where: { customerGroupId: groupId },
  });

  return NextResponse.json({ success: true, memberCount });
}

const removeMemberSchema = z.object({
  customerId: z.string().cuid(),
});

// Remove a member from a customer group
export async function DELETE(request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const parsed = removeMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { customerId } = parsed.data;

  const groupOrError = await requireGroup(groupId, tenantId);
  if (groupOrError instanceof NextResponse) return groupOrError;

  // Delete the membership directly using the compound unique constraint
  const deleted = await prisma.customerGroupMember.deleteMany({
    where: {
      customerGroupId: groupId,
      customerId,
    },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Member not found in group" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
