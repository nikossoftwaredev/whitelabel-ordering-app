import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } });
  if (!tenant) return NextResponse.json([], { status: 200 });

  const customer = await prisma.customer.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
  });
  if (!customer) return NextResponse.json([], { status: 200 });

  const conversations = await prisma.chatConversation.findMany({
    where: { customerId: customer.id, tenantId: tenant.id },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { orderNumber: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      orderNumber: c.order.orderNumber,
      status: c.status,
      lastMessage: c.messages[0]?.content ?? null,
      updatedAt: c.updatedAt,
    }))
  );
}
