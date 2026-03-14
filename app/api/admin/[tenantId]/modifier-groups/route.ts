import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN", "CASHIER"]);
  if (!isAuthResult(auth)) return auth;

  const groups = await prisma.modifierGroup.findMany({
    where: { tenantId },
    orderBy: { sortOrder: "asc" },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json(groups);
}

interface OptionInput {
  name: string;
  nameEl?: string;
  priceAdjustment?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { name, nameEl, required, minSelect, maxSelect, options } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const maxSort = await prisma.modifierGroup.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });

  const group = await prisma.modifierGroup.create({
    data: {
      tenantId,
      name,
      nameEl,
      required: required ?? false,
      minSelect: minSelect ?? 0,
      maxSelect: maxSelect ?? 1,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      ...(options?.length && {
        options: {
          create: options.map((opt: OptionInput, i: number) => ({
            name: opt.name,
            nameEl: opt.nameEl,
            priceAdjustment: opt.priceAdjustment ?? 0,
            isDefault: opt.isDefault ?? false,
            sortOrder: opt.sortOrder ?? i,
          })),
        },
      }),
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(group, { status: 201 });
}
