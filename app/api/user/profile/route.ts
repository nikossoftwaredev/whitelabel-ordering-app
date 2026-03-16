import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

// GET /api/user/profile — return current user's profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, image: true },
  });

  return NextResponse.json(user);
}

// PATCH /api/user/profile — update current user's profile
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { phone } = body;

  if (phone !== undefined && typeof phone !== "string") {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(phone !== undefined && { phone: phone.trim() || null }),
    },
    select: { name: true, email: true, phone: true },
  });

  return NextResponse.json(user);
}
