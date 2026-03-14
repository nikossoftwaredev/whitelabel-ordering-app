import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const status = request.nextUrl.searchParams.get("status");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(status && { status: status as any }),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      items: {
        include: { modifiers: true },
      },
      customer: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
    },
  });

  const total = await prisma.order.count({
    where: {
      tenantId,
      ...(status && { status: status as any }),
    },
  });

  return NextResponse.json({ orders, total });
}
