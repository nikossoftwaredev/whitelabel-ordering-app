import { NextRequest, NextResponse } from "next/server";

import { getCachedMenu, getCachedPopularProducts } from "@/lib/cache/menu";
import { getCachedTenantBySlug } from "@/lib/cache/tenant";
import { apiLimiter } from "@/lib/security/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
  const { success } = await apiLimiter.limit(ip);
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

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
