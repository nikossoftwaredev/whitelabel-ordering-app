import { setRequestLocale } from "next-intl/server";

import { KitchenDisplay } from "@/components/admin/kitchen/kitchen-display";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function KitchenPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <KitchenDisplay tenantId={tenant?.id || ""} />;
}
