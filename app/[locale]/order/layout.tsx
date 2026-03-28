import { setRequestLocale } from "next-intl/server";

import { ActiveOrderBanner } from "@/components/order/active-order-banner";
import { CustomerHeader } from "@/components/order/customer-header";
import { StoreSelector } from "@/components/order/store-selector";
import { getCachedStores } from "@/lib/cache/stores";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BaseLayoutProps } from "@/types/page-props";

export default async function OrderLayout({
  children,
  params,
}: BaseLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = await getRequestTenant();

  if (!tenant) {
    const stores = await getCachedStores();
    return <StoreSelector stores={stores} />;
  }

  return (
    <>
      <CustomerHeader />
      {children}
      <ActiveOrderBanner />
    </>
  );
}
