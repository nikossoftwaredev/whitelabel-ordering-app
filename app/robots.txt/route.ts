import { NextRequest, NextResponse } from "next/server";

import { getBaseUrl } from "@/lib/tenant/url";

export async function GET(request: NextRequest) {
  const host =
    request.headers.get("x-tenant-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const baseUrl = getBaseUrl(host);

  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
