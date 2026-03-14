import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "./lib/security/cors";

const intlMiddleware = createMiddleware(routing);

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
};

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  // Handle CORS preflight for API routes
  if (pathname.startsWith("/api") && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin),
        ...securityHeaders,
      },
    });
  }

  // For API routes, add CORS and security headers but skip i18n middleware
  if (pathname.startsWith("/api")) {
    const response = NextResponse.next();
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Non-API routes: run i18n middleware and add security headers
  const response = intlMiddleware(request);
  // Forward the host header so the layout can resolve the tenant
  const host = request.headers.get("host") || "localhost:3000";
  response.headers.set("x-tenant-host", host);
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/:path*"],
};
