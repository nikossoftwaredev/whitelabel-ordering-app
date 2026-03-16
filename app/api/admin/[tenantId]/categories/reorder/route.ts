import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { order } = body as { order: { id: string; sortOrder: number }[] };

  if (!Array.isArray(order)) {
    return NextResponse.json(
      { error: "order array is required" },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    order.map(({ id, sortOrder }) =>
      prisma.category.update({
        where: { id, tenantId },
        data: { sortOrder },
      })
    )
  );

  return NextResponse.json({ success: true });
}
