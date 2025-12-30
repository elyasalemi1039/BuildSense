import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("ncc_ingest_run")
      .select("*")
      .eq("edition", editionId)
      .order("created_at", { ascending: false });

    if (error) return errorResponse(error.message, 500);

    return successResponse({ runs: data || [] });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Failed to list ingest runs", 500);
  }
}


