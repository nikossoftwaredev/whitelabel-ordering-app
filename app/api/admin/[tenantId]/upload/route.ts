import { NextRequest, NextResponse } from "next/server";

import { deleteFile, uploadFile } from "@/lib/files/upload";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Store-scoped path: stores/{tenantId}/products/{timestamp}-{filename}
  const fileName = `stores/${tenantId}/products/${Date.now()}-${file.name}`;
  const url = await uploadFile(buffer, fileName);

  return NextResponse.json({ url });
}

export async function DELETE(req: NextRequest) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  await deleteFile(url);
  return NextResponse.json({ success: true });
}
