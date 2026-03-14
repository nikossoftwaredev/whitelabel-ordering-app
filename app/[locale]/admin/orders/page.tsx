import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { OrderManagement } from "@/components/admin/orders/order-management";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function OrdersPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = getCurrentTenant();

  return <OrderManagement tenantId={tenant?.id || ""} />;
}
