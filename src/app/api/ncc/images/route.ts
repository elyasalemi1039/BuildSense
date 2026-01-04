import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const editionId = searchParams.get("edition");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!editionId) {
      return NextResponse.json({ images: [], error: "Edition ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get ingest runs for this edition
    const { data: ingestRuns, error: runsError } = await (supabase as AnySupabase)
      .from("ncc_ingest_run")
      .select("id")
      .eq("edition", editionId)
      .eq("status", "done");

    if (runsError || !ingestRuns?.length) {
      return NextResponse.json({ images: [] });
    }

    const runIds = ingestRuns.map((r: { id: string }) => r.id);

    // Get assets for these runs
    const { data: assets, error: assetsError } = await (supabase as AnySupabase)
      .from("ncc_asset")
      .select("id, filename, r2_key, asset_type")
      .in("ingest_run_id", runIds)
      .eq("asset_type", "image")
      .limit(limit);

    if (assetsError) {
      console.error("Failed to fetch assets:", assetsError);
      return NextResponse.json({ images: [], error: assetsError.message }, { status: 500 });
    }

    // Map to image URLs
    const images = (assets || []).map((asset: { id: string; filename: string; r2_key: string }) => ({
      id: asset.id,
      filename: asset.filename,
      url: `/api/ncc/image/${asset.r2_key}`,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Images API error:", error);
    return NextResponse.json(
      { images: [], error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

