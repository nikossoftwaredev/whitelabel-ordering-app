import { getServerSession } from "next-auth";
import { setRequestLocale } from "next-intl/server";

import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { OrderNotificationProvider } from "@/components/admin/order-notification-provider";
import { SuperAdminSidebar } from "@/components/admin/super-admin-sidebar";
import { ErrorPage } from "@/components/error-page";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authOptions } from "@/lib/auth/auth";
import { isSuperAdmin } from "@/lib/auth/is-super-admin";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BaseLayoutProps } from "@/types/page-props";

export const dynamic = "force-dynamic";

const AdminLayout = async ({ children, params }: BaseLayoutProps) => {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getServerSession(authOptions);
  if (!session) {
    return (
      <ErrorPage
        title="Access Denied"
        description="You are not authorized to access the admin panel. Please sign in with an admin account."
        backHref="/auth/signin"
        backLabel="Sign in"
      />
    );
  }

  const superAdmin = await isSuperAdmin(session.user.id);

  const tenant = await getRequestTenant();
  const tenantId = tenant?.id || "";

  return (
    <SidebarProvider>
      {superAdmin ? <SuperAdminSidebar /> : <AdminSidebar />}
      <SidebarInset className="h-svh max-h-svh overflow-hidden">
        <AdminHeader />
        <ScrollArea className="h-0 flex-1">
          <main className="mx-auto max-w-screen-2xl px-4 py-6">
            {children}
          </main>
        </ScrollArea>
      </SidebarInset>
      {!superAdmin && tenantId && <OrderNotificationProvider tenantId={tenantId} />}
    </SidebarProvider>
  );
};

export default AdminLayout;
