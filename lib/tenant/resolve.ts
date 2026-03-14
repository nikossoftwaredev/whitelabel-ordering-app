import { cache } from "react";
import { prisma } from "@/lib/db";

export const getTenantByDomain = cache(async (domain: string) => {
  return prisma.tenant.findFirst({
    where: {
      OR: [{ domain }, { slug: domain.split(".")[0] }],
      isActive: true,
    },
    include: { config: true },
  });
});

export const getTenantBySlug = cache(async (slug: string) => {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { config: true },
  });
});

export const getFirstActiveTenant = cache(async () => {
  return prisma.tenant.findFirst({
    where: { isActive: true },
    include: { config: true },
    orderBy: { createdAt: "asc" },
  });
});
