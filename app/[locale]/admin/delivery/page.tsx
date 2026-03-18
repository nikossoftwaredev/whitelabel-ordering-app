import { setRequestLocale } from "next-intl/server";

import { DeliverySettings } from "@/components/admin/delivery/delivery-settings";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function AdminDeliveryPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <DeliverySettings tenantId={tenant?.id || ""} />;
}
