import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { MenuManagement } from "@/components/admin/menu/menu-management";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function MenuPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = getCurrentTenant();

  return <MenuManagement tenantId={tenant?.id || ""} />;
}
