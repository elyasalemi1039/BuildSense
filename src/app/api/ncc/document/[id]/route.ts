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
    const { data: ingestRun } = await (supabase as AnySupabase)
      .from("ncc_ingest_run")
      .select("id, edition, volume")
      .eq("id", document.ingest_run_id)
      .single();

    // Get edition name and details
    let editionData: any = null;
    if (ingestRun?.edition) {
      const { data: edition } = await (supabase as AnySupabase)
        .from("ncc_editions")
        .select("id, name, effective_date, jurisdiction")
        .eq("id", ingestRun.edition)
        .single();
      editionData = edition;
    }

    // Get all assets from this ingest run
    const { data: allAssets } = await (supabase as AnySupabase)
      .from("ncc_asset")
      .select("id, filename, r2_key, width, height")
      .eq("ingest_run_id", document.ingest_run_id);

    // Build a map of assets by filename for matching
    const assetMap = new Map<string, any>();
    for (const asset of allAssets || []) {
      // Index by full filename and normalized versions
      assetMap.set(asset.filename.toLowerCase(), asset);
      // Also index without extension for fuzzy matching
      const nameWithoutExt = asset.filename.replace(/\.[^.]+$/, "").toLowerCase();
      if (!assetMap.has(nameWithoutExt)) {
        assetMap.set(nameWithoutExt, asset);
      }
    }

    // Parse the raw XML thoroughly
    const rawXml = document.ncc_xml_object?.raw_xml || "";
    const parsedData = parseXmlComprehensively(rawXml, assetMap);

    // Get related documents (same volume, nearby sptc codes)
    const { data: relatedDocs } = await (supabase as AnySupabase)
      .from("ncc_document")
      .select("id, sptc, title, doc_type, jurisdiction")
      .eq("ingest_run_id", document.ingest_run_id)
      .neq("id", id)
      .limit(12);

    // Sort related docs by SPTC similarity
    const sortedRelated = sortBySptcProximity(
      relatedDocs || [],
      document.sptc
    );

    return NextResponse.json({
      document: {
        id: document.id,
        doc_type: document.doc_type,
        sptc: document.sptc,
        title: document.title || parsedData.title,
        archive_num: document.archive_num,
        jurisdiction: document.jurisdiction,
        created_at: document.created_at,
        xml_basename: document.ncc_xml_object?.xml_basename,
        root_tag: document.ncc_xml_object?.root_tag,
        outputclass: document.ncc_xml_object?.outputclass,
      },
      edition: editionData ? {
        id: editionData.id,
        name: editionData.name,
        effective_date: editionData.effective_date,
        jurisdiction: editionData.jurisdiction,
        volume: ingestRun?.volume,
      } : null,
      parsed: parsedData,
      raw_xml: rawXml,
      relatedDocuments: sortedRelated.slice(0, 8),
    });
  } catch (error) {
    console.error("Document API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

interface ParsedBlock {
  type: string;
  text?: string;
  html?: string;
  level?: number;
  items?: ParsedBlock[];
  rows?: string[][];
  headers?: string[];
  image?: {
    id?: string;
    filename: string;
    url?: string;
    caption?: string;
    width?: number;
    height?: number;
  };
  noteType?: string;
  children?: ParsedBlock[];
}

interface ParsedData {
  title: string;
  shortDescription: string;
  objectives: string[];
  functionalStatements: string[];
  performanceRequirements: string[];
  sections: ParsedSection[];
  images: any[];
  notes: ParsedBlock[];
  tables: ParsedBlock[];
  references: string[];
  metadata: Record<string, string>;
}

interface ParsedSection {
  id: string;
  title: string;
  level: number;
  content: ParsedBlock[];
}

function parseXmlComprehensively(xml: string, assetMap: Map<string, any>): ParsedData {
  const result: ParsedData = {
    title: "",
    shortDescription: "",
    objectives: [],
    functionalStatements: [],
    performanceRequirements: [],
    sections: [],
    images: [],
    notes: [],
    tables: [],
    references: [],
    metadata: {},
  };

  if (!xml) return result;

  // Extract title
  const titleMatch = xml.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    result.title = decodeEntities(titleMatch[1].trim());
  }

  // Extract short description
  const shortdescMatch = xml.match(/<shortdesc[^>]*>([\s\S]*?)<\/shortdesc>/i);
  if (shortdescMatch) {
    result.shortDescription = stripTags(shortdescMatch[1]).trim();
  }

  // Extract prolog metadata
  const prologMatch = xml.match(/<prolog[^>]*>([\s\S]*?)<\/prolog>/i);
  if (prologMatch) {
    const prolog = prologMatch[1];
    
    // Extract metadata entries
    const metaMatches = prolog.matchAll(/<othermeta\s+name="([^"]+)"\s+content="([^"]+)"[^>]*\/>/gi);
    for (const m of metaMatches) {
      result.metadata[m[1]] = m[2];
    }
  }

  // Extract objectives (common in NCC)
  const objectiveMatches = xml.matchAll(/<objective[^>]*>([\s\S]*?)<\/objective>/gi);
  for (const m of objectiveMatches) {
    const text = stripTags(m[1]).trim();
    if (text) result.objectives.push(text);
  }

  // Extract functional statements
  const fsMatches = xml.matchAll(/<functional-statement[^>]*>([\s\S]*?)<\/functional-statement>/gi);
  for (const m of fsMatches) {
    const text = stripTags(m[1]).trim();
    if (text) result.functionalStatements.push(text);
  }

  // Extract performance requirements
  const prMatches = xml.matchAll(/<performance-requirement[^>]*>([\s\S]*?)<\/performance-requirement>/gi);
  for (const m of prMatches) {
    const text = stripTags(m[1]).trim();
    if (text) result.performanceRequirements.push(text);
  }

  // Extract sections (body content organized by section)
  const bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    const body = bodyMatch[1];
    result.sections = parseSections(body, assetMap);
  }

  // Also parse conbody for concept documents
  const conbodyMatch = xml.match(/<conbody[^>]*>([\s\S]*?)<\/conbody>/i);
  if (conbodyMatch && result.sections.length === 0) {
    result.sections = parseSections(conbodyMatch[1], assetMap);
  }

  // Extract all images with their references
  const imageRefs = xml.matchAll(/<image-reference[^>]*(?:conref|href)="([^"]+)"[^>]*(?:\/>|>[\s\S]*?<\/image-reference>)/gi);
  for (const m of imageRefs) {
    const ref = m[1];
    const filename = extractFilenameFromRef(ref);
    const asset = findMatchingAsset(filename, assetMap);
    
    result.images.push({
      ref,
      filename,
      id: asset?.id,
      url: asset ? `/api/ncc/image/${asset.r2_key.replace(/^ncc\//, "")}` : null,
      width: asset?.width,
      height: asset?.height,
    });
  }

  // Also look for figure elements
  const figureMatches = xml.matchAll(/<fig[^>]*>([\s\S]*?)<\/fig>/gi);
  for (const m of figureMatches) {
    const figContent = m[1];
    const titleMatch = figContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const imageMatch = figContent.match(/(?:conref|href)="([^"]+)"/i);
    
    if (imageMatch) {
      const ref = imageMatch[1];
      const filename = extractFilenameFromRef(ref);
      const asset = findMatchingAsset(filename, assetMap);
      
      result.images.push({
        ref,
        filename,
        caption: titleMatch ? decodeEntities(titleMatch[1]) : undefined,
        id: asset?.id,
        url: asset ? `/api/ncc/image/${asset.r2_key.replace(/^ncc\//, "")}` : null,
        width: asset?.width,
        height: asset?.height,
      });
    }
  }

  // Extract all notes
  const noteMatches = xml.matchAll(/<note[^>]*(?:type="([^"]*)")?[^>]*>([\s\S]*?)<\/note>/gi);
  for (const m of noteMatches) {
    result.notes.push({
      type: "note",
      noteType: m[1] || "note",
      text: stripTags(m[2]).trim(),
    });
  }

  // Extract cross-references
  const xrefMatches = xml.matchAll(/<xref[^>]*href="([^"]+)"[^>]*>([^<]*)<\/xref>/gi);
  for (const m of xrefMatches) {
    result.references.push(m[1]);
  }

  // Extract conref references
  const conrefMatches = xml.matchAll(/conref="([^"]+)"/gi);
  for (const m of conrefMatches) {
    if (!result.references.includes(m[1])) {
      result.references.push(m[1]);
    }
  }

  // Extract tables
  const tableMatches = xml.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi);
  for (const tableContent of tableMatches) {
    const table = parseTable(tableContent[1]);
    if (table) {
      result.tables.push(table);
    }
  }

  return result;
}

