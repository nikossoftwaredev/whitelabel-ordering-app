import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { CustomerManagement } from "@/components/admin/customers/customer-management";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function CustomersPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = getCurrentTenant();
  return <CustomerManagement tenantId={tenant?.id || ""} />;
}
