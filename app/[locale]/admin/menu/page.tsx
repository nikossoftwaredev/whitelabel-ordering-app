import { setRequestLocale } from "next-intl/server";

import { MenuManagement } from "@/components/admin/menu/menu-management";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function MenuPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <MenuManagement tenantId={tenant?.id || ""} />;
}
