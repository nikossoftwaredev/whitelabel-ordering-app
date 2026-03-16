import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { SettingsPage } from "@/components/admin/settings/settings-page";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminSettingsPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <SettingsPage tenantId={tenant?.id || ""} />;
}
