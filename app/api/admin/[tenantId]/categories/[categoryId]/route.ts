import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string; categoryId: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { tenantId, categoryId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { name, nameEl, description, image, isActive } = body;

  const category = await prisma.category.update({
    where: { id: categoryId, tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(nameEl !== undefined && { nameEl }),
      ...(description !== undefined && { description }),
      ...(image !== undefined && { image }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { tenantId, categoryId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  await prisma.category.delete({
    where: { id: categoryId, tenantId },
  });

  return NextResponse.json({ success: true });
}
