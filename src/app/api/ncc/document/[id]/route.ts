import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get document with related xml_object
    const { data: document, error: docError } = await (supabase as AnySupabase)
      .from("ncc_document")
      .select(`
        id,
        doc_type,
        sptc,
        title,
        archive_num,
        jurisdiction,
        created_at,
        ingest_run_id,
        xml_object_id,
        ncc_xml_object (
          id,
          xml_basename,
          root_tag,
          outputclass,
          raw_xml
        )
      `)
      .eq("id", id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Get ingest run details to find edition
    const { data: ingestRun, error: runError } = await (supabase as AnySupabase)
      .from("ncc_ingest_run")
      .select("id, edition, volume")
      .eq("id", document.ingest_run_id)
      .single();

    // Get edition name
    let editionName = "";
    if (ingestRun?.edition) {
      const { data: edition } = await (supabase as AnySupabase)
        .from("ncc_editions")
        .select("name")
        .eq("id", ingestRun.edition)
        .single();
      editionName = edition?.name || ingestRun.edition;
    }

    // Get images associated with this document via asset_placement
    const { data: placements } = await (supabase as AnySupabase)
      .from("ncc_asset_placement")
      .select(`
        id,
        caption,
        ncc_asset (
          id,
          filename,
          r2_key,
          width,
          height
        )
      `)
      .eq("document_id", id);

    // Also get all assets from the same ingest run (for related images)
    const { data: runAssets } = await (supabase as AnySupabase)
      .from("ncc_asset")
      .select("id, filename, r2_key, width, height")
      .eq("ingest_run_id", document.ingest_run_id)
      .limit(20);

    // Format images
    const directImages = (placements || [])
      .filter((p: any) => p.ncc_asset)
      .map((p: any) => ({
        id: p.ncc_asset.id,
        filename: p.ncc_asset.filename,
        caption: p.caption,
        url: `/api/ncc/image/${p.ncc_asset.r2_key.replace(/^ncc\//, "")}`,
        width: p.ncc_asset.width,
        height: p.ncc_asset.height,
      }));

    const relatedImages = (runAssets || []).map((a: any) => ({
      id: a.id,
      filename: a.filename,
      url: `/api/ncc/image/${a.r2_key.replace(/^ncc\//, "")}`,
      width: a.width,
      height: a.height,
    }));

    // Get related documents (same ingest run, similar doc_type or linked via references)
    const { data: relatedDocs } = await (supabase as AnySupabase)
      .from("ncc_document")
      .select("id, sptc, title, doc_type")
      .eq("ingest_run_id", document.ingest_run_id)
      .neq("id", id)
      .limit(10);

    // Parse the raw XML into a more readable format
    let parsedContent: any[] = [];
    if (document.ncc_xml_object?.raw_xml) {
      parsedContent = parseXmlToBlocks(document.ncc_xml_object.raw_xml);
    }

    return NextResponse.json({
      document: {
        id: document.id,
        doc_type: document.doc_type,
        sptc: document.sptc,
        title: document.title,
        archive_num: document.archive_num,
        jurisdiction: document.jurisdiction,
        created_at: document.created_at,
        xml_basename: document.ncc_xml_object?.xml_basename,
        root_tag: document.ncc_xml_object?.root_tag,
        raw_xml: document.ncc_xml_object?.raw_xml,
      },
      edition: {
        id: ingestRun?.edition,
        name: editionName,
        volume: ingestRun?.volume,
      },
      content: parsedContent,
      images: {
        direct: directImages,
        related: relatedImages,
      },
      relatedDocuments: relatedDocs || [],
    });
  } catch (error) {
    console.error("Document API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

// Simple XML to blocks parser
function parseXmlToBlocks(xml: string): any[] {
  const blocks: any[] = [];
  
  // Extract title
  const titleMatch = xml.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    blocks.push({
      type: "heading",
      level: 1,
      text: titleMatch[1].trim(),
    });
  }

  // Extract shortdesc
  const shortdescMatch = xml.match(/<shortdesc[^>]*>([\s\S]*?)<\/shortdesc>/i);
  if (shortdescMatch) {
    blocks.push({
      type: "summary",
      text: stripTags(shortdescMatch[1]).trim(),
    });
  }

  // Extract paragraphs
  const paragraphs = xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const match of paragraphs) {
    const text = stripTags(match[1]).trim();
    if (text) {
      blocks.push({
        type: "paragraph",
        text,
        html: match[1].trim(),
      });
    }
  }

  // Extract list items
  const listItems = xml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  const liTexts: string[] = [];
  for (const match of listItems) {
    const text = stripTags(match[1]).trim();
    if (text) {
      liTexts.push(text);
    }
  }
  if (liTexts.length > 0) {
    blocks.push({
      type: "list",
      items: liTexts,
    });
  }

  // Extract notes
  const notes = xml.matchAll(/<note[^>]*>([\s\S]*?)<\/note>/gi);
  for (const match of notes) {
    const text = stripTags(match[1]).trim();
    if (text) {
      blocks.push({
        type: "note",
        text,
      });
    }
  }

  // Extract tables (simplified)
  const tables = xml.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  for (const match of tables) {
    const rows = match[1].matchAll(/<row[^>]*>([\s\S]*?)<\/row>/gi);
    const tableRows: string[][] = [];
    for (const row of rows) {
      const entries = row[1].matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi);
      const cells: string[] = [];
      for (const entry of entries) {
        cells.push(stripTags(entry[1]).trim());
      }
      if (cells.length > 0) {
        tableRows.push(cells);
      }
    }
    if (tableRows.length > 0) {
      blocks.push({
        type: "table",
        rows: tableRows,
      });
    }
  }

  // Extract image references
  const imageRefs = xml.matchAll(/<image-reference[^>]*(?:conref|href)="([^"]+)"[^>]*\/>/gi);
  for (const match of imageRefs) {
    blocks.push({
      type: "image_reference",
      ref: match[1],
    });
  }

  return blocks;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

