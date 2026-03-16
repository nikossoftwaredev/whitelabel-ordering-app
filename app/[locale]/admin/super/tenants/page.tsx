import { setRequestLocale } from "next-intl/server";

import { TenantManagement } from "@/components/admin/super/tenant-management";
import { BasePageProps } from "@/types/page-props";

export default async function TenantsPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TenantManagement />;
}
