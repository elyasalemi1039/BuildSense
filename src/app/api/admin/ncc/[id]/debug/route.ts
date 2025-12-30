import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, successResponse } from "@/lib/auth/admin";

/**
 * Debug endpoint to check edition data and uploaded files
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();

    // Get edition
    const { data: edition, error: editionError } = await (supabase as any)
      .from("ncc_editions")
      .select("*")
      .eq("id", editionId)
      .single();

    // Get upload jobs
    const { data: uploadJobs } = await (supabase as any)
      .from("ncc_ingestion_jobs")
      .select("*")
      .eq("edition_id", editionId)
      .eq("job_type", "UPLOAD")
      .order("created_at", { ascending: false });

    // Parse source_r2_key
    let parsedKey: any = null;
    let parseError: string | null = null;
    if (edition?.source_r2_key) {
      try {
        parsedKey = JSON.parse(edition.source_r2_key);
      } catch (e) {
        parseError = e instanceof Error ? e.message : "Parse error";
        parsedKey = edition.source_r2_key; // Show raw value
      }
    }

    return successResponse({
      edition: {
        id: edition?.id,
        name: edition?.name,
        status: edition?.status,
        source_r2_key_raw: edition?.source_r2_key,
        source_r2_key_parsed: parsedKey,
        source_r2_key_parse_error: parseError,
        source_r2_key_type: typeof edition?.source_r2_key,
        source_r2_key_length: edition?.source_r2_key?.length,
      },
      uploadJobs: uploadJobs?.map((job: any) => ({
        id: job.id,
        status: job.status,
        created_at: job.created_at,
        finished_at: job.finished_at,
        logs: job.logs,
      })),
      editionError: editionError?.message,
    });
  } catch (error) {
    return successResponse({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

