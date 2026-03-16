import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  // Get tenant from host header (same resolution as layout)
  const host =
    request.headers.get("x-tenant-host") ||
    request.headers.get("host") ||
    "";

  const domain = host.split(":")[0];

  // Try to find tenant by domain or slug prefix
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ domain }, { slug: domain.split(".")[0] }],
      isActive: true,
    },
    include: { config: true },
  });

  if (!tenant) {
    return NextResponse.json(
      { name: "Store Not Found", short_name: "404", start_url: "/", display: "standalone", icons: [] },
      { status: 404, headers: { "Content-Type": "application/manifest+json" } }
    );
  }

  const config = tenant.config;

  const manifest = {
    name: config?.pwaName || tenant?.name || "Order App",
    short_name: config?.pwaShortName || tenant?.name?.slice(0, 12) || "Order",
    description: config?.description || "Online ordering platform",
    start_url: "/order",
    display: "standalone" as const,
    background_color: config?.pwaBgColor || "#0a0a0a",
    theme_color: config?.pwaThemeColor || "#0a0a0a",
    orientation: "portrait-primary",
    icons: [
      {
        src: config?.logo || "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: config?.logo || "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
