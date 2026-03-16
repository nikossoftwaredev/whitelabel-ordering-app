import { NextRequest, NextResponse } from "next/server";

import {
  AadeApiError,
  AadeNetworkError,
  AadeTimeoutError,
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

  // Find the invoice
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (!invoice.mark) {
    return NextResponse.json(
      { error: "Invoice has not been transmitted to AADE (no mark found)" },
      { status: 400 }
    );
  }

  if (invoice.status === "cancelled") {
    return NextResponse.json(
      { error: "Invoice is already cancelled" },
      { status: 400 }
    );
  }

  // Create the AADE client and send cancellation
  const client = createAadeClient({
    userId: aadeUserId,
    subscriptionKey: aadeSubscriptionKey,
    environment: aadeEnvironment,
  });

  try {
    const result = await client.cancelInvoice(invoice.mark);

    if (result.success) {
      const updated = await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancellationMark: result.cancellationMark,
          aadeErrors: null,
        },
      });

      return NextResponse.json({
        success: true,
        invoice: updated,
        aade: {
          cancellationMark: result.cancellationMark,
        },
      });
    }

    // AADE returned errors
    const errorMessages = result.errors
      ?.map((e) => `[${e.code}] ${e.message}`)
      .join("; ");

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        aadeErrors: errorMessages || "Unknown AADE cancellation error",
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
    let errorMessage = "Unknown error during AADE cancellation";

    if (error instanceof AadeTimeoutError) {
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
