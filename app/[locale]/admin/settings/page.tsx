import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { SettingsPage } from "@/components/admin/settings/settings-page";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function AdminSettingsPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = getCurrentTenant();
  return <SettingsPage tenantId={tenant?.id || ""} />;
}
