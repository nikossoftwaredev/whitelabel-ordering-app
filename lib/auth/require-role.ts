import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

interface AuthResult {
  userId: string;
  tenantId: string;
  role: Role;
}

export async function requireRole(
  tenantId: string,
  allowedRoles: Role[]
): Promise<AuthResult | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is SUPER_ADMIN (bypasses tenant check)
  const superAdminRole = await prisma.tenantRole.findFirst({
    where: {
      userId: session.user.id,
      role: "SUPER_ADMIN",
    },
  });

  if (superAdminRole) {
    return {
      userId: session.user.id,
      tenantId,
      role: "SUPER_ADMIN",
    };
  }

  // Check tenant-specific role
  const tenantRole = await prisma.tenantRole.findUnique({
    where: {
      tenantId_userId: {
        tenantId,
        userId: session.user.id,
      },
    },
  });

  if (!tenantRole || !allowedRoles.includes(tenantRole.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    userId: session.user.id,
    tenantId,
    role: tenantRole.role,
  };
}

export const isAuthResult = (
  result: AuthResult | NextResponse
): result is AuthResult => {
  return !(result instanceof NextResponse);
};
