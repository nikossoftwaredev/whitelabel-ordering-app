import { NextRequest, NextResponse } from "next/server";

import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = { tenantId };

  if (status) {
    where.status = status;
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { series: { contains: searchTerm, mode: "insensitive" } },
      { customerName: { contains: searchTerm, mode: "insensitive" } },
      { customerVat: { contains: searchTerm, mode: "insensitive" } },
    ];

    // If search looks like an invoice number (e.g. "A-0001"), also try parsing it
    const invoiceMatch = searchTerm.match(/^([A-Z]+)-?(\d+)$/i);
    if (invoiceMatch) {
      const seq = parseInt(invoiceMatch[2]);
      if (!isNaN(seq)) {
        (where.OR as Array<Record<string, unknown>>).push({
          series: invoiceMatch[1].toUpperCase(),
          sequenceNumber: seq,
        });
      }
    }
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { issueDate: "desc" },
      take: limit,
      skip: offset,
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
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({ invoices, total });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const body = await request.json();
  const { orderId, customerName, customerVat, invoiceType = "1.1", vatCategory = 1, paymentMethodCode = 3 } = body;

  if (!orderId) {
    return NextResponse.json(
      { error: "orderId is required" },
      { status: 400 }
    );
  }

  // Verify order exists and belongs to tenant
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check if invoice already exists for this order
  const existingInvoice = await prisma.invoice.findUnique({
    where: { orderId },
  });

  if (existingInvoice) {
    return NextResponse.json(
      { error: "Invoice already exists for this order" },
      { status: 409 }
    );
  }

  // Auto-generate invoice number using InvoiceSequence
  const series = "A";

  const sequence = await prisma.invoiceSequence.upsert({
    where: { tenantId_series: { tenantId, series } },
    create: { tenantId, series, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  const sequenceNumber = sequence.lastNumber;

  // Calculate VAT from order totals (prices are in cents)
  // netAmount and vatAmount/grossAmount are stored as Float in the schema
  const grossAmount = order.total / 100;
  const netAmount = grossAmount / 1.24; // assuming 24% VAT for Greece
  const vatAmount = grossAmount - netAmount;

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      orderId,
      series,
      sequenceNumber,
      invoiceType,
      issueDate: new Date(),
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      grossAmount: Math.round(grossAmount * 100) / 100,
      vatCategory,
      paymentMethodCode,
      status: "pending",
      customerName: customerName || order.customerName || null,
      customerVat: customerVat || null,
    },
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

  return NextResponse.json(invoice, { status: 201 });
}
