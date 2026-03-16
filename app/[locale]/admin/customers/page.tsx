import { setRequestLocale } from "next-intl/server";

import { CustomerManagement } from "@/components/admin/customers/customer-management";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function CustomersPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <CustomerManagement tenantId={tenant?.id || ""} />;
}
