import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";

type Params = { params: Promise<{ tenantId: string; groupId: string }> };

interface OptionInput {
  id?: string;
  name: string;
  nameEl?: string;
  priceAdjustment?: number;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { name, nameEl, required, minSelect, maxSelect, options } = body;

  // If options provided, sync them (upsert existing, create new, delete removed)
  if (options) {
    const existingOptions = await prisma.modifierOption.findMany({
      where: { modifierGroupId: groupId },
      select: { id: true },
    });

    const incomingIds = options
      .filter((o: OptionInput) => o.id)
      .map((o: OptionInput) => o.id);
    const toDelete = existingOptions.filter((e) => !incomingIds.includes(e.id));

    await prisma.$transaction([
      // Delete removed options
      ...(toDelete.length
        ? [
            prisma.modifierOption.deleteMany({
              where: { id: { in: toDelete.map((d) => d.id) } },
            }),
          ]
        : []),
      // Upsert options
      ...options.map((opt: OptionInput, i: number) =>
        opt.id
          ? prisma.modifierOption.update({
              where: { id: opt.id },
              data: {
                name: opt.name,
                nameEl: opt.nameEl,
                priceAdjustment: opt.priceAdjustment ?? 0,
                isDefault: opt.isDefault ?? false,
                isActive: opt.isActive ?? true,
                sortOrder: opt.sortOrder ?? i,
              },
            })
          : prisma.modifierOption.create({
              data: {
                modifierGroupId: groupId,
                name: opt.name,
                nameEl: opt.nameEl,
                priceAdjustment: opt.priceAdjustment ?? 0,
                isDefault: opt.isDefault ?? false,
                sortOrder: opt.sortOrder ?? i,
              },
            })
      ),
    ]);
  }

  const group = await prisma.modifierGroup.update({
    where: { id: groupId, tenantId },
    data: {
      ...(name !== undefined && { name }),
      ...(nameEl !== undefined && { nameEl }),
      ...(required !== undefined && { required }),
      ...(minSelect !== undefined && { minSelect }),
      ...(maxSelect !== undefined && { maxSelect }),
    },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(group);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { tenantId, groupId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  await prisma.modifierGroup.delete({
    where: { id: groupId, tenantId },
  });

  return NextResponse.json({ success: true });
}