function parseSections(body: string, assetMap: Map<string, any>): ParsedSection[] {
  const sections: ParsedSection[] = [];
  
  // Look for section elements
  const sectionMatches = body.matchAll(/<section[^>]*(?:id="([^"]*)")?[^>]*>([\s\S]*?)<\/section>/gi);
  
  for (const m of sectionMatches) {
    const sectionId = m[1] || `section-${sections.length}`;
    const sectionContent = m[2];
    
    // Get section title
    const titleMatch = sectionContent.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    
    // Parse content blocks within section
    const content = parseContentBlocks(sectionContent, assetMap);
    
    sections.push({
      id: sectionId,
      title,
      level: 2,
      content,
    });
  }
  
  // If no sections found, parse the body directly
  if (sections.length === 0) {
    const content = parseContentBlocks(body, assetMap);
    if (content.length > 0) {
      sections.push({
        id: "main",
        title: "",
        level: 1,
        content,
      });
    }
  }
  
  return sections;
}

function parseContentBlocks(html: string, assetMap: Map<string, any>): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  
  // Extract paragraphs
  const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  for (const m of pMatches) {
    const text = stripTags(m[1]).trim();
    if (text && text.length > 0) {
      blocks.push({
        type: "paragraph",
        text,
        html: m[1].trim(),
      });
    }
  }
  
  // Extract ordered lists
  const olMatches = html.matchAll(/<ol[^>]*>([\s\S]*?)<\/ol>/gi);
  for (const m of olMatches) {
    const items = parseListItems(m[1]);
    if (items.length > 0) {
      blocks.push({
        type: "ordered-list",
        items,
      });
    }
  }
  
  // Extract unordered lists
  const ulMatches = html.matchAll(/<ul[^>]*>([\s\S]*?)<\/ul>/gi);
  for (const m of ulMatches) {
    const items = parseListItems(m[1]);
    if (items.length > 0) {
      blocks.push({
        type: "unordered-list",
        items,
      });
    }
  }
  
  // Extract definition lists
  const dlMatches = html.matchAll(/<dl[^>]*>([\s\S]*?)<\/dl>/gi);
  for (const m of dlMatches) {
    const items = parseDefinitionList(m[1]);
    if (items.length > 0) {
      blocks.push({
        type: "definition-list",
        items,
      });
    }
  }
  
  return blocks;
}

