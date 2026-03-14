import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { OrderMenu } from "@/components/order/order-menu";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function OrderPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = getCurrentTenant();

  return (
    <OrderMenu
      tenantSlug={tenant?.slug || "figata-cafe"}
      tenantName={tenant?.name || "Store"}
      logo={tenant?.config?.logo || null}
    />
  );
}
