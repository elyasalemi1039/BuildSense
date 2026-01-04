import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const editionId = searchParams.get("edition");
    const docType = searchParams.get("doc_type");

    const supabase = await createClient();

    // Get all published editions first
    const { data: rawEditions, error: editionsError } = await (supabase as AnySupabase)
      .from("ncc_editions")
      .select("id, name")
      .eq("status", "published");

    const publishedEditions = rawEditions as { id: string; name: string }[] | null;

    if (editionsError || !publishedEditions?.length) {
      return NextResponse.json({ results: [], message: "No published editions found" });
    }

    const publishedEditionIds = publishedEditions.map(e => e.id);
    const editionNameMap = new Map<string, string>(publishedEditions.map(e => [e.id, e.name]));

    // Filter by specific edition if provided
    const targetEditions = editionId && editionId !== "all" 
      ? [editionId].filter(id => publishedEditionIds.includes(id))
      : publishedEditionIds;

    if (targetEditions.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Get ingest runs for these editions
    const { data: ingestRuns, error: runsError } = await (supabase as AnySupabase)
      .from("ncc_ingest_run")
      .select("id, edition")
      .in("edition", targetEditions)
      .eq("status", "done");

    if (runsError || !ingestRuns?.length) {
      return NextResponse.json({ results: [], message: "No completed ingest runs" });
    }

    const ingestRunIds = ingestRuns.map((r: { id: string }) => r.id);
    const runEditionMap = new Map<string, string>(ingestRuns.map((r: { id: string; edition: string }) => [r.id, r.edition]));

    // Build the document query
    let docQuery = (supabase as AnySupabase)
      .from("ncc_document")
      .select("id, doc_type, sptc, title, jurisdiction, ingest_run_id")
      .in("ingest_run_id", ingestRunIds);

    // Apply doc_type filter
    if (docType && docType !== "all") {
      docQuery = docQuery.eq("doc_type", docType);
    }

    // Apply text search if query provided
    if (query) {
      // Search in title and sptc
      docQuery = docQuery.or(`title.ilike.%${query}%,sptc.ilike.%${query}%`);
    }

    // Limit results
    docQuery = docQuery.limit(100);

    const { data: documents, error: docsError } = await docQuery;

    if (docsError) {
      console.error("Document search error:", docsError);
      return NextResponse.json({ results: [], error: docsError.message }, { status: 500 });
    }

    // Map results with edition info
    const results = (documents || []).map((doc: {
      id: string;
      doc_type: string;
      sptc: string | null;
      title: string | null;
      jurisdiction: string | null;
      ingest_run_id: string;
    }) => {
      const editionId = runEditionMap.get(doc.ingest_run_id) || "";
      return {
        id: doc.id,
        doc_type: doc.doc_type,
        sptc: doc.sptc,
        title: doc.title,
        jurisdiction: doc.jurisdiction,
        edition_id: editionId,
        edition_name: editionNameMap.get(editionId) || "Unknown Edition",
      };
    });

    // Sort results: prioritize exact SPTC matches, then title matches
    if (query) {
      results.sort((a: { sptc: string | null; title: string | null }, b: { sptc: string | null; title: string | null }) => {
        const aExactSptc = a.sptc?.toLowerCase() === query.toLowerCase();
        const bExactSptc = b.sptc?.toLowerCase() === query.toLowerCase();
        if (aExactSptc && !bExactSptc) return -1;
        if (!aExactSptc && bExactSptc) return 1;
        
        const aStartsSptc = a.sptc?.toLowerCase().startsWith(query.toLowerCase());
        const bStartsSptc = b.sptc?.toLowerCase().startsWith(query.toLowerCase());
        if (aStartsSptc && !bStartsSptc) return -1;
        if (!aStartsSptc && bStartsSptc) return 1;
        
        return 0;
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { results: [], error: "Search failed" },
      { status: 500 }
    );
  }
}

