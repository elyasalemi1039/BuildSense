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
    const { objectKey, fileSize } = body;

    // Verify edition exists
    const { data: edition, error: getError } = await supabase
      .from("ncc_editions")
      .select("id, status")
      .eq("id", editionId)
      .single() as { data: { id: string; status: string } | null; error: any };

    if (getError || !edition) {
      return errorResponse("Edition not found", 404);
    }

    // Update edition with the R2 key and status
    await (supabase as any)
      .from("ncc_editions")
      .update({ 
        source_r2_key: objectKey,
        status: "uploaded",
        updated_at: new Date().toISOString() 
      })
      .eq("id", editionId);

    // Update the UPLOAD job record to success
    await (supabase as any)
      .from("ncc_ingestion_jobs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        logs: `File uploaded successfully at ${new Date().toISOString()}\nObject key: ${objectKey}\nFile size: ${fileSize} bytes`,
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

