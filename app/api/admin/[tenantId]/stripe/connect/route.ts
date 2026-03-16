import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  let stripeAccountId = tenant.stripeAccountId;

  // Create a new Stripe Express account if one doesn't exist
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { tenantId },
    });

    stripeAccountId = account.id;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeAccountId },
    });
  }

  // Create an account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${request.nextUrl.origin}/admin/settings/payments`,
    return_url: `${request.nextUrl.origin}/admin/settings/payments?setup=complete`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  if (!tenant.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    });
  }

  const account = await stripe.accounts.retrieve(tenant.stripeAccountId);

  return NextResponse.json({
    connected: true,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  });
}
