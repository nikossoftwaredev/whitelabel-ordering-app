import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { orderEvents } from "@/lib/events/order-events";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; orderId: string }> }
) {
  const { tenantSlug, orderId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Validate the order belongs to the authenticated user's customer record
  if (!order.customer || order.customer.userId !== session.user.id) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only NEW orders can be cancelled
  if (order.status !== "NEW") {
    return NextResponse.json(
      { error: "Order can only be cancelled before it is accepted" },
      { status: 400 }
    );
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
    include: {
      items: { include: { modifiers: true } },
    },
  });

  // Notify admins via SSE
  orderEvents.emitStatusChange({
    tenantId: tenant.id,
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    status: updatedOrder.status,
    total: updatedOrder.total,
    customerName: updatedOrder.customerName,
  });

  return NextResponse.json(updatedOrder);
}
