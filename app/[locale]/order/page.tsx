import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { OrderMenu } from "@/components/order/order-menu";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function OrderPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = await getRequestTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <OrderMenu
      tenantSlug={tenant.slug}
      tenantName={tenant.name}
      logo={tenant.config?.logo || null}
    />
  );
}
