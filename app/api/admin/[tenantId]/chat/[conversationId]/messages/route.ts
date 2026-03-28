import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { chatEvents } from "@/lib/events/chat-events";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> }
) {
  const { tenantId, conversationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conversation.status === "CLOSED") {
    return NextResponse.json({ error: "Chat is closed" }, { status: 403 });
  }

  const body = await req.json();
  const content = body?.content?.trim();
  if (!content) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: { conversationId, senderType: "STORE", content },
  });

  chatEvents.emitNewMessage({
    conversationId,
    messageId: message.id,
    senderType: "STORE",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }).catch((err) => console.error("[chat] broadcast failed:", err));

  return NextResponse.json(message);
}
