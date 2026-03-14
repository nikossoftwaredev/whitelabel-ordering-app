import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      config: true,
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();

  const {
    name,
    isPaused,
    prepTimeMinutes,
    minOrderAmount,
    deliveryFee,
    freeDeliveryThreshold,
    taxRate,
    config,
    operatingHours,
  } = body;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Update tenant fields
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(isPaused !== undefined && { isPaused }),
      ...(prepTimeMinutes !== undefined && { prepTimeMinutes }),
      ...(minOrderAmount !== undefined && { minOrderAmount }),
      ...(deliveryFee !== undefined && { deliveryFee }),
      ...(freeDeliveryThreshold !== undefined && { freeDeliveryThreshold }),
      ...(taxRate !== undefined && { taxRate }),
    },
  });

  // Update config if provided
  if (config) {
    await prisma.tenantConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...config,
      },
      update: config,
    });
  }

  // Upsert operating hours if provided
  if (operatingHours && Array.isArray(operatingHours)) {
    for (const hour of operatingHours) {
      await prisma.operatingHour.upsert({
        where: {
          tenantId_dayOfWeek: {
            tenantId,
            dayOfWeek: hour.dayOfWeek,
          },
        },
        create: {
          tenantId,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isClosed: hour.isClosed,
        },
        update: {
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isClosed: hour.isClosed,
        },
      });
    }
  }

  // Return updated tenant with relations
  const result = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      config: true,
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  return NextResponse.json(result);
}
