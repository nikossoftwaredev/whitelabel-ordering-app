import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { CheckoutForm } from "@/components/order/checkout-form";

export default async function CheckoutPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CheckoutForm />;
}
