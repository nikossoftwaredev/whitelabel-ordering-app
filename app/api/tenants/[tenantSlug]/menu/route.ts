import { NextResponse } from "next/server";

import { getCachedMenu, getCachedPopularProducts } from "@/lib/cache/menu";
import { getCachedTenantBySlug } from "@/lib/cache/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await getCachedTenantBySlug(tenantSlug);

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
