import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; orderId: string }> }
) {
  const { tenantSlug, orderId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = await prisma.order.findFirst({ where: { id: orderId, tenantId: tenant.id } });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let conversation = await prisma.chatConversation.findUnique({
    where: { orderId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) {
    const session = await getServerSession(authOptions);
    let customerId: string | null = null;
    if (session?.user?.id) {
      const customer = await prisma.customer.findUnique({
        where: { tenantId_userId: { tenantId: tenant.id, userId: session.user.id } },
      });
      customerId = customer?.id ?? null;
    }
    conversation = await prisma.chatConversation.create({
      data: { tenantId: tenant.id, orderId, customerId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  return NextResponse.json(conversation);
}
