import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { authOptions } from "@/lib/auth/auth";
import { ProfilePage } from "@/components/order/profile-page";
import { redirect } from "@/lib/i18n/navigation";
import { BasePageProps } from "@/types/page-props";

export default async function ProfileRoute({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession(authOptions);
  if (!session) redirect({ href: "/order", locale });
  return <ProfilePage />;
}
