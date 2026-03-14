import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { Dashboard } from "@/components/admin/dashboard/dashboard";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function AdminDashboardPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = getCurrentTenant();
  return <Dashboard tenantId={tenant?.id || ""} />;
}
