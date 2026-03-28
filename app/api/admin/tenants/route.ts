import { Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import {
  assignOwnerRole,
  buildDomainRecords,
  flattenOwnerEmail,
  normalizeDomains,
} from "@/lib/admin/tenant-helpers";
import { authOptions } from "@/lib/auth/auth";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = await prisma.tenantRole.findFirst({
    where: { userId: session.user.id, role: Role.SUPER_ADMIN },
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
    orderBy: { name: "asc" },
  });

  const result = tenants.map(({ tenantRoles, ...rest }) => ({
    ...rest,
    ownerEmail: flattenOwnerEmail(tenantRoles),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const userId = await requireSuperAdmin();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { name, slug, domain, domains, ownerEmail } = body as {
    name?: string;
    slug?: string;
    domain?: string;
    domains?: string[];
    ownerEmail?: string;
  };

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

  // Build domain records from either new `domains` array or legacy `domain` field
  let normalized: string[] = [];
  if (domains?.length) {
    normalized = normalizeDomains(domains);
  } else if (domain) {
    normalized = [domain.toLowerCase().trim()];
  }
  const domainList = buildDomainRecords(normalized);

  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      domain: domain || null,
      config: {
        create: {},
      },
      ...(domainList.length > 0 && {
        domains: { create: domainList },
      }),
    },
    include: {
      config: true,
      domains: { orderBy: { isPrimary: "desc" } },
      _count: {
        select: { orders: true },
      },
    },
  });

  // Assign owner role if email provided
  let resolvedOwnerEmail: string | null = null;
  if (ownerEmail) {
    try {
      resolvedOwnerEmail = await assignOwnerRole(tenant.id, ownerEmail);
    } catch {
      // User not found — silently skip on create (tenant still created)
    }
  }

  revalidateTag("stores", "default");

  return NextResponse.json({ ...tenant, ownerEmail: resolvedOwnerEmail }, { status: 201 });
}
