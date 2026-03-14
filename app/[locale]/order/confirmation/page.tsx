import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { OrderConfirmation } from "@/components/order/order-confirmation";

export default async function ConfirmationPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <OrderConfirmation />;
}
