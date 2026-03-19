import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

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
      domains: { orderBy: { isPrimary: "desc" } },
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
    deliveryEnabled,
    deliveryFee,
    freeDeliveryThreshold,
    deliveryRangeKm,
    config,
    operatingHours,
  } = body;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Build tenant update data (including currency from config if present)
  const tenantData: Record<string, unknown> = {
    ...(name !== undefined && { name }),
    ...(isPaused !== undefined && { isPaused }),
    ...(prepTimeMinutes !== undefined && { prepTimeMinutes }),
    ...(minOrderAmount !== undefined && { minOrderAmount }),
    ...(deliveryEnabled !== undefined && { deliveryEnabled }),
    ...(deliveryFee !== undefined && { deliveryFee }),
    ...(freeDeliveryThreshold !== undefined && { freeDeliveryThreshold }),
    ...(deliveryRangeKm !== undefined && { deliveryRangeKm }),
  };

  // currency lives on Tenant, not TenantConfig
  const configFields = config ? { ...config } : null;
  if (configFields?.currency !== undefined) {
    tenantData.currency = configFields.currency;
    delete configFields.currency;
  }

  // Batch all writes in a single transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const operations: any[] = [
    prisma.tenant.update({ where: { id: tenantId }, data: tenantData }),
  ];

  if (configFields && Object.keys(configFields).length > 0) {
    operations.push(
      prisma.tenantConfig.upsert({
        where: { tenantId },
        create: { tenantId, ...configFields },
        update: configFields,
      })
    );
  }

  if (operatingHours && Array.isArray(operatingHours)) {
    for (const hour of operatingHours) {
      operations.push(
        prisma.operatingHour.upsert({
          where: {
            tenantId_dayOfWeek: { tenantId, dayOfWeek: hour.dayOfWeek },
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
        })
      );
    }
  }

  await prisma.$transaction(operations);

  // Return updated tenant with relations
  const result = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      config: true,
      domains: { orderBy: { isPrimary: "desc" } },
      operatingHours: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  return NextResponse.json(result);
}
