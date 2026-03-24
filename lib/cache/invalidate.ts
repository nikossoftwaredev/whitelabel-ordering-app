import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/db";

export async function invalidateMenuCache(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (tenant) {
    revalidateTag(`menu-${tenant.slug}`, "default");
    revalidateTag(`popular-${tenant.slug}`, "default");
  }
}

export async function invalidateTenantCache(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  if (tenant) {
    revalidateTag(`tenant-${tenant.slug}`, "default");
  }
}
