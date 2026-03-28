import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { chatEvents } from "@/lib/events/chat-events";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> }
) {
  const { tenantSlug, conversationId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: tenant.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(conversation);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> }
) {
  const { tenantSlug, conversationId } = await params;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug, isActive: true } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId: tenant.id },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.status === "CLOSED") {
    return NextResponse.json({ error: "Chat is closed" }, { status: 403 });
  }

  const body = await req.json();
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: { conversationId, senderType: "CUSTOMER", content },
  });

  const event = {
    conversationId,
    messageId: message.id,
    senderType: "CUSTOMER" as const,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };
  chatEvents.emitNewMessage(event).catch((err) => console.error("[chat] broadcast failed:", err));
  chatEvents.emitCustomerMessage(tenant.id, event).catch((err) => console.error("[chat] admin broadcast failed:", err));

  return NextResponse.json(message);
}
