import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

const updateAddressSchema = z.object({
  label: z.string().min(1).optional(),
  street: z.string().min(1).optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
  locationType: z.string().nullish(),
  floor: z.string().nullish(),
  apartmentNumber: z.string().nullish(),
  companyName: z.string().nullish(),
  entrance: z.string().nullish(),
  accessDetails: z.string().nullish(),
  deliveryInstructions: z.string().nullish(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; addressId: string }> }
) {
  const { tenantSlug, addressId } = await params;

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
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Validate the address belongs to this customer
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!existing || existing.customerId !== customer.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateAddressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { isDefault, ...rest } = parsed.data;

  // If setting as default, unset all other defaults first
  if (isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id: addressId },
    data: {
      ...rest,
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  return NextResponse.json({ address });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; addressId: string }> }
) {
  const { tenantSlug, addressId } = await params;

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
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Validate the address belongs to this customer
  const existing = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!existing || existing.customerId !== customer.id) {
    return NextResponse.json({ error: "Address not found" }, { status: 404 });
  }

  await prisma.address.delete({
    where: { id: addressId },
  });

  return NextResponse.json({ success: true });
}
