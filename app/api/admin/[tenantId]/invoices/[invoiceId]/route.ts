import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ tenantId: string; invoiceId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tenantId, invoiceId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          total: true,
          subtotal: true,
          items: {
            include: { modifiers: true },
          },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId, invoiceId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot update a cancelled invoice" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const allowedFields = ["customerName", "customerVat", "status"];
  const data: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { tenantId, invoiceId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json(
      { error: "Invoice is already cancelled" },
      { status: 400 }
    );
  }

  // If invoice was submitted to AADE, we can't just delete it
  if (invoice.mark) {
    return NextResponse.json(
      { error: "Cannot cancel a transmitted invoice without AADE cancellation" },
      { status: 400 }
    );
  }

  const cancelled = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });

  return NextResponse.json(cancelled);
}
