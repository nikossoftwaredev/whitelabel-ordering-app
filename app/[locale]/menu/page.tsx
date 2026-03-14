import { setRequestLocale } from "next-intl/server";
import { BasePageProps } from "@/types/page-props";
import { QrMenu } from "@/components/menu/qr-menu";
import { getCurrentTenant } from "@/lib/tenant/context";

export default async function QrMenuPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tenant = getCurrentTenant();

  return <QrMenu tenantSlug={tenant?.slug || "figata-cafe"} />;
}
