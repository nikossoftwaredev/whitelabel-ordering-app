import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { StaffManagement } from "@/components/admin/staff/staff-management";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function StaffPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <StaffManagement tenantId={tenant?.id || ""} />;
}
