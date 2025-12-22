import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// Job type for NCC ingestion jobs
interface NCCJob {
  id: string;
  status: string;
  logs: string;
  files_total: number;
  files_processed: number;
  progress: number;
}

// File progress type
interface FileProgress {
  id: string;
  file_path: string;
  file_status: string;
}

// Maximum files to process per invocation (to stay within Vercel timeout)
const FILES_PER_CHUNK = 5;
// Maximum time to run before returning (in ms) - leave buffer for response
const MAX_RUN_TIME_MS = 50000; // 50 seconds for Vercel Pro (60s limit)

interface ParsedNode {
  node_type: string;
  official_ref: string | null;
  title: string | null;
  node_text: string | null;
  parent_id: string | null;
  sort_order: number;
  path: string;
  depth: number;
  hash: string;
  meta: Record<string, unknown>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { userId } = await requireAdmin();
    const { id: editionId } = await params;
    const supabase = await createClient();

    // Get or create parse job
    let { data: job } = await (supabase as AnySupabase)
      .from("ncc_ingestion_jobs")
      .select("*")
      .eq("edition_id", editionId)
      .eq("job_type", "PARSE")
      .in("status", ["queued", "running", "partial"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single() as { data: NCCJob | null };

    if (!job) {
      // Create new parse job
      const { data: newJob, error: createError } = await (supabase as AnySupabase)
        .from("ncc_ingestion_jobs")
        .insert({
          edition_id: editionId,
          job_type: "PARSE",
          status: "running",
          started_at: new Date().toISOString(),
          logs: `Parse job started at ${new Date().toISOString()}\n`,
          created_by: userId,
        })
        .select()
        .single() as { data: NCCJob | null; error: any };

      if (createError || !newJob) {
        return errorResponse("Failed to create parse job", 500);
      }
      job = newJob;
    } else if (job.status === "queued") {
      // Update to running
      await (supabase as AnySupabase)
        .from("ncc_ingestion_jobs")
        .update({ 
          status: "running", 
          started_at: new Date().toISOString(),
          logs: job.logs + `Parse job resumed at ${new Date().toISOString()}\n`
        })
        .eq("id", job.id);
    }

    // Get edition to check for source file
    const { data: edition } = await supabase
      .from("ncc_editions")
      .select("source_r2_key, status")
      .eq("id", editionId)
      .single();

    // For MVP/development: use sample data if no R2 file
    // In production, you would fetch from R2 and extract
    const xmlFiles = await getSampleXmlFiles();

    // Initialize or get parse progress
    const { data: existingProgress } = await supabase
      .from("ncc_parse_progress")
      .select("*")
      .eq("job_id", job.id);

    if (!existingProgress || existingProgress.length === 0) {
      // Initialize progress tracking for all files
      const progressRecords = xmlFiles.map((file) => ({
        job_id: job.id,
        edition_id: editionId,
        file_path: file.name,
        file_status: "pending",
      }));

      await supabase
        .from("ncc_parse_progress")
        .insert(progressRecords as any);

      await (supabase as AnySupabase)
        .from("ncc_ingestion_jobs")
        .update({ 
          files_total: xmlFiles.length,
          logs: job.logs + `Found ${xmlFiles.length} XML files to process\n`
        })
        .eq("id", job.id);
    }

    // Get pending files
    const { data: pendingFiles } = await (supabase as AnySupabase)
      .from("ncc_parse_progress")
      .select("*")
      .eq("job_id", job.id)
      .eq("file_status", "pending")
      .order("created_at", { ascending: true })
      .limit(FILES_PER_CHUNK) as { data: FileProgress[] | null };

    if (!pendingFiles || pendingFiles.length === 0) {
      // All files processed - finalize
      await finalizeJob(supabase, job.id, editionId);
      return successResponse({
        status: "completed",
        message: "Parse complete",
        filesProcessed: job.files_total,
        filesTotal: job.files_total,
      });
    }

    // Process each pending file
    let filesProcessed = 0;
    let totalNodesCreated = 0;

    for (const fileProgress of pendingFiles) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_RUN_TIME_MS) {
        break;
      }

      // Mark as processing
      await (supabase as AnySupabase)
        .from("ncc_parse_progress")
        .update({ file_status: "processing" })
        .eq("id", fileProgress.id);

      await (supabase as AnySupabase)
        .from("ncc_ingestion_jobs")
        .update({ current_file: fileProgress.file_path })
        .eq("id", job.id);

      try {
        // Find the file content
        const xmlFile = xmlFiles.find((f) => f.name === fileProgress.file_path);
        if (!xmlFile) {
          throw new Error(`File not found: ${fileProgress.file_path}`);
        }

        // Parse the XML
        const nodesCreated = await parseXmlFile(
          supabase,
          editionId,
          xmlFile.name,
          xmlFile.content
        );

        // Mark as completed
        await (supabase as AnySupabase)
          .from("ncc_parse_progress")
          .update({ 
            file_status: "completed",
            nodes_created: nodesCreated,
            processed_at: new Date().toISOString(),
          })
          .eq("id", fileProgress.id);

        filesProcessed++;
        totalNodesCreated += nodesCreated;
      } catch (error) {
        // Mark as error
        await (supabase as AnySupabase)
          .from("ncc_parse_progress")
          .update({ 
            file_status: "error",
            error_message: error instanceof Error ? error.message : "Unknown error",
            processed_at: new Date().toISOString(),
          })
          .eq("id", fileProgress.id);

        console.error(`Error parsing ${fileProgress.file_path}:`, error);
      }
    }

