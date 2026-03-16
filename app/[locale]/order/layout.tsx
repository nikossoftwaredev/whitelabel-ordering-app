import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BaseLayoutProps } from "@/types/page-props";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { CustomerHeader } from "@/components/order/customer-header";
import { ActiveOrderBanner } from "@/components/order/active-order-banner";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

export default async function OrderLayout({
  children,
  params,
}: BaseLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = await getRequestTenant();

  if (!tenant) {
    notFound();
  }

  return (
    <>
      <CustomerHeader />
      {children}
      <ActiveOrderBanner />
      <PwaInstallPrompt />
    </>
  );
}
