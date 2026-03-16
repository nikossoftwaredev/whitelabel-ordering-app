import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ tenantId: string; roleId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { tenantId, roleId } = await params;
  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { role } = body;

  if (!role || !["ADMIN", "CASHIER"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be ADMIN or CASHIER" },
      { status: 400 }
    );
  }

  // Find the tenant role
  const tenantRole = await prisma.tenantRole.findUnique({
    where: { id: roleId, tenantId },
  });

  if (!tenantRole) {
    return NextResponse.json(
      { error: "Staff member not found" },
      { status: 404 }
    );
  }

  // Cannot change OWNER role
  if (tenantRole.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot change the owner's role" },
      { status: 403 }
    );
  }

  // Cannot change own role
  if (tenantRole.userId === auth.userId) {
    return NextResponse.json(
      { error: "Cannot change your own role" },
      { status: 403 }
    );
  }

  const updated = await prisma.tenantRole.update({
    where: { id: roleId },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          phone: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { tenantId, roleId } = await params;
  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  // Find the tenant role
  const tenantRole = await prisma.tenantRole.findUnique({
    where: { id: roleId, tenantId },
  });

  if (!tenantRole) {
    return NextResponse.json(
      { error: "Staff member not found" },
      { status: 404 }
    );
  }

  // Cannot remove OWNER
  if (tenantRole.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the owner" },
      { status: 403 }
    );
  }

  // Cannot remove self
  if (tenantRole.userId === auth.userId) {
    return NextResponse.json(
      { error: "Cannot remove yourself" },
      { status: 403 }
    );
  }

  await prisma.tenantRole.delete({
    where: { id: roleId },
  });

  return NextResponse.json({ success: true });
}
