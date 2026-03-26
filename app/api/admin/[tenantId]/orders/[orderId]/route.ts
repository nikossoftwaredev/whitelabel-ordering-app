import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { computeExpiresAt, generateCouponCode } from "@/lib/coupons/validate";
import { prisma } from "@/lib/db";
import { sendOrderStatusUpdate } from "@/lib/email/send";
import { orderEvents } from "@/lib/events/order-events";
import type { OrderStatus } from "@/lib/general/status-config";
import { sendPushToCustomer } from "@/lib/push/send";

type Params = { params: Promise<{ tenantId: string; orderId: string }> };

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["DELIVERING", "COMPLETED"],
  DELIVERING: ["COMPLETED"],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export async function GET(_request: Request, { params }: Params) {
  const { tenantId, orderId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: {
      items: { include: { modifiers: true } },
      customer: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { tenantId, orderId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, estimatedReadyAt, estimatedMinutes, rejectionReason } = body;

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      {
        error: `Cannot transition from ${order.status} to ${status}`,
        allowed,
      },
      { status: 400 }
    );
  }

  const now = new Date();
  const updateData: Record<string, unknown> = { status };

  switch (status) {
    case "ACCEPTED": {
      updateData.acceptedAt = now;
      if (estimatedMinutes) {
        // Admin provided a custom prep time in minutes
        updateData.estimatedReadyAt = new Date(
          now.getTime() + estimatedMinutes * 60 * 1000
        );
      } else if (estimatedReadyAt) {
        updateData.estimatedReadyAt = new Date(estimatedReadyAt);
      } else {
        // Default: now + prepTimeMinutes
        const tenant = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { prepTimeMinutes: true },
        });
        updateData.estimatedReadyAt = new Date(
          now.getTime() + (tenant?.prepTimeMinutes ?? 15) * 60 * 1000
        );
      }
      break;
    }
    case "REJECTED":
      updateData.rejectionReason = rejectionReason || "No reason provided";
      break;
    case "READY":
      updateData.readyAt = now;
      break;
    case "COMPLETED":
      updateData.completedAt = now;
      // Mark cash orders as paid
      if (order.paymentMethod === "CASH" && order.paymentStatus === "PENDING") {
        updateData.paymentStatus = "PAID";
      }
      break;
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: updateData,
    include: {
      items: { include: { modifiers: true } },
      customer: { select: { id: true, userId: true, completedOrderCount: true } },
    },
  });

  // Auto-generate milestone coupon on COMPLETED
  if (status === "COMPLETED" && updated.customer) {
    const config = await prisma.tenantConfig.findUnique({
      where: { tenantId },
      select: {
        couponEnabled: true,
        couponMilestoneType: true,
        couponMilestoneOrders: true,
        couponMilestoneSpent: true,
        couponType: true,
        couponValue: true,
        couponValidDays: true,
        couponMinOrder: true,
        couponMaxDiscount: true,
        couponDescription: true,
        couponMilestoneNoExpiry: true,
      },
    });

    if (config?.couponEnabled) {
      // Skip milestone progress if customer already has an active milestone coupon
      // or if this order used a coupon (coupon orders don't count toward milestones)
      const orderUsedCoupon = updated.couponDiscount > 0;
      const activeMilestoneCoupon = await prisma.coupon.findFirst({
        where: {
          customerId: updated.customer.id,
          tenantId,
          source: "MILESTONE",
          isUsed: false,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      });
      const skipMilestone = orderUsedCoupon || !!activeMilestoneCoupon;

      if (!skipMilestone) {
        const milestoneType = config.couponMilestoneType || "ORDERS";

        // Increment completedOrderCount + completedSpent
        const updatedCustomer = await prisma.customer.update({
          where: { id: updated.customer.id },
          data: {
            completedOrderCount: { increment: 1 },
            completedSpent: { increment: updated.total },
          },
        });

        let shouldCreateCoupon = false;
        let milestoneLevel = 0;
        let milestoneDescription = "";

        if (milestoneType === "ORDERS" && config.couponMilestoneOrders > 0) {
          const newCount = updatedCustomer.completedOrderCount;
          if (newCount % config.couponMilestoneOrders === 0) {
            shouldCreateCoupon = true;
            milestoneLevel = newCount;
            milestoneDescription =
              config.couponDescription ||
              `Reward for ${newCount} completed orders!`;
          }
        } else if (milestoneType === "SPENDING" && config.couponMilestoneSpent > 0) {
          const previousLevel = Math.floor(
            (updatedCustomer.completedSpent - updated.total) /
              config.couponMilestoneSpent,
          );
          const currentLevel = Math.floor(
            updatedCustomer.completedSpent / config.couponMilestoneSpent,
          );
          if (currentLevel > previousLevel) {
            shouldCreateCoupon = true;
            milestoneLevel = currentLevel;
            const thresholdEur = (
              config.couponMilestoneSpent / 100
            ).toFixed(2);
            milestoneDescription =
              config.couponDescription ||
              `Reward for spending \u20AC${(currentLevel * config.couponMilestoneSpent / 100).toFixed(2)} (every \u20AC${thresholdEur})!`;
          }
        }

        if (shouldCreateCoupon) {
          const expiresAt = computeExpiresAt(config.couponMilestoneNoExpiry, config.couponValidDays);

          // Generate unique code with retry
          let code: string;
          let attempts = 0;
          do {
            code = generateCouponCode("LOYAL");
            const existing = await prisma.coupon.findUnique({
              where: { tenantId_code: { tenantId, code } },
            });
            if (!existing) break;
            attempts++;
          } while (attempts < 5);

          // Create coupon (unique constraint prevents duplicates)
          try {
            await prisma.coupon.create({
              data: {
                tenantId,
                customerId: updated.customer.id,
                code,
                type: config.couponType,
                value: config.couponValue,
                description: milestoneDescription,
                minOrder: config.couponMinOrder,
                maxDiscount: config.couponMaxDiscount,
                expiresAt,
                source: "MILESTONE",
                milestoneOrderCount: milestoneLevel,
                sourceOrderId: orderId,
              },
            });
          } catch {
            // Unique constraint violation = duplicate milestone coupon, safe to ignore
          }
        }
      }
    }
  }

  // Notify via Supabase Broadcast (customer tracking + admin dashboard refresh)
  await orderEvents.emitStatusChange({
    tenantId,
    orderId,
    orderNumber: updated.orderNumber,
    status: updated.status,
    total: updated.total,
    customerName: updated.customerName,
    estimatedReadyAt: updated.estimatedReadyAt?.toISOString() ?? null,
  });

  // Push notification to customer (fire-and-forget)
  const statusMessages: Record<string, string> = {
    ACCEPTED: "Your order has been accepted!",
    PREPARING: "Your order is being prepared",
    READY: "Your order is ready for pickup!",
    DELIVERING: "Your order is on the way!",
    COMPLETED: "Your order has been completed",
    CANCELLED: "Your order has been cancelled",
  };

  const pushMessage = statusMessages[status] || `Order status: ${status}`;

  sendPushToCustomer(tenantId, updated.customer?.userId ?? null, {
    title: `Order #${updated.orderNumber}`,
    body: pushMessage,
    icon: "/api/pwa-icon?size=192",
    url: "/order",
  });

  // Send status email (fire-and-forget)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { config: { select: { primaryColor: true } } },
  });
  if (tenant) {
    sendOrderStatusUpdate(updated, status, tenant).catch(() => {});
  }

  return NextResponse.json(updated);
}
