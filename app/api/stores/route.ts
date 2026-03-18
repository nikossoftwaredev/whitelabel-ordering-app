import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    include: { config: true },
    orderBy: { name: "asc" },
  });

  const stores = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    address: t.address,
    logo: t.config?.logo ?? null,
    primaryColor: t.config?.primaryColor ?? "#000000",
  }));

  return NextResponse.json({ stores });
}
