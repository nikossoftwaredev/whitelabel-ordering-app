import { NextRequest } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { OrderEvent,orderEvents } from "@/lib/events/order-events";
import { createSSEStream } from "@/lib/sse/create-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  return createSSEStream(request, ({ send, onAbort }) => {
    const onNewOrder = (event: OrderEvent) => {
      if (event.tenantId === tenantId) send("new_order", event);
    };

    const onStatusChange = (event: OrderEvent) => {
      if (event.tenantId === tenantId) send("status_change", event);
    };

    orderEvents.on("order:new", onNewOrder);
    orderEvents.on("order:status", onStatusChange);

    send("connected", { tenantId });

    onAbort(() => {
      orderEvents.off("order:new", onNewOrder);
      orderEvents.off("order:status", onStatusChange);
    });
  });
}
