import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./lib/i18n/routing";
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
    // Cookie-based tenant override for environments without wildcard subdomains
    const apiTenantCookie = request.cookies.get("__tenant")?.value;
    const realHost = request.headers.get("host") || "localhost:3000";
    const tenantHost = apiTenantCookie ? `${apiTenantCookie}.app` : realHost;

    const response = NextResponse.next({
      request: { headers: new Headers(request.headers) },
    });
    response.headers.set("x-tenant-host", tenantHost);
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  // Forward host as a request header so server components can read it via headers()
  let host = request.headers.get("host") || "localhost:3000";

  // Cookie-based tenant override for environments without wildcard subdomains
  // (e.g. Vercel preview URLs). The StoreSelector sets this cookie.
  const tenantCookie = request.cookies.get("__tenant")?.value;
  if (tenantCookie) {
    host = `${tenantCookie}.app`;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-host", host);
  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  // Non-API routes: run i18n middleware and add security headers
  const response = intlMiddleware(modifiedRequest);
  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/:path*"],
};
