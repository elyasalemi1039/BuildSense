import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    
    if (!r2Client) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 500 });
    }

    // Generate a test presigned URL
    const testKey = `test-uploads/test-${Date.now()}.txt`;
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      ContentType: "text/plain",
    });

    const uploadUrl = await getSignedUrl(r2Client, putCommand, { expiresIn: 300 });

    // Try to upload test content
    const testContent = "Test upload at " + new Date().toISOString();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: testContent,
      headers: {
        "Content-Type": "text/plain",
      },
    });

    if (!uploadResponse.ok) {
      return NextResponse.json({
        error: "Upload failed",
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        body: await uploadResponse.text().catch(() => ""),
      }, { status: 500 });
    }

    // Verify the file exists
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
    });

    const getResponse = await r2Client.send(getCommand);
    const downloadedContent = await getResponse.Body?.transformToString();

    return NextResponse.json({
      success: true,
      testKey,
      uploadStatus: uploadResponse.status,
      uploadedContent: testContent,
      downloadedContent,
      match: testContent === downloadedContent,
      bucket: R2_BUCKET_NAME,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}


