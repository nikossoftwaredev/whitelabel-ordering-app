import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { OrderHistory } from "@/components/order/order-history";

export default async function OrderHistoryPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrderHistory />;
}
