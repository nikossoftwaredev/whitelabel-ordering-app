import { setRequestLocale } from "next-intl/server";
import { BaseLayoutProps } from "@/types/page-props";
import { CustomerHeader } from "@/components/order/customer-header";

export default async function OrderLayout({
  children,
  params,
}: BaseLayoutProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <CustomerHeader />
      {children}
    </>
  );
}
