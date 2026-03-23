import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { sendRefundNotification } from "@/lib/email/send";
import { stripe } from "@/lib/stripe/server";

type Params = { params: Promise<{ tenantId: string; orderId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { tenantId, orderId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      tenant: {
        select: {
          stripeAccountId: true,
          name: true,
          config: { select: { primaryColor: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.paymentMethod !== "STRIPE") {
    return NextResponse.json(
      { error: "Only Stripe payments can be refunded" },
      { status: 400 }
    );
  }

  if (order.paymentStatus !== "PAID") {
    return NextResponse.json(
      { error: "Order is not in a refundable state" },
      { status: 400 }
    );
  }

  if (!order.stripePaymentIntentId) {
    return NextResponse.json(
      { error: "No payment intent found" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { amount, reason } = body as { amount?: number; reason?: string };

  // amount is in cents; if not provided, refund the full order total
  const refundAmount = amount ?? order.total;

  if (refundAmount <= 0 || refundAmount > order.total) {
    return NextResponse.json(
      { error: "Invalid refund amount" },
      { status: 400 }
    );
  }

  try {
    const refundParams: Record<string, unknown> = {
      payment_intent: order.stripePaymentIntentId,
      amount: refundAmount,
    };
    if (reason) {
      refundParams.metadata = { reason };
    }

    // For Stripe Connect, refund goes through the platform
    const refund = await stripe.refunds.create(refundParams);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: "REFUNDED",
        refundAmount,
        refundedAt: new Date(),
        refundReason: reason || null,
        stripeRefundId: refund.id,
      },
    });

    // Send refund email (fire-and-forget)
    if (order.customerEmail && order.tenant) {
      sendRefundNotification(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName || "Customer",
          customerEmail: order.customerEmail,
          refundAmount,
          orderTotal: order.total,
          reason: reason || null,
        },
        { name: order.tenant.name, config: order.tenant.config }
      ).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[Refund] Stripe refund failed:", err);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}
