import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { OrderMenu } from "@/components/order/order-menu";
import { TableInitializer } from "@/components/order/table-initializer";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

interface OrderPageProps extends BasePageProps {
  searchParams: Promise<{ table?: string }>;
}

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const { locale } = await params;
  const { table } = await searchParams;
  setRequestLocale(locale);

  const tenant = await getRequestTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <>
      <TableInitializer tableNumber={table ?? null} />
      <OrderMenu
        tenantSlug={tenant.slug}
        tenantName={tenant.name}
        logo={tenant.config?.logo || null}
      />
    </>
  );
}
