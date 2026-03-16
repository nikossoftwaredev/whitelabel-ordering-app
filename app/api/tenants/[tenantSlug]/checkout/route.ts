import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type Stripe from "stripe";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/server";

const PLATFORM_FEE_PERCENT = 2;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  // ── Auth ──
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();

  // Radar fraud signal — extracted server-side, never trusted from client body
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 }
    );
  }

  // ── Fetch order with tenant (server-side source of truth for amount) ──
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Ensure the order belongs to the correct tenant
  if (order.tenant.slug !== tenantSlug) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Ensure order belongs to the authenticated user (prevent paying someone else's order)
  const customer = await prisma.customer.findUnique({
    where: {
      tenantId_userId: {
        tenantId: order.tenantId,
        userId: session.user.id,
      },
    },
  });
  if (!customer || order.customerId !== customer.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only allow payment for STRIPE orders
  if (order.paymentMethod !== "STRIPE") {
    return NextResponse.json(
      { error: "This order does not require online payment" },
      { status: 400 }
    );
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Order is already paid" },
      { status: 400 }
    );
  }

  // If a PaymentIntent already exists, reuse it (idempotency — user might refresh)
  if (order.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(
      order.stripePaymentIntentId
    );
    if (
      existing.status === "requires_payment_method" ||
      existing.status === "requires_confirmation" ||
      existing.status === "requires_action"
    ) {
      return NextResponse.json({ clientSecret: existing.client_secret });
    }
    // If already succeeded or cancelled, don't allow re-payment
    return NextResponse.json(
      { error: "Payment already processed" },
      { status: 400 }
    );
  }

  // ── Amount comes from DB (server-calculated total), never from client ──
  const amount = order.total; // already in cents

  if (amount < 50) {
    return NextResponse.json(
      { error: "Order total too small for card payment" },
      { status: 400 }
    );
  }

  // ── Build PaymentIntent params ──
  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency: "eur",
    payment_method_types: ["card"],
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
      orderNumber: order.orderNumber,
    },
    ...(order.customerEmail && { receipt_email: order.customerEmail }),
    ...(clientIp && { radar_options: { ip_address: clientIp } as Stripe.PaymentIntentCreateParams.RadarOptions }),
  };

  // If tenant has a Stripe Connect account, route funds there with platform fee
  if (order.tenant.stripeAccountId) {
    const applicationFee = Math.round(
      amount * (PLATFORM_FEE_PERCENT / 100)
    );
    intentParams.application_fee_amount = applicationFee;
    intentParams.transfer_data = {
      destination: order.tenant.stripeAccountId,
    };
  }

  // ── Create PaymentIntent ──
  const paymentIntent = await stripe.paymentIntents.create(intentParams);

  // Save the PaymentIntent ID to the order
  await prisma.order.update({
    where: { id: orderId },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
