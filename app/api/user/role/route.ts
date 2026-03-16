import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ isAdmin: false });
  }

  const host = request.headers.get("x-tenant-host") || request.headers.get("host") || "";
  const slug = host.split(":")[0].split(".")[0];

  // Check if user has any admin role for this tenant (or is SUPER_ADMIN)
  const role = await prisma.tenantRole.findFirst({
    where: {
      userId: session.user.id,
      OR: [
        { role: "SUPER_ADMIN" },
        {
          tenant: { slug },
          role: { in: ["OWNER", "ADMIN"] },
        },
      ],
    },
    select: { role: true },
  });

  return NextResponse.json({ isAdmin: !!role, role: role?.role || null });
}
