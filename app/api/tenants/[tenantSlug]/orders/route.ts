import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/auth";
import { validateCoupon } from "@/lib/coupons/validate";
import { prisma } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email/send";
import { orderEvents } from "@/lib/events/order-events";
import { calculateDistanceKm } from "@/lib/orders/distance";
import { generateOrderNumber } from "@/lib/orders/order-number";
import { isStoreOpen } from "@/lib/orders/store-hours";
import { validateCart } from "@/lib/orders/validate-cart";
import { validatePromoCode } from "@/lib/promo/validate";
import { sendPushToAdmins } from "@/lib/push/send";
import { orderLimiter } from "@/lib/security/rate-limit";
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

  const { success } = await orderLimiter.limit(session.user.id);
  if (!success) {
    return NextResponse.json(
      { error: "Too many orders. Please wait a moment." },
      { status: 429 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug, isActive: true },
    include: {
      operatingHours: true,
      config: {
        select: {
          primaryColor: true,
          couponEnabled: true,
          couponMaxSavingsPerOrder: true,
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
    couponIds,
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

  // Validate promo code if provided
  let promoDiscount = 0;
  let promoCodeId: string | null = null;
  let maxUsesPerUser = 1;
  if (promoCodeStr) {
    const result = await validatePromoCode(tenant.id, promoCodeStr, validation.subtotal);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    promoDiscount = result.discount;
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

  // Validate coupon if provided
  let couponDiscount = 0;
  let couponToUse: { id: string } | null = null;
  if (couponIds?.length && tenant.config?.couponEnabled) {
    const coupon = await prisma.coupon.findFirst({
      where: {
        id: couponIds[0],
        tenantId: tenant.id,
        customerId: customer.id,
      },
    });
    if (!coupon) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }
    const remainingSubtotal = validation.subtotal - promoDiscount;
    const couponResult = validateCoupon(coupon, customer.id, remainingSubtotal);
    if (!couponResult.valid) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    couponDiscount = couponResult.discount;
    couponToUse = { id: coupon.id };
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

  // Calculate totals with combined discount cap
  let totalDiscount = promoDiscount + couponDiscount;
  const maxSavings = tenant.config?.couponMaxSavingsPerOrder;
  if (maxSavings && totalDiscount > maxSavings) {
    totalDiscount = maxSavings;
    // Proportionally reduce if needed — promo first, coupon on remainder
    if (promoDiscount >= maxSavings) {
      promoDiscount = maxSavings;
      couponDiscount = 0;
    } else {
      couponDiscount = maxSavings - promoDiscount;
    }
  }
  totalDiscount = Math.min(totalDiscount, validation.subtotal);
  const total = Math.max(0, validation.subtotal - totalDiscount) + tipAmount;

  // Generate order number
  const orderNumber = await generateOrderNumber(tenant.id);

  // Create order + track discounts in a single transaction
  const order = await prisma.$transaction(async (tx) => {
    // 1. Create order
    const newOrder = await tx.order.create({
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
        discount: totalDiscount,
        promoDiscount,
        couponDiscount,
        promoCode: promoCodeStr?.toUpperCase() ?? null,
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

    // 2. Track promo code usage
    if (promoCodeId && promoDiscount > 0) {
      await tx.promoCodeUsage.create({
        data: {
          promoCodeId,
          customerId: customer.id,
          orderId: newOrder.id,
          discount: promoDiscount,
        },
      });
      await tx.promoCode.update({
        where: { id: promoCodeId },
        data: { usesCount: { increment: 1 } },
      });
    }

    // 3. Mark coupon as used (optimistic lock: WHERE isUsed = false)
    if (couponToUse && couponDiscount > 0) {
      const updated = await tx.coupon.updateMany({
        where: { id: couponToUse.id, isUsed: false },
        data: {
          isUsed: true,
          usedAt: new Date(),
          orderId: newOrder.id,
        },
      });
      if (updated.count === 0) {
        throw new Error("Coupon has already been used");
      }
    }

    // 4. Update customer stats
    await tx.customer.update({
      where: { id: customer.id },
      data: {
        orderCount: { increment: 1 },
        totalSpent: { increment: newOrder.total },
      },
    });

    return newOrder;
  });

  // Broadcast new order to admin dashboard (must await to ensure delivery)
  await orderEvents.emitNewOrder({
    tenantId: tenant.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    customerName: order.customerName,
  });

  sendOrderConfirmation(order, tenant).catch(() => {});

  sendPushToAdmins(tenant.id, {
    title: `New Order #${orderNumber}`,
    body: `${order.customerName} placed an order for ${tenant.currency} ${(total / 100).toFixed(2)}`,
    icon: "/api/pwa-icon?size=192",
    url: "/admin/orders",
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
