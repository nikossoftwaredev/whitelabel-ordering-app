import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { validateCart } from "@/lib/orders/validate-cart";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { createOrderSchema } from "@/lib/validations/order";
import { orderEvents } from "@/lib/events/order-events";

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

  if (tenant.isPaused) {
    return NextResponse.json(
      { error: "Ordering is temporarily paused" },
      { status: 503 }
    );
  }

  const body = await request.json();

  // Validate request body with Zod schema
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    items,
    paymentMethod,
    notes: customerNote,
    customerName,
    customerPhone,
    customerEmail,
    orderType,
  } = parsed.data;

  // Validate cart
  const validation = await validateCart(tenant.id, items);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Invalid cart", details: validation.errors },
      { status: 400 }
    );
  }

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

  // Generate order number
  const orderNumber = await generateOrderNumber(tenant.id);

  // Create order in transaction
  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      orderNumber,
      orderType,
      paymentMethod,
      subtotal: validation.subtotal,
      total: validation.subtotal, // no discount for now
      customerNote,
      customerName: customerName || session.user.name,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || session.user.email,
      items: {
        create: validation.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          modifiers: {
            create: item.modifiers.map((mod) => ({
              modifierOptionId: mod.modifierOptionId,
              name: mod.name,
              priceAdjustment: mod.priceAdjustment,
            })),
          },
        })),
      },
    },
    include: {
      items: { include: { modifiers: true } },
    },
  });

  // Notify admins via SSE
  orderEvents.emitNewOrder({
    tenantId: tenant.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    customerName: order.customerName,
  });

  // Update customer stats
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      orderCount: { increment: 1 },
      totalSpent: { increment: order.total },
    },
  });

  return NextResponse.json(
    {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: order.total,
      items: order.items,
    },
    { status: 201 }
  );
}
