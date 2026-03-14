import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { InvoiceManagement } from "@/components/admin/invoices/invoice-management";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function InvoicesPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = getCurrentTenant();
  return <InvoiceManagement tenantId={tenant?.id || ""} />;
}
