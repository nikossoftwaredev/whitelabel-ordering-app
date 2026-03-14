import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { stripe } from "@/lib/stripe/server";
import { prisma } from "@/lib/db";

const PLATFORM_FEE_PERCENT = 2;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await request.json();

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 }
    );
  }

  // Find the order with its tenant
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tenant: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.tenant.slug !== tenantSlug) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!order.tenant.stripeAccountId) {
    return NextResponse.json(
      { error: "This store has not set up payments yet" },
      { status: 400 }
    );
  }

  if (order.paymentStatus === "PAID") {
    return NextResponse.json(
      { error: "Order is already paid" },
      { status: 400 }
    );
  }

  // total is already in cents
  const applicationFee = Math.round(
    order.total * (PLATFORM_FEE_PERCENT / 100)
  );

  // Create PaymentIntent with transfer to connected account
  const paymentIntent = await stripe.paymentIntents.create({
    amount: order.total,
    currency: "eur",
    application_fee_amount: applicationFee,
    transfer_data: {
      destination: order.tenant.stripeAccountId,
    },
    metadata: {
      orderId: order.id,
      tenantId: order.tenantId,
    },
  });

  // Save the PaymentIntent ID to the order
  await prisma.order.update({
    where: { id: orderId },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
