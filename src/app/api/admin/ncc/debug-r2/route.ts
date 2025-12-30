import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET() {
  try {
    await requireAdmin();
    
    const config = {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || "NOT SET",
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "NOT SET",
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? `SET (length: ${process.env.R2_ACCESS_KEY_ID.length})` : "NOT SET",
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? `SET (length: ${process.env.R2_SECRET_ACCESS_KEY.length})` : "NOT SET",
      CLOUDFLARE_NCC_INGEST_ENQUEUE_URL: process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_URL || "NOT SET",
      CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN: process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN ? `SET (length: ${process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN.length})` : "NOT SET",
    };
    
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

