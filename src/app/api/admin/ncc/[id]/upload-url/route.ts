import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();

    // Verify edition exists and is in draft status
    const { data: edition, error: getError } = await supabase
      .from("ncc_editions")
      .select("id, status")
      .eq("id", editionId)
      .single() as { data: { id: string; status: string } | null; error: any };

    if (getError || !edition) {
      return errorResponse("Edition not found", 404);
    }

    if (edition.status !== "draft" && edition.status !== "uploaded") {
      return errorResponse("Can only upload to draft or uploaded editions", 400);
    }

    // Get volume from request body
    const body = await request.json().catch(() => ({}));
    const volume = body.volume || "unknown";

    // Generate unique object key with volume prefix
    const uploadId = crypto.randomUUID();
    const objectKey = `ncc/raw/${editionId}/${volume}/${uploadId}.zip`;

    // Check if R2 is configured
    if (!r2Client) {
      // For development without R2, return a mock response
      return successResponse({
        uploadUrl: null,
        objectKey,
        message: "R2 not configured - upload skipped in development",
        devMode: true,
      });
    }

    // Generate presigned PUT URL
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: "application/zip",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Create an UPLOAD job record
    await supabase
      .from("ncc_ingestion_jobs")
      .insert({
        edition_id: editionId,
        job_type: "UPLOAD",
        status: "queued",
        logs: `Upload URL generated at ${new Date().toISOString()}\nVolume: ${volume}\nObject key: ${objectKey}`,
        created_by: userId,
      } as any);

    return successResponse({
      uploadUrl,
      objectKey,
    });
  } catch (error) {
    console.error("Upload URL error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to generate upload URL",
      500
    );
  }
}

