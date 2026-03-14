import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { TenantManagement } from "@/components/admin/super/tenant-management";

export default async function TenantsPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TenantManagement />;
}
