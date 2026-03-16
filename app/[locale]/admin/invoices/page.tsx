import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { InvoiceManagement } from "@/components/admin/invoices/invoice-management";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function InvoicesPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <InvoiceManagement tenantId={tenant?.id || ""} />;
}
