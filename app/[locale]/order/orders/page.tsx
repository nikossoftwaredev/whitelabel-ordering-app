import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { authOptions } from "@/lib/auth/auth";
import { OrderHistory } from "@/components/order/order-history";
import { redirect } from "@/lib/i18n/navigation";
import { BasePageProps } from "@/types/page-props";

export default async function OrderHistoryPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession(authOptions);
  if (!session) redirect({ href: "/order", locale });
  return <OrderHistory />;
}
