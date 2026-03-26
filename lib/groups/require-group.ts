import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

/**
 * Verify a customer group belongs to the given tenant.
 * Returns the group if found, or a 404 NextResponse.
 */
export async function requireGroup(groupId: string, tenantId: string) {
  const group = await prisma.customerGroup.findFirst({
    where: { id: groupId, tenantId },
  });
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  return group;
}
