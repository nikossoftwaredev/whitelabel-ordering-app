import { NextResponse } from "next/server";

import { getCachedMenu, getCachedPopularProducts } from "@/lib/cache/menu";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      isPaused: true,
      prepTimeMinutes: true,
      currency: true,
      phone: true,
      email: true,
      address: true,
      config: {
        select: { logo: true, coverImage: true, description: true },
      },
      operatingHours: {
        orderBy: { dayOfWeek: "asc" },
        select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
      },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const [formattedCategories, popularProductIds] = await Promise.all([
    getCachedMenu(tenant.id, tenant.slug),
    getCachedPopularProducts(tenant.id, tenant.slug),
  ]);

  return NextResponse.json({
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      isPaused: tenant.isPaused,
      prepTimeMinutes: tenant.prepTimeMinutes,
      currency: tenant.currency,
      logo: tenant.config?.logo,
      coverImage: tenant.config?.coverImage,
      description: tenant.config?.description,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
      operatingHours: tenant.operatingHours,
    },
    categories: formattedCategories,
    popularProductIds,
  });
}
