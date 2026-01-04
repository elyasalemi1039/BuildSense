import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function successResponse(data: unknown) {
  return NextResponse.json(data);
}

async function enqueueIngestRun(ingestRunId: string) {
  const enqueueUrl = process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_URL;
  const token = process.env.CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN;

  if (!enqueueUrl || !token) {
    console.error("[Enqueue] Missing CLOUDFLARE_NCC_INGEST_ENQUEUE_URL or CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN");
    throw new Error("Missing CLOUDFLARE_NCC_INGEST_ENQUEUE_URL or CLOUDFLARE_NCC_INGEST_ENQUEUE_TOKEN");
  }
  console.log(`[Enqueue] Calling: ${enqueueUrl}`);
  console.log(`[Enqueue] Token: ${token ? 'SET (length: ' + token.length + ')' : 'NOT SET'}`);

  const res = await fetch(enqueueUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ingestRunId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (json && (json.error || json.message)) || res.statusText;
    console.error(`[Enqueue] Failed to enqueue ingest run: ${res.status} - ${msg}`);
    throw new Error(`Failed to enqueue ingest run: ${msg}`);
  }
  console.log("[Enqueue] Successfully enqueued:", json);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: editionId } = await params;
    
    const supabase = await createClient();
    
    // Get all queued ingest runs for this edition
    const { data: runs, error: runsError } = await (supabase as any)
      .from("ncc_ingest_run")
      .select("id, volume, status")
      .eq("edition", editionId)
      .eq("status", "queued")
      .order("created_at", { ascending: true });

    if (runsError) {
      console.error("Failed to fetch ingest runs:", runsError);
      return errorResponse("Failed to fetch ingest runs", 500);
    }

    if (!runs || runs.length === 0) {
      return successResponse({ message: "No queued runs to retry", retriedCount: 0 });
    }

    console.log(`[Retry] Found ${runs.length} queued runs to retry`);

    const results = [];
    for (const run of runs) {
      try {
        console.log(`[Retry] Enqueueing run ${run.id} (${run.volume})...`);
        await enqueueIngestRun(run.id);
        results.push({ id: run.id, volume: run.volume, success: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to enqueue";
        console.error(`[Retry] Failed to enqueue run ${run.id}:`, e);
        results.push({ id: run.id, volume: run.volume, success: false, error: msg });
        
        // Mark as failed in DB
        await (supabase as any)
          .from("ncc_ingest_run")
          .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
          .eq("id", run.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return successResponse({
      message: `Retried ${runs.length} runs: ${successCount} succeeded, ${failCount} failed`,
      retriedCount: runs.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error("Retry ingest error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to retry ingest",
      500
    );
  }
}

