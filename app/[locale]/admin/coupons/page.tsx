import { setRequestLocale } from "next-intl/server";

import { CouponManagement } from "@/components/admin/coupons/coupon-management";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function CouponsPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <CouponManagement tenantId={tenant?.id || ""} />;
}
