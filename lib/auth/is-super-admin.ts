import { prisma } from "@/lib/db";

export async function isSuperAdmin(userId: string): Promise<boolean> {
  const role = await prisma.tenantRole.findFirst({
    where: { userId, role: "SUPER_ADMIN" },
    select: { id: true },
  });
  return role !== null;
}
