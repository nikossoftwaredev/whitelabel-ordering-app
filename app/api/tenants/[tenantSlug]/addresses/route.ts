import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

const createAddressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  street: z.string().min(1, "Street is required"),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

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

  const customer = await prisma.customer.findUnique({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: session.user.id,
      },
    },
  });

  if (!customer) {
    return NextResponse.json({ addresses: [] });
  }

  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;

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

  const body = await request.json();
  const parsed = createAddressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { label, street, city, postalCode, country, lat, lng, isDefault } =
    parsed.data;

  // Upsert customer record
  const customer = await prisma.customer.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: session.user.id,
    },
  });

  // If setting as default, unset all other defaults first
  if (isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label,
      street,
      city,
      postalCode,
      country,
      lat,
      lng,
      isDefault: isDefault ?? false,
    },
  });

  return NextResponse.json({ address }, { status: 201 });
}
