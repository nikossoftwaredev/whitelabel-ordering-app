import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  assignOwnerRole,
  checkDomainConflicts,
  clearOwnerRole,
  flattenOwnerEmail,
  normalizeDomains,
  OwnerNotFoundError,
  syncTenantDomains,
} from "@/lib/admin/tenant-helpers";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = await prisma.tenantRole.findFirst({
    where: { userId: session.user.id, role: Role.SUPER_ADMIN },
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
      domains: { orderBy: { isPrimary: "desc" } },
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
    domains,
    isActive,
    isPaused,
    currency,
    timezone,
    prepTimeMinutes,
    phone,
    email,
    address,
    ownerEmail,
  } = body as Record<string, unknown> & { domains?: string[]; ownerEmail?: string };

  // If slug is changing, check uniqueness
  if (slug) {
    const existing = await prisma.tenant.findFirst({
      where: { slug: slug as string, id: { not: tenantId } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A tenant with this slug already exists" },
        { status: 409 }
      );
    }
  }

  // Sync TenantDomain records if provided
  if (domains !== undefined) {
    const normalized = normalizeDomains(domains || []);
    const conflict = await checkDomainConflicts(normalized, tenantId);
    if (conflict) {
      return NextResponse.json(
        { error: `Domain "${conflict}" is already linked to another store` },
        { status: 409 }
      );
    }
    await syncTenantDomains(tenantId, normalized);
  }

  // Assign / clear owner role
  let resolvedOwnerEmail: string | null = null;
  if (ownerEmail !== undefined) {
    if (ownerEmail) {
      try {
        resolvedOwnerEmail = await assignOwnerRole(tenantId, ownerEmail);
      } catch (err) {
        if (err instanceof OwnerNotFoundError) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    } else {
      await clearOwnerRole(tenantId);
    }
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(slug !== undefined && { slug: slug as string }),
      ...(domain !== undefined && { domain: (domain as string) || null }),
      ...(isActive !== undefined && { isActive: isActive as boolean }),
      ...(isPaused !== undefined && { isPaused: isPaused as boolean }),
      ...(currency !== undefined && { currency: currency as string }),
      ...(timezone !== undefined && { timezone: timezone as string }),
      ...(prepTimeMinutes !== undefined && { prepTimeMinutes: prepTimeMinutes as number }),
      ...(phone !== undefined && { phone: (phone as string) || null }),
      ...(email !== undefined && { email: (email as string) || null }),
      ...(address !== undefined && { address: (address as string) || null }),
    },
    include: {
      config: true,
      domains: { orderBy: { isPrimary: "desc" } },
      tenantRoles: {
        where: { role: Role.OWNER },
        include: { user: { select: { email: true } } },
        take: 1,
      },
      _count: {
        select: { orders: true },
      },
    },
  });

  const { tenantRoles, ...rest } = tenant;
  return NextResponse.json({
    ...rest,
    ownerEmail: resolvedOwnerEmail ?? flattenOwnerEmail(tenantRoles),
  });
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
