import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { orderEvents } from "@/lib/events/order-events";
import type { OrderStatus } from "@/lib/general/status-config";

type Params = { params: Promise<{ tenantId: string; orderId: string }> };

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["DELIVERING", "COMPLETED"],
  DELIVERING: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export async function GET(_request: Request, { params }: Params) {
  const { tenantId, orderId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      items: { include: { modifiers: true } },
      customer: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { tenantId, orderId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, estimatedReadyAt, estimatedMinutes, rejectionReason } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${order.status} to ${status}`,
        allowed,
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const updateData: Record<string, unknown> = { status };

  switch (status) {
    case "ACCEPTED": {
      updateData.acceptedAt = now;
      if (estimatedMinutes) {
        // Admin provided a custom prep time in minutes
        updateData.estimatedReadyAt = new Date(
          now.getTime() + estimatedMinutes * 60 * 1000
        );
      } else if (estimatedReadyAt) {
        updateData.estimatedReadyAt = new Date(estimatedReadyAt);
      } else {
        // Default: now + prepTimeMinutes
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { prepTimeMinutes: true },
        });
        updateData.estimatedReadyAt = new Date(
          now.getTime() + (tenant?.prepTimeMinutes ?? 15) * 60 * 1000
        );
      }
      break;
    }
    case "REJECTED":
      updateData.rejectionReason = rejectionReason || "No reason provided";
      break;
    case "READY":
      updateData.readyAt = now;
      break;
    case "COMPLETED":
      updateData.completedAt = now;
      // Mark cash orders as paid
      if (order.paymentMethod === "CASH" && order.paymentStatus === "PENDING") {
        updateData.paymentStatus = "PAID";
      }
      break;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: { include: { modifiers: true } },
    },
  });

  // Notify via SSE (customer tracking + admin dashboard refresh)
  orderEvents.emitStatusChange({
    tenantId,
    orderId,
    orderNumber: updated.orderNumber,
    status: updated.status,
    total: updated.total,
    customerName: updated.customerName,
  });

  return NextResponse.json(updated);
}
