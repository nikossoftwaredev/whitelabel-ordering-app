import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { apiLimiter, getClientIp } from "@/lib/security/rate-limit";

interface Params {
  params: Promise<{ tenantSlug: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { success } = await apiLimiter.limit(getClientIp(request));
  if (!success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { endpoint, keys, role = "customer" } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  if (!["admin", "customer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      tenantId: tenant.id,
      userId: session?.user?.id ?? null,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      role,
    },
    update: {
      tenantId: tenant.id,
      userId: session?.user?.id ?? null,
      p256dh: keys.p256dh,
      auth: keys.auth,
      role,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { tenantSlug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = await request.json();
  const { endpoint } = body;

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, tenantId: tenant.id },
  });

  return NextResponse.json({ ok: true });
}
