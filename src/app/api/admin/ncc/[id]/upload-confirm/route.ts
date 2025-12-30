import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

export const runtime = "nodejs";

function volumeToRunVolume(volumeKey: unknown): string {
  const v = typeof volumeKey === "string" ? volumeKey : "unknown";
  switch (v) {
    case "volume_one":
      return "V1";
    case "volume_two":
      return "V2";
    case "volume_three":
      return "V3";
    case "housing_provisions":
      return "Housing";
    default:
      return "Unknown";
  }
}

async function enqueueIngestRun(ingestRunId: string) {
  const enqueueUrl = process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_URL;
  const token = process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN;

  console.log(`[Enqueue] URL: ${enqueueUrl || "NOT SET"}`);
  console.log(`[Enqueue] Token: ${token ? "SET (length: " + token.length + ")" : "NOT SET"}`);

  if (!enqueueUrl || !token) {
    throw new Error("Missing CLOUDFLARE_NCC_INGEST_ENQUEUE_URL or CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN");
  }

  console.log(`[Enqueue] Calling ${enqueueUrl} with ingestRunId: ${ingestRunId}`);

  const res = await fetch(enqueueUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingestRunId }),
  });

  console.log(`[Enqueue] Response status: ${res.status} ${res.statusText}`);

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || res.statusText;
    console.error(`[Enqueue] Error response:`, json);
    throw new Error(`Failed to enqueue ingest run: ${msg} (URL: ${enqueueUrl}, Status: ${res.status})`);
  }

  console.log(`[Enqueue] Success:`, json);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[Upload Confirm] Starting...");
    
    const { userId } = await requireAdmin();
    const { id: editionId } = await params;
    
    console.log(`[Upload Confirm] Admin check passed. Edition: ${editionId}, User: ${userId}`);
    
    const supabase = await createClient();
    const body = await request.json();
    const { objectKey, fileSize, volume } = body;
    
    console.log(`[Upload Confirm] Body parsed: objectKey=${objectKey}, volume=${volume}, size=${fileSize}`);

    // Verify edition exists (and admin has access)
    const { data: edition, error: getError } = await supabase
      .from("ncc_editions")
      .select("id, status, name")
      .eq("id", editionId)
      .single() as { data: { id: string; status: string; name: string } | null; error: any };

    if (getError || !edition) {
      return errorResponse("Edition not found", 404);
    }

    // Create ingest run (new pipeline). We store editionId in `edition` column.
    const runVolume = volumeToRunVolume(volume);
    const { data: ingestRun, error: ingestRunError } = await (supabase as any)
      .from("ncc_ingest_run")
      .insert({
        edition: editionId,
        volume: runVolume,
        r2_zip_key: objectKey,
        status: "queued",
      })
      .select()
      .single();

    if (ingestRunError || !ingestRun) {
      console.error("Failed to create ingest run:", ingestRunError);
      return errorResponse(
        ingestRunError?.message || "Failed to create ingest run",
        500
      );
    }

    // Enqueue background ingest
    console.log(`[Upload Confirm] Enqueueing ingest run ${ingestRun.id}...`);
    try {
      await enqueueIngestRun(ingestRun.id);
      console.log(`[Upload Confirm] Enqueue successful`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to enqueue";
      console.error(`[Upload Confirm] Enqueue failed:`, e);
      await (supabase as any)
        .from("ncc_ingest_run")
        .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
        .eq("id", ingestRun.id);
      return errorResponse(msg, 500);
    }

    // Update the UPLOAD job record to success
    await (supabase as any)
      .from("ncc_ingestion_jobs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        logs: `File uploaded successfully at ${new Date().toISOString()}\nVolume: ${volume || "unknown"}\nObject key: ${objectKey}\nFile size: ${fileSize} bytes\nIngest run: ${ingestRun.id}`,
      })
      .eq("edition_id", editionId)
      .eq("job_type", "UPLOAD")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1);

    return successResponse({
      message: "Upload confirmed",
      objectKey,
      ingestRunId: ingestRun.id,
      ingestRunStatus: ingestRun.status,
    });
  } catch (error) {
    console.error("Upload confirm error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to confirm upload",
      500
    );
  }
}



