import { setRequestLocale } from "next-intl/server";

import { StaffManagement } from "@/components/admin/staff/staff-management";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function StaffPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <StaffManagement tenantId={tenant?.id || ""} />;
}
