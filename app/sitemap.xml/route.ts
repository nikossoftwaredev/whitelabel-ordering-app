import { NextRequest, NextResponse } from "next/server";

import { routing } from "@/lib/i18n/routing";
import { getBaseUrl } from "@/lib/tenant/url";

export async function GET(request: NextRequest) {
  const host =
    request.headers.get("x-tenant-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const baseUrl = getBaseUrl(host);

  const routes = ["", "/order", "/menu"];
  const today = new Date().toISOString().split("T")[0];

  const urls = routes.flatMap((route) =>
    routing.locales.map((locale) => {
      const url = `${baseUrl}/${locale}${route}`;
      const priority = route === "" ? "1.0" : "0.8";
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
