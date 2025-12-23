import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Route segment config for larger file uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout for large files
export const dynamic = "force-dynamic";

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

    if (edition.status !== "draft") {
      return errorResponse("Can only upload to draft editions", 400);
    }

    // Check if R2 is configured
    if (!r2Client) {
      // Update edition to mark as "uploaded" even in dev mode
      await (supabase as any)
        .from("ncc_editions")
        .update({ 
          status: "uploaded",
          updated_at: new Date().toISOString() 
        })
        .eq("id", editionId);

      return successResponse({
        message: "R2 not configured - upload skipped in development mode",
        devMode: true,
      });
    }

    // Get the file from the request
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 400);
    }

    // Validate file type
    if (!file.name.endsWith(".zip")) {
      return errorResponse("Invalid file type. Please upload a ZIP file.", 400);
    }

    // Validate file size (max 100MB for server upload to stay within limits)
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB
    if (file.size > MAX_SIZE) {
      return errorResponse("File too large. Maximum size is 100MB.", 400);
    }

    // Generate unique object key
    const uploadId = crypto.randomUUID();
    const objectKey = `ncc/raw/${editionId}/${uploadId}.zip`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      Body: buffer,
      ContentType: "application/zip",
    });

    await r2Client.send(command);

    // Update edition with the R2 key and status
    await (supabase as any)
      .from("ncc_editions")
      .update({ 
        source_r2_key: objectKey,
        status: "uploaded",
        updated_at: new Date().toISOString() 
      })
      .eq("id", editionId);

    // Create an UPLOAD job record
    await supabase
      .from("ncc_ingestion_jobs")
      .insert({
        edition_id: editionId,
        job_type: "UPLOAD",
        status: "success",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        logs: `File uploaded successfully at ${new Date().toISOString()}\nObject key: ${objectKey}\nFile size: ${file.size} bytes`,
        created_by: userId,
      } as any);

    return successResponse({
      objectKey,
      fileSize: file.size,
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to upload file",
      500
    );
  }
}

