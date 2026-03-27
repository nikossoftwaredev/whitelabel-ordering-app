import { NextResponse } from "next/server";

/**
 * Serves the Apple Pay domain association file required for Apple Pay.
 * The actual file content must be downloaded from:
 * Stripe Dashboard → Settings → Payment methods → Apple Pay → Add domain
 * Then set APPLE_PAY_DOMAIN_ASSOCIATION env variable with the file content.
 */
export async function GET() {
  const fileContent = process.env.APPLE_PAY_DOMAIN_ASSOCIATION;

  if (!fileContent) {
    return new NextResponse("Apple Pay domain association file not configured", {
      status: 404,
    });
  }

  return new NextResponse(fileContent, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
