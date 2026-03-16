import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = await prisma.tenantRole.findFirst({
    where: { userId: session.user.id, role: "SUPER_ADMIN" },
  });
  return role ? session.user.id : null;
}

export async function GET() {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      config: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tenants);
}

export async function POST(req: NextRequest) {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, domain } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Name and slug are required" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "A tenant with this slug already exists" },
      { status: 409 }
    );
  }

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      domain: domain || null,
      config: {
        create: {},
      },
    },
    include: {
      config: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  return NextResponse.json(tenant, { status: 201 });
}
