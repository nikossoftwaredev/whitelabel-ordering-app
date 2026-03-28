import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversations = await prisma.chatConversation.findMany({
    where: { tenantId },
    orderBy: { updatedAt: "desc" },
    include: {
      order: { select: { orderNumber: true, status: true, total: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      customer: { select: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(conversations);
}
