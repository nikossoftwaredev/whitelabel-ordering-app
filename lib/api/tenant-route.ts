import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

/** Resolves session + tenant for a tenant-scoped route. Returns error response or resolved context. */
export async function resolveTenantRoute(tenantSlug: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });
  if (!tenant) {
    return { error: NextResponse.json({ error: "Tenant not found" }, { status: 404 }) } as const;
  }

  return { session, tenant } as const;
}

/** Finds or returns null for a customer record. */
export async function findCustomer(tenantId: string, userId: string) {
  return prisma.customer.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
}
