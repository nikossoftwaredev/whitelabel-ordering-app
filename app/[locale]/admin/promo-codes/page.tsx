import { setRequestLocale } from "next-intl/server";

import { PromoCodeManagement } from "@/components/admin/promo-codes/promo-code-management";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function PromoCodesPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <PromoCodeManagement tenantId={tenant?.id || ""} />;
}