function parseListItems(listHtml: string): ParsedBlock[] {
  const items: ParsedBlock[] = [];
  const liMatches = listHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  
  for (const m of liMatches) {
    const text = stripTags(m[1]).trim();
    if (text) {
      items.push({
        type: "list-item",
        text,
        html: m[1].trim(),
      });
    }
  }
  
  return items;
}

function parseDefinitionList(dlHtml: string): ParsedBlock[] {
  const items: ParsedBlock[] = [];
  const dtMatches = dlHtml.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi);
  
  for (const m of dtMatches) {
    items.push({
      type: "definition",
      text: stripTags(m[1]).trim(),
      html: stripTags(m[2]).trim(),
    });
  }
  
  return items;
}

function parseTable(tableHtml: string): ParsedBlock | null {
  const rows: string[][] = [];
  const headers: string[] = [];
  
  // Extract header row
  const theadMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const headerCells = theadMatch[1].matchAll(/<(?:th|entry)[^>]*>([\s\S]*?)<\/(?:th|entry)>/gi);
    for (const cell of headerCells) {
      headers.push(stripTags(cell[1]).trim());
    }
  }
  
  // Extract body rows
  const tbodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const bodyContent = tbodyMatch ? tbodyMatch[1] : tableHtml;
  
  const rowMatches = bodyContent.matchAll(/<(?:tr|row)[^>]*>([\s\S]*?)<\/(?:tr|row)>/gi);
  for (const rowMatch of rowMatches) {
    const cellMatches = rowMatch[1].matchAll(/<(?:td|entry)[^>]*>([\s\S]*?)<\/(?:td|entry)>/gi);
    const row: string[] = [];
    for (const cell of cellMatches) {
      row.push(stripTags(cell[1]).trim());
    }
    if (row.length > 0) {
      // If no headers yet, treat first row as headers
      if (headers.length === 0 && rows.length === 0) {
        headers.push(...row);
      } else {
        rows.push(row);
      }
    }
  }
  
  if (rows.length === 0 && headers.length === 0) return null;
  
  return {
    type: "table",
    headers,
    rows,
  };
}

function extractFilenameFromRef(ref: string): string {
  // Handle various reference formats
  // e.g., "/tmp/QppServer/.../532_0.7.0.xml" -> "532_0.7.0.xml"
  // e.g., "../images/figure-1.jpg" -> "figure-1.jpg"
  const parts = ref.split("/");
  return parts[parts.length - 1] || ref;
}

function findMatchingAsset(filename: string, assetMap: Map<string, any>): any | null {
  if (!filename) return null;
  
  const lower = filename.toLowerCase();
  
  // Direct match
  if (assetMap.has(lower)) {
    return assetMap.get(lower);
  }
  
  // Try without extension
  const withoutExt = lower.replace(/\.[^.]+$/, "");
  if (assetMap.has(withoutExt)) {
    return assetMap.get(withoutExt);
  }
  
  // Fuzzy match - look for similar filenames
  for (const [key, asset] of assetMap.entries()) {
    if (key.includes(withoutExt) || withoutExt.includes(key.replace(/\.[^.]+$/, ""))) {
      return asset;
    }
  }
  
  return null;
}

function sortBySptcProximity(docs: any[], targetSptc: string | null): any[] {
  if (!targetSptc) return docs;
  
  const targetParts = targetSptc.split(/[.-]/);
  
  return docs.sort((a, b) => {
    if (!a.sptc && !b.sptc) return 0;
    if (!a.sptc) return 1;
    if (!b.sptc) return -1;
    
    const aParts = a.sptc.split(/[.-]/);
    const bParts = b.sptc.split(/[.-]/);
    
    // Count matching prefix parts
    let aMatches = 0;
    let bMatches = 0;
    
    for (let i = 0; i < Math.min(targetParts.length, aParts.length); i++) {
      if (targetParts[i] === aParts[i]) aMatches++;
      else break;
    }
    
    for (let i = 0; i < Math.min(targetParts.length, bParts.length); i++) {
      if (targetParts[i] === bParts[i]) bMatches++;
      else break;
    }
    
    return bMatches - aMatches; // More matches = higher priority
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
