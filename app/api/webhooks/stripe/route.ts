import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/server";

function extractPaymentIntentId(
  pi: string | Stripe.PaymentIntent | null
): string | undefined {
  return typeof pi === "string" ? pi : pi?.id;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "PAID" },
        });
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentStatus: "FAILED" },
        });
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = extractPaymentIntentId(charge.payment_intent);

      if (paymentIntentId) {
        await prisma.order.updateMany({
          where: {
            stripePaymentIntentId: paymentIntentId,
            paymentStatus: { not: "REFUNDED" },
          },
          data: { paymentStatus: "REFUNDED" },
        });
      }
      break;
    }

    case "charge.dispute.created": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = extractPaymentIntentId(dispute.payment_intent);

      if (paymentIntentId) {
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { paymentStatus: "DISPUTED" },
        });
      }
      break;
    }

    case "charge.dispute.closed": {
      const dispute = event.data.object as Stripe.Dispute;
      const paymentIntentId = extractPaymentIntentId(dispute.payment_intent);

      if (paymentIntentId) {
        // won = funds returned to merchant (back to PAID), lost = stays DISPUTED
        const newStatus = dispute.status === "won" ? "PAID" : "DISPUTED";
        await prisma.order.updateMany({
          where: { stripePaymentIntentId: paymentIntentId },
          data: { paymentStatus: newStatus },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
