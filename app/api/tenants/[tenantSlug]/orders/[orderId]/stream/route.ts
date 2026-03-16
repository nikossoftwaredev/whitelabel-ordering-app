import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { OrderEvent,orderEvents } from "@/lib/events/order-events";
import { createSSEStream } from "@/lib/sse/create-stream";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; orderId: string }> }
) {
  const { tenantSlug, orderId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      tenant: { slug: tenantSlug },
      customer: { userId: session.user.id },
    },
    select: { id: true, tenantId: true, status: true },
  });

  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  return createSSEStream(request, ({ send, onAbort }) => {
    const onStatusChange = (event: OrderEvent) => {
      if (event.orderId === orderId) {
        send("status_change", {
          status: event.status,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
        });
      }
    };

    orderEvents.on("order:status", onStatusChange);

    send("connected", { orderId, status: order.status });

    onAbort(() => {
      orderEvents.off("order:status", onStatusChange);
    });
  });
}
