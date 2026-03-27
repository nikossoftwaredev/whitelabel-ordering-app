import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const roles = await prisma.tenantRole.findMany({
    where: { userId: session.user.id },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          config: { select: { logo: true } },
        },
      },
    },
    orderBy: { tenant: { name: "asc" } },
  });

  const tenants = roles.map((r) => ({
    id: r.tenant.id,
    name: r.tenant.name,
    slug: r.tenant.slug,
    logo: r.tenant.config?.logo ?? null,
    domain: r.tenant.domain ?? null,
    role: r.role,
  }));

  return NextResponse.json(tenants);
}
