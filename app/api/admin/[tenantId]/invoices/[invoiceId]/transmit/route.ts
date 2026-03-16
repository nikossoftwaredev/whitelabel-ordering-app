import { NextRequest, NextResponse } from "next/server";

import type { AadeInvoiceInput } from "@/lib/aade";
import {
  AADE_INCOME_CLASSIFICATION,
  AADE_INCOME_CLASSIFICATION_CATEGORY,
  AadeApiError,
  AadeNetworkError,
  AadeTimeoutError,
  AadeValidationError,
  createAadeClient,
} from "@/lib/aade";
import { isAuthResult,requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";

type RouteParams = {
  params: Promise<{ tenantId: string; invoiceId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, invoiceId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  // Validate AADE credentials are configured
  const aadeUserId = process.env.AADE_USER_ID;
  const aadeSubscriptionKey = process.env.AADE_SUBSCRIPTION_KEY;
  const aadeEnvironment =
    (process.env.AADE_ENVIRONMENT as "dev" | "production") || "dev";

  if (!aadeUserId || !aadeSubscriptionKey) {
    return NextResponse.json(
      { error: "AADE credentials are not configured" },
      { status: 500 }
    );
  }

  // Find the invoice with its order and tenant
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          total: true,
          subtotal: true,
        },
      },
      tenant: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "submitted") {
    return NextResponse.json(
      { error: "Invoice has already been transmitted to AADE" },
      { status: 400 }
    );
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot transmit a cancelled invoice" },
      { status: 400 }
    );
  }

  // Build the AADE invoice input from the database record
  const issueDateStr = invoice.issueDate.toISOString().split("T")[0];

  const invoiceInput: AadeInvoiceInput = {
    issuer: {
      vatNumber: invoice.tenant.phone || "", // Tenant VAT should be configured
      country: "GR",
      branch: 0,
    },
    invoiceHeader: {
      series: invoice.series,
      aa: String(invoice.sequenceNumber),
      issueDate: issueDateStr,
      invoiceType: invoice.invoiceType,
      currency: "EUR",
    },
    invoiceDetails: [
      {
        lineNumber: 1,
        netValue: invoice.netAmount,
        vatCategory: invoice.vatCategory,
        vatAmount: invoice.vatAmount,
        incomeClassification: {
          classificationType:
            AADE_INCOME_CLASSIFICATION.SERVICE_REVENUE_RETAIL,
          classificationCategory:
            AADE_INCOME_CLASSIFICATION_CATEGORY.SERVICE_PROVISION_REVENUE,
          amount: invoice.netAmount,
        },
      },
    ],
    paymentMethods: [
      {
        type: invoice.paymentMethodCode,
        amount: invoice.grossAmount,
      },
    ],
  };

  // Add counterpart for B2B invoices (when customer VAT is provided)
  if (invoice.customerVat) {
    invoiceInput.counterpart = {
      vatNumber: invoice.customerVat,
      country: "GR",
      branch: 0,
      name: invoice.customerName || undefined,
    };
  }

  // Create the AADE client and transmit
  const client = createAadeClient({
    userId: aadeUserId,
    subscriptionKey: aadeSubscriptionKey,
    environment: aadeEnvironment,
  });

  try {
    const result = await client.sendInvoice(invoiceInput);

    if (result.success) {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          uid: result.uid,
          mark: result.mark,
          authCode: result.authenticationCode,
          qrUrl: result.qrUrl,
          status: "submitted",
          submittedAt: new Date(),
          aadeErrors: null,
          retryCount: { increment: 1 },
          lastRetryAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        invoice: updated,
        aade: {
          uid: result.uid,
          mark: result.mark,
          authenticationCode: result.authenticationCode,
          qrUrl: result.qrUrl,
        },
      });
    }

    // AADE returned errors in the response
    const errorMessages = result.errors
      ?.map((e) => `[${e.code}] ${e.message}`)
      .join("; ");

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        aadeErrors: errorMessages || "Unknown AADE error",
        status: "error",
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        success: false,
        errors: result.errors,
      },
      { status: 422 }
    );
  } catch (error) {
    let errorMessage = "Unknown error during AADE transmission";

    if (error instanceof AadeValidationError) {
      errorMessage = `Validation error: ${error.field} - ${error.constraint}`;
    } else if (error instanceof AadeTimeoutError) {
      errorMessage = `AADE API timeout on ${error.endpoint}`;
    } else if (error instanceof AadeNetworkError) {
      errorMessage = `Network error: ${error.message}`;
    } else if (error instanceof AadeApiError) {
      errorMessage = `AADE API error [${error.code}]: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        aadeErrors: errorMessage,
        status: "error",
        retryCount: { increment: 1 },
        lastRetryAt: new Date(),
      },
    });

    const statusCode =
      error instanceof AadeApiError ? error.statusCode : 500;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
