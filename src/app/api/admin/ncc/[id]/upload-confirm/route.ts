import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();
    const body = await request.json();
    const { objectKey, fileSize, volume } = body;

    // Verify edition exists
    const { data: edition, error: getError } = await supabase
      .from("ncc_editions")
      .select("id, status, source_r2_key")
      .eq("id", editionId)
      .single() as { data: { id: string; status: string; source_r2_key: string | null } | null; error: any };

    if (getError || !edition) {
      return errorResponse("Edition not found", 404);
    }

    // For multi-file uploads, append to existing keys or create new
    // Store as JSON array of upload info
    let uploadedFiles: Array<{ key: string; volume: string; size: number; uploadedAt: string }> = [];
    
    // Try to parse existing source_r2_key as JSON array, fallback to single key
    if (edition.source_r2_key) {
      try {
        uploadedFiles = JSON.parse(edition.source_r2_key);
      } catch {
        // Legacy single file - convert to array
        uploadedFiles = [{ key: edition.source_r2_key, volume: "unknown", size: 0, uploadedAt: new Date().toISOString() }];
      }
    }

    // Add new file
    uploadedFiles.push({
      key: objectKey,
      volume: volume || "unknown",
      size: fileSize,
      uploadedAt: new Date().toISOString(),
    });

    // Update edition with the R2 keys and status
    const { error: updateError } = await (supabase as any)
      .from("ncc_editions")
      .update({ 
        source_r2_key: JSON.stringify(uploadedFiles),
        status: "uploaded",
        updated_at: new Date().toISOString() 
      })
      .eq("id", editionId);
    
    if (updateError) {
      console.error("Failed to update edition:", updateError);
      return errorResponse(`Failed to update edition: ${updateError.message}`, 500);
    }
    
    console.log(`Updated edition ${editionId} with ${uploadedFiles.length} files`);

    // Update the UPLOAD job record to success
    await (supabase as any)
      .from("ncc_ingestion_jobs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        logs: `File uploaded successfully at ${new Date().toISOString()}\nVolume: ${volume || "unknown"}\nObject key: ${objectKey}\nFile size: ${fileSize} bytes\nTotal files: ${uploadedFiles.length}`,
      })
      .eq("edition_id", editionId)
      .eq("job_type", "UPLOAD")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1);

    return successResponse({
      message: "Upload confirmed",
      objectKey,
    });
  } catch (error) {
    console.error("Upload confirm error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to confirm upload",
      500
    );
  }
}



