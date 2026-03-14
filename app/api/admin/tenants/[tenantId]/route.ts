import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = await prisma.tenantRole.findFirst({
    where: { userId: session.user.id, role: "SUPER_ADMIN" },
  });
  return role ? session.user.id : null;
}

type RouteContext = { params: Promise<{ tenantId: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenantId } = await context.params;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      config: true,
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
      _count: {
        select: {
          orders: true,
          tenantRoles: true,
        },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenantId } = await context.params;
  const body = await req.json();

  const {
    name,
    slug,
    domain,
    isActive,
    isPaused,
    currency,
    timezone,
    prepTimeMinutes,
    phone,
    email,
    address,
  } = body;

  // If slug is changing, check uniqueness
  if (slug) {
    const existing = await prisma.tenant.findFirst({
      where: { slug, id: { not: tenantId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A tenant with this slug already exists" },
        { status: 409 }
      );
    }
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(slug !== undefined && { slug }),
      ...(domain !== undefined && { domain: domain || null }),
      ...(isActive !== undefined && { isActive }),
      ...(isPaused !== undefined && { isPaused }),
      ...(currency !== undefined && { currency }),
      ...(timezone !== undefined && { timezone }),
      ...(prepTimeMinutes !== undefined && { prepTimeMinutes }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(address !== undefined && { address: address || null }),
    },
    include: {
      config: true,
      _count: {
        select: { orders: true },
      },
    },
  });

  return NextResponse.json(tenant);
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { tenantId } = await context.params;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { isActive: false },
  });

  return NextResponse.json(tenant);
}