    // Update job progress
    const { data: completedCount } = await supabase
      .from("ncc_parse_progress")
      .select("id", { count: "exact" })
      .eq("job_id", job.id)
      .eq("file_status", "completed");

    const processedSoFar = completedCount?.length || 0;
    const progress = Math.round((processedSoFar / job.files_total) * 100);

    await (supabase as AnySupabase)
      .from("ncc_ingestion_jobs")
      .update({
        files_processed: processedSoFar,
        progress,
        status: processedSoFar < job.files_total ? "partial" : "success",
        logs: job.logs + `Processed ${filesProcessed} files this chunk. Total: ${processedSoFar}/${job.files_total}\n`,
      })
      .eq("id", job.id);

    // Check if there are more files to process
    const { data: remainingFiles } = await supabase
      .from("ncc_parse_progress")
      .select("id")
      .eq("job_id", job.id)
      .eq("file_status", "pending")
      .limit(1);

    const isComplete = !remainingFiles || remainingFiles.length === 0;

    if (isComplete) {
      await finalizeJob(supabase, job.id, editionId);
    }

    return successResponse({
      status: isComplete ? "completed" : "partial",
      message: isComplete ? "Parse complete" : "Continue parsing...",
      filesProcessed: processedSoFar,
      filesTotal: job.files_total,
      nodesCreatedThisChunk: totalNodesCreated,
      continueUrl: isComplete ? null : `/api/admin/ncc/${editionId}/parse`,
    });
  } catch (error) {
    console.error("Parse error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to parse",
      500
    );
  }
}

async function finalizeJob(supabase: any, jobId: string, editionId: string) {
  // Update job status
  await supabase
    .from("ncc_ingestion_jobs")
    .update({
      status: "success",
      finished_at: new Date().toISOString(),
      current_file: null,
      progress: 100,
    })
    .eq("id", jobId);

  // Update edition status
  await supabase
    .from("ncc_editions")
    .update({ 
      status: "parsed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", editionId);

  // Update node count
  const { count: nodeCount } = await supabase
    .from("ncc_nodes")
    .select("id", { count: "exact" })
    .eq("edition_id", editionId);

  await supabase
    .from("ncc_editions")
    .update({ node_count: nodeCount || 0 })
    .eq("id", editionId);
}

async function parseXmlFile(
  supabase: any,
  editionId: string,
  fileName: string,
  xmlContent: string
): Promise<number> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  const parsed = parser.parse(xmlContent);
  const nodes: ParsedNode[] = [];

  // Process the parsed XML structure
  // This is a simplified parser - in production you'd need to handle
  // the actual NCC XML structure
  processNode(parsed, nodes, null, 0, "");

  // Insert nodes into database
  if (nodes.length > 0) {
    const insertData = nodes.map((node, index) => ({
      edition_id: editionId,
      node_type: node.node_type,
      official_ref: node.official_ref,
      title: node.title,
      node_text: node.node_text,
      parent_id: node.parent_id,
      sort_order: index,
      path: node.path,
      depth: node.depth,
      hash: node.hash,
      meta: node.meta,
    }));

    await supabase
      .from("ncc_nodes")
      .insert(insertData as any);
  }

  return nodes.length;
}

function processNode(
  obj: any,
  nodes: ParsedNode[],
  parentPath: string | null,
  depth: number,
  parentId: string | null
): void {
  if (!obj || typeof obj !== "object") return;

  // Determine node type based on element name or attributes
  const nodeType = detectNodeType(obj);
  
  if (nodeType) {
    const ref = extractOfficialRef(obj);
    const title = extractTitle(obj);
    const text = extractText(obj);
    const path = parentPath ? `${parentPath}/${ref || nodeType}` : `/${ref || nodeType}`;
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(obj))
      .digest("hex");

    nodes.push({
      node_type: nodeType,
      official_ref: ref,
      title: title,
      node_text: text,
      parent_id: parentId,
      sort_order: nodes.length,
      path: path,
      depth: depth,
      hash: hash,
      meta: extractMeta(obj),
    });
  }

  // Recursively process children
  for (const key of Object.keys(obj)) {
    if (key.startsWith("@_") || key === "#text") continue;
    
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        processNode(item, nodes, parentPath, depth + 1, parentId);
      }
    } else if (typeof value === "object") {
      processNode(value, nodes, parentPath, depth + 1, parentId);
    }
  }
}

