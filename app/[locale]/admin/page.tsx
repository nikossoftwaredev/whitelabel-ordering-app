import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { Dashboard } from "@/components/admin/dashboard/dashboard";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function AdminDashboardPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <Dashboard tenantId={tenant?.id || ""} />;
}
