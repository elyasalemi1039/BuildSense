import { NextRequest, NextResponse } from "next/server";

import { getDownloadUrl } from "@/lib/storage/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const r2Key = path.join("/");

    if (!r2Key.startsWith("ncc/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    // Generate a signed URL for the image
    const url = await getDownloadUrl(r2Key, 3600); // 1 hour expiry

    if (!url) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Redirect to the signed URL
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 500 }
    );
  }
}

