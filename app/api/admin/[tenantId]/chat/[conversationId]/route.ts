import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> }
) {
  const { tenantId, conversationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(conversation);
}

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string; conversationId: string }> }
) {
  const { tenantId, conversationId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.chatConversation.findFirst({
    where: { id: conversationId, tenantId },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { status: "CLOSED", closedAt: new Date() },
  });

  return NextResponse.json(updated);
}
