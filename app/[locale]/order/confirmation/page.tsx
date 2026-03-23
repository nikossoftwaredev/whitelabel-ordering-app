import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { OrderConfirmation } from "@/components/order/order-confirmation";
import { authOptions } from "@/lib/auth/auth";
import { redirect } from "@/lib/i18n/navigation";
import { BasePageProps } from "@/types/page-props";

export default async function ConfirmationPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession(authOptions);
  if (!session) redirect({ href: "/order", locale });
  return <OrderConfirmation />;
}
