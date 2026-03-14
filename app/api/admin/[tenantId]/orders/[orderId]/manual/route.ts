import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";
import { generateOrderNumber } from "@/lib/orders/order-number";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const {
    items,
    paymentMethod = "CASH",
    customerName,
    customerPhone,
    customerNote,
  } = body;

  if (!items?.length) {
    return NextResponse.json(
      { error: "At least one item is required" },
      { status: 400 }
    );
  }

  const orderNumber = await generateOrderNumber(tenantId);

  // Calculate totals from provided items
  let subtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, tenantId },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Product ${item.productId} not found` },
        { status: 400 }
      );
    }

    const totalPrice = product.price * (item.quantity || 1);
    subtotal += totalPrice;

    orderItems.push({
      productId: product.id,
      productName: product.name,
      quantity: item.quantity || 1,
      unitPrice: product.price,
      totalPrice,
    });
  }

  const order = await prisma.order.create({
    data: {
      tenantId,
      orderNumber,
      paymentMethod,
      subtotal,
      total: subtotal,
      customerName,
      customerPhone,
      customerNote,
      items: {
        create: orderItems,
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
