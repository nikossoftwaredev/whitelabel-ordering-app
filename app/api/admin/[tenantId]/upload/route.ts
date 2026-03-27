import { NextRequest, NextResponse } from "next/server";

import { isAuthResult, requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/db";
import {
  deleteFile,
  IMAGE_TYPE_FOLDER,
  type ImageType,
  MAX_IMAGE_FILE_SIZE,
  uploadFile,
} from "@/lib/files/upload";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const VALID_IMAGE_TYPES = new Set<string>(Object.keys(IMAGE_TYPE_FOLDER));

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 413 },
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      {
        error:
          "Invalid file type. Only JPEG, PNG, WebP, AVIF, and GIF are allowed.",
      },
      { status: 415 },
    );
  }

  const rawType = formData.get("type") as string | null;
  const imageType: ImageType =
    rawType && VALID_IMAGE_TYPES.has(rawType)
      ? (rawType as ImageType)
      : "product";

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const folder = IMAGE_TYPE_FOLDER[imageType];
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${tenant.slug}/${folder}/${Date.now()}-${safeName}`;
  const url = await uploadFile(buffer, fileName);

  return NextResponse.json({ url });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const auth = await requireRole(tenantId, ["OWNER", "ADMIN"]);
  if (!isAuthResult(auth)) return auth;

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  await deleteFile(url);
  return NextResponse.json({ success: true });
}
