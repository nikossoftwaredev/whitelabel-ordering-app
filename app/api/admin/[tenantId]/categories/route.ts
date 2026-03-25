import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { invalidateMenuCache } from "@/lib/cache/invalidate";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const categories = await prisma.category.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return NextResponse.json(categories);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { name, nameEl, description, image } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Get max sort order
  const maxSort = await prisma.category.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });

  const category = await prisma.category.create({
    data: {
      tenantId,
      name,
      nameEl,
      description,
      image,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  await invalidateMenuCache(tenantId);

  return NextResponse.json(category, { status: 201 });
}
