import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { Dashboard } from "@/components/admin/dashboard/dashboard";
import { authOptions } from "@/lib/auth/auth";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";
import { redirect } from "@/lib/i18n/navigation";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function AdminDashboardPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getServerSession(authOptions);
  const tenant = await getRequestTenant();
  // Only redirect to super admin when there is no tenant subdomain in context.
  // On a tenant subdomain (e.g. figata-cafe.lvh.me) a super admin should see
  // that store's admin dashboard, not be bounced to the platform panel.
  if (!tenant && session?.user?.id && (await isSuperAdmin(session.user.id))) {
    redirect({ href: "/admin/super/tenants", locale });
  }
  return <Dashboard tenantId={tenant?.id || ""} />;
}
