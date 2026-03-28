import { setRequestLocale } from "next-intl/server";

import { AdminChatInbox } from "@/components/admin/chat/chat-inbox";
import { getRequestTenant } from "@/lib/tenant/resolve";
import { BasePageProps } from "@/types/page-props";

export default async function AdminChatPage({ params }: BasePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tenant = await getRequestTenant();
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <AdminChatInbox tenantId={tenant?.id || ""} />
    </div>
  );
}
