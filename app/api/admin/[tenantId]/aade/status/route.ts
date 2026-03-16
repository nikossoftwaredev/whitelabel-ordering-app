import { NextRequest, NextResponse } from "next/server";

import { AadeApiError,createAadeClient } from "@/lib/aade";
import { isAuthResult,requireRole } from "@/lib/auth/require-role";

type RouteParams = {
  params: Promise<{ tenantId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER"]);
  if (!isAuthResult(auth)) return auth;

  const aadeUserId = process.env.AADE_USER_ID;
  const aadeSubscriptionKey = process.env.AADE_SUBSCRIPTION_KEY;
  const aadeEnvironment =
    (process.env.AADE_ENVIRONMENT as "dev" | "production") || "dev";

  if (!aadeUserId || !aadeSubscriptionKey) {
    return NextResponse.json({
      connected: false,
      environment: aadeEnvironment,
      error: "AADE credentials are not configured",
    });
  }

  const client = createAadeClient({
    userId: aadeUserId,
    subscriptionKey: aadeSubscriptionKey,
    environment: aadeEnvironment,
  });

  try {
    // Send a minimal invoice with intentionally invalid data to test connectivity.
    // AADE will respond with a validation error (HTTP 200 with error in XML body),
    // which proves the connection and credentials are working.
    // A network/auth failure will throw an exception instead.
    await client.sendInvoice({
      issuer: {
        vatNumber: "000000000",
        country: "GR",
        branch: 0,
      },
      invoiceHeader: {
        series: "TEST",
        aa: "0",
        issueDate: "2000-01-01",
        invoiceType: "11.1",
        currency: "EUR",
      },
      invoiceDetails: [
        {
          lineNumber: 1,
          netValue: 0,
          vatCategory: 1,
          vatAmount: 0,
        },
      ],
      paymentMethods: [
        {
          type: 3,
          amount: 0,
        },
      ],
    });

    // If it succeeds (unlikely with dummy data), connection is confirmed
    return NextResponse.json({
      connected: true,
      environment: aadeEnvironment,
    });
  } catch (error) {
    // An AadeApiError with a 4xx status means AADE received and processed
    // our request -- the connection and auth are working, the data was just invalid
    if (error instanceof AadeApiError && error.statusCode < 500) {
      return NextResponse.json({
        connected: true,
        environment: aadeEnvironment,
      });
    }

    // Any other error means we couldn't reach AADE or auth failed
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json({
      connected: false,
      environment: aadeEnvironment,
      error: errorMessage,
    });
  }
}
