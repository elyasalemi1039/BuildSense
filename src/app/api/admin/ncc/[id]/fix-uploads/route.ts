import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

/**
 * Emergency fix endpoint to reconstruct source_r2_key from upload job logs
 * Use this if uploads succeeded but source_r2_key wasn't set
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();

    // Get all successful upload jobs for this edition
    const { data: uploadJobs, error: jobsError } = await supabase
      .from("ncc_ingestion_jobs")
      .select("*")
      .eq("edition_id", editionId)
      .eq("job_type", "UPLOAD")
      .eq("status", "success")
      .order("created_at", { ascending: true });

    if (jobsError) {
      return errorResponse("Failed to fetch upload jobs", 500);
    }

    if (!uploadJobs || uploadJobs.length === 0) {
      return errorResponse("No successful upload jobs found", 404);
    }

    // Extract object keys and volumes from logs
    const uploadedFiles: Array<{ key: string; volume: string; size: number; uploadedAt: string }> = [];

    for (const job of uploadJobs) {
      const logs = job.logs || "";
      
      // Parse logs to extract object key and volume
      const keyMatch = logs.match(/Object key: (.+)/);
      const volumeMatch = logs.match(/Volume: (.+)/);
      const sizeMatch = logs.match(/File size: (\d+)/);
      
      if (keyMatch && volumeMatch) {
        uploadedFiles.push({
          key: keyMatch[1].trim(),
          volume: volumeMatch[1].trim(),
          size: sizeMatch ? parseInt(sizeMatch[1]) : 0,
          uploadedAt: job.finished_at || job.created_at,
        });
      }
    }

    if (uploadedFiles.length === 0) {
      return errorResponse("Could not extract upload info from job logs", 400);
    }

    // Update edition with reconstructed source_r2_key
    const { error: updateError } = await (supabase as any)
      .from("ncc_editions")
      .update({ 
        source_r2_key: JSON.stringify(uploadedFiles),
        status: "uploaded",
        updated_at: new Date().toISOString() 
      })
      .eq("id", editionId);

    if (updateError) {
      return errorResponse(`Failed to update edition: ${updateError.message}`, 500);
    }

    return successResponse({
      message: "Successfully reconstructed source_r2_key",
      filesFound: uploadedFiles.length,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Fix uploads error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fix uploads",
      500
    );
  }
}

