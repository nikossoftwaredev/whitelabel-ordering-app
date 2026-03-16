import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { QrMenu } from "@/components/menu/qr-menu";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { notFound } from "next/navigation";

export default async function QrMenuPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = await getRequestTenant();

  if (!tenant) {
    notFound();
  }

  return <QrMenu tenantSlug={tenant.slug} />;
}
