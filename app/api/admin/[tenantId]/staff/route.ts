import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, isAuthResult } from "@/lib/auth/require-role";

type Params = { params: Promise<{ tenantId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const tenantRoles = await prisma.tenantRole.findMany({
    where: { tenantId },
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
    orderBy: { role: "asc" },
  });

  return NextResponse.json(tenantRoles);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { email, role } = body;

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email and role are required" },
      { status: 400 }
    );
  }

  if (!["ADMIN", "CASHIER"].includes(role)) {
    return NextResponse.json(
      { error: "Role must be ADMIN or CASHIER" },
      { status: 400 }
    );
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found. They must sign up first." },
      { status: 404 }
    );
  }

  // Check if user already has a role for this tenant
  const existingRole = await prisma.tenantRole.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: user.id,
      },
    },
  });

  if (existingRole) {
    return NextResponse.json(
      { error: "This user already has a role in this store" },
      { status: 409 }
    );
  }

  const tenantRole = await prisma.tenantRole.create({
    data: {
      tenantId,
      userId: user.id,
      role,
    },
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

  return NextResponse.json(tenantRole, { status: 201 });
}