function detectNodeType(obj: any): string | null {
  // Map XML element names to node types
  const typeMap: Record<string, string> = {
    Volume: "Volume",
    Section: "Section",
    Part: "Part",
    Division: "Part",
    Clause: "Clause",
    Subclause: "Subclause",
    Definition: "Definition",
    Appendix: "Appendix",
    Figure: "Figure",
    Table: "Table",
    Note: "Note",
    Specification: "Specification",
  };

  // Check for specific type indicators in attributes
  if (obj["@_type"]) {
    return typeMap[obj["@_type"]] || obj["@_type"];
  }

  // Check for heading indicators
  if (obj["@_class"]?.includes("clause")) {
    return "Clause";
  }

  return null;
}

function extractOfficialRef(obj: any): string | null {
  return obj["@_id"] || obj["@_ref"] || obj["@_number"] || null;
}

function extractTitle(obj: any): string | null {
  if (obj.Title) return typeof obj.Title === "string" ? obj.Title : obj.Title["#text"];
  if (obj.Heading) return typeof obj.Heading === "string" ? obj.Heading : obj.Heading["#text"];
  if (obj["@_title"]) return obj["@_title"];
  return null;
}

function extractText(obj: any): string | null {
  if (obj["#text"]) return obj["#text"];
  if (typeof obj === "string") return obj;
  
  // Collect all text content
  let text = "";
  for (const key of Object.keys(obj)) {
    if (key === "#text") {
      text += obj[key] + " ";
    } else if (typeof obj[key] === "string" && !key.startsWith("@_")) {
      text += obj[key] + " ";
    }
  }
  return text.trim() || null;
}

function extractMeta(obj: any): Record<string, unknown> {
  const meta: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("@_")) {
      meta[key.slice(2)] = obj[key];
    }
  }
  return meta;
}

// Sample XML files for development/testing
async function getSampleXmlFiles(): Promise<{ name: string; content: string }[]> {
  return [
    {
      name: "volume1_housing.xml",
      content: `<?xml version="1.0"?>
<Volume id="Volume-Two">
  <Title>Volume Two - Housing Provisions</Title>
  <Section id="H" type="Section">
    <Title>Section H - Class 1 and 10 buildings</Title>
    <Part id="H1" type="Part">
      <Title>Part H1 - Structure</Title>
      <Division id="H1D1" type="Clause">
        <Title>H1D1 Structural provisions</Title>
        <Subclause id="H1D1-1">
          <Text>A Class 1 or 10 building must be designed and constructed to...</Text>
        </Subclause>
      </Division>
    </Part>
    <Part id="H2" type="Part">
      <Title>Part H2 - Damp and weatherproofing</Title>
      <Division id="H2D1" type="Clause">
        <Title>H2D1 Application of Part</Title>
        <Text>This Part applies to building elements that are...</Text>
      </Division>
      <Division id="H2D2" type="Clause">
        <Title>H2D2 Weatherproofing</Title>
        <Text>A building must prevent the penetration of water that could cause...</Text>
      </Division>
    </Part>
  </Section>
</Volume>`,
    },
    {
      name: "volume1_fire.xml",
      content: `<?xml version="1.0"?>
<Volume id="Volume-Two">
  <Section id="H" type="Section">
    <Part id="H3" type="Part">
      <Title>Part H3 - Fire safety</Title>
      <Division id="H3D1" type="Clause">
        <Title>H3D1 Spread of fire</Title>
        <Text>A Class 1 building that is within 900 mm of a side or rear boundary...</Text>
      </Division>
      <Division id="H3D2" type="Clause">
        <Title>H3D2 Smoke alarms</Title>
        <Text>A Class 1a building must have smoke alarms installed...</Text>
      </Division>
    </Part>
  </Section>
</Volume>`,
    },
    {
      name: "definitions.xml",
      content: `<?xml version="1.0"?>
<Definitions>
  <Definition id="def-allotment" term="Allotment">
    <Text>Allotment means a parcel of land identified in a current plan...</Text>
  </Definition>
  <Definition id="def-building" term="Building">
    <Text>Building has the same meaning as in the building Acts and Regulations...</Text>
  </Definition>
  <Definition id="def-fire-resistance" term="Fire-resistance level">
    <Text>Fire-resistance level (FRL) means the grading periods in minutes...</Text>
  </Definition>
</Definitions>`,
    },
  ];
}

