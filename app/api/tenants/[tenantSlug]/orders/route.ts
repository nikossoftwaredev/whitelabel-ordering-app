import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email/send";
import { orderEvents } from "@/lib/events/order-events";
import { calculateDistanceKm } from "@/lib/orders/distance";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { isStoreOpen } from "@/lib/orders/store-hours";
import { validateCart } from "@/lib/orders/validate-cart";
import { validatePromoCode } from "@/lib/promo/validate";
import { sendPushToAdmins } from "@/lib/push/send";
import { createOrderSchema } from "@/lib/validations/order";

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
    include: {
      operatingHours: true,
      config: {
        select: {
          primaryColor: true,
          loyaltyEnabled: true,
          loyaltyRequiredOrders: true,
          loyaltyRewardAmount: true,
        },
      },
    },
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

  // Check if store is currently open
  const storeStatus = isStoreOpen(tenant.operatingHours, tenant.timezone);
  if (!storeStatus.isOpen) {
    return NextResponse.json(
      { error: "The store is currently closed. Please try again during operating hours." },
      { status: 403 }
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
    deliveryAddress,
    tipAmount,
    scheduledFor: scheduledForStr,
    promoCode: promoCodeStr,
    loyaltyRedeem,
    deliveryLat,
    deliveryLng,
    deliveryAddressDetails,
  } = parsed.data;

  // Parse and validate scheduled time
  const scheduledFor = scheduledForStr ? new Date(scheduledForStr) : null;
  if (scheduledFor) {
    const minScheduleTime = new Date(Date.now() + 30 * 60 * 1000); // at least 30 min ahead
    if (scheduledFor < minScheduleTime) {
      return NextResponse.json(
        { error: "Scheduled time must be at least 30 minutes from now" },
        { status: 400 }
      );
    }
  }

  // Validate delivery zone
  if (orderType === "DELIVERY") {
    if (
      tenant.storeLat != null &&
      tenant.storeLng != null &&
      tenant.deliveryRangeKm &&
      deliveryLat != null &&
      deliveryLng != null
    ) {
      const distance = calculateDistanceKm(
        tenant.storeLat,
        tenant.storeLng,
        deliveryLat,
        deliveryLng
      );
      if (distance > tenant.deliveryRangeKm) {
        return NextResponse.json(
          { error: "Address is outside the delivery zone" },
          { status: 400 }
        );
      }
    }
  }

  // Validate cart
  const validation = await validateCart(tenant.id, items);
  if (!validation.valid) {
    return NextResponse.json(
      { error: "Invalid cart", details: validation.errors },
      { status: 400 }
    );
  }

  // Mutual exclusivity: promo code and loyalty reward
  if (promoCodeStr && loyaltyRedeem) {
    return NextResponse.json(
      { error: "Cannot use both promo code and loyalty reward" },
      { status: 400 }
    );
  }

  // Validate promo code if provided
  let discount = 0;
  let promoCodeId: string | null = null;
  let maxUsesPerUser = 1;
  let isLoyaltyDiscount = false;
  if (promoCodeStr) {
    const result = await validatePromoCode(tenant.id, promoCodeStr, validation.subtotal);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    discount = result.discount;
    promoCodeId = result.promo.id;
    maxUsesPerUser = result.promo.maxUsesPerUser;
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

  // Validate loyalty redemption if requested
  if (loyaltyRedeem && tenant.config?.loyaltyEnabled) {
    const { loyaltyRequiredOrders, loyaltyRewardAmount } = tenant.config;
    const redemptionCount = await prisma.loyaltyRedemption.count({
      where: { customerId: customer.id, tenantId: tenant.id },
    });
    const effectiveOrders =
      customer.orderCount - redemptionCount * loyaltyRequiredOrders;
    if (effectiveOrders >= loyaltyRequiredOrders) {
      discount = Math.min(loyaltyRewardAmount, validation.subtotal);
      isLoyaltyDiscount = true;
    } else {
      return NextResponse.json(
        { error: "Not enough orders for loyalty reward" },
        { status: 400 }
      );
    }
  }

  // Check per-user promo usage
  if (promoCodeId) {
    const userUsages = await prisma.promoCodeUsage.count({
      where: { promoCodeId, customerId: customer.id },
    });
    if (userUsages >= maxUsesPerUser) {
      return NextResponse.json({ error: "You have already used this promo code" }, { status: 400 });
    }
  }

  // Generate order number
  const orderNumber = await generateOrderNumber(tenant.id);

  const total = validation.subtotal - discount + tipAmount;

  // Create order in transaction
  const order = await prisma.order.create({
    data: {
      tenantId: tenant.id,
      customerId: customer.id,
      orderNumber,
      orderType,
      paymentMethod,
      scheduledFor,
      deliveryAddress: deliveryAddress || null,
      deliveryAddressDetails: deliveryAddressDetails ?? undefined,
      subtotal: validation.subtotal,
      discount,
      promoCode: isLoyaltyDiscount
        ? "LOYALTY"
        : (promoCodeStr?.toUpperCase() ?? null),
      tipAmount,
      total,
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

  // Track promo code usage
  if (promoCodeId && discount > 0) {
    await prisma.$transaction([
      prisma.promoCodeUsage.create({
        data: {
          promoCodeId,
          customerId: customer.id,
          orderId: order.id,
          discount,
        },
      }),
      prisma.promoCode.update({
        where: { id: promoCodeId },
        data: { usesCount: { increment: 1 } },
      }),
    ]);
  }

  // Track loyalty redemption
  if (isLoyaltyDiscount && discount > 0) {
    await prisma.loyaltyRedemption.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        orderId: order.id,
        discount,
        orderCountAtRedemption: customer.orderCount,
      },
    });
  }

  // Notify admins via SSE
  orderEvents.emitNewOrder({
    tenantId: tenant.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    customerName: order.customerName,
  });

  // Send confirmation email (fire-and-forget)
  sendOrderConfirmation(order, tenant).catch(() => {});

  // Push notification to admins (fire-and-forget)
  sendPushToAdmins(tenant.id, {
    title: `New Order #${orderNumber}`,
    body: `${order.customerName} placed an order for ${tenant.currency} ${total.toFixed(2)}`,
    icon: "/api/pwa-icon?size=192",
    url: "/admin/orders",
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
