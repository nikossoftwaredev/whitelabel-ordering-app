import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { OrderManagement } from "@/components/admin/orders/order-management";
import { getRequestTenant } from "@/lib/tenant/resolve";

export default async function OrdersPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return <OrderManagement tenantId={tenant?.id || ""} />;
}
