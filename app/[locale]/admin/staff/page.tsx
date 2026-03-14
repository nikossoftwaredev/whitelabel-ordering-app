import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { StaffManagement } from "@/components/admin/staff/staff-management";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function StaffPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = getCurrentTenant();
  return <StaffManagement tenantId={tenant?.id || ""} />;
}
