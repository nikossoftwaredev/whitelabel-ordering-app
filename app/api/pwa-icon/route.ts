import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { getTenantByDomain } from "@/lib/tenant/resolve";

const ALLOWED_SIZES = [192, 512];

/**
 * GET /api/pwa-icon?size=192
 *
 * Fetches the tenant's logo and resizes it to exact PWA icon dimensions.
 * Chrome validates that manifest icon sizes match the actual image,
 * so we must serve properly-sized PNGs for installability.
 */
export async function GET(req: NextRequest) {
  const size = Number(req.nextUrl.searchParams.get("size") || "192");
  if (!ALLOWED_SIZES.includes(size)) {
    return NextResponse.json({ error: "Invalid size" }, { status: 400 });
  }

  const host =
    req.headers.get("x-tenant-host") || req.headers.get("host") || "localhost:3000";
  const tenant = await getTenantByDomain(host);
  const logo = tenant?.config?.logo || tenant?.config?.logoSmall;

  if (!logo) {
    // Redirect to static fallback
    const fallback = size <= 192 ? "/images/icon-192.png" : "/images/icon-512.png";
    return NextResponse.redirect(new URL(fallback, req.url));
  }

  try {
    const res = await fetch(logo);
    if (!res.ok) throw new Error("Failed to fetch logo");

    const buffer = Buffer.from(await res.arrayBuffer());

    const resized = await sharp(buffer)
      .resize(size, size, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

    return new NextResponse(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    const fallback = size <= 192 ? "/images/icon-192.png" : "/images/icon-512.png";
    return NextResponse.redirect(new URL(fallback, req.url));
  }
}
