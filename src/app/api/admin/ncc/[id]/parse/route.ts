import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, errorResponse, successResponse } from "@/lib/auth/admin";
import { r2Client, R2_BUCKET_NAME } from "@/lib/storage/r2";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
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

// XML file from ZIP
interface XmlFile {
  name: string;
  content: string;
  volume: string;
}

// Maximum files to process per invocation (to stay within Vercel timeout)
const FILES_PER_CHUNK = 50;
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
  volume: string;
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
      .single() as { data: { source_r2_key: string | null; status: string } | null };

    // Get XML files from uploaded ZIPs or use sample data for development
    let xmlFiles: XmlFile[] = [];
    let jobLogs = job.logs || "";
    
    jobLogs += `\nSource R2 key: ${edition?.source_r2_key || 'null'}\n`;
    jobLogs += `R2 client configured: ${!!r2Client}\n`;
    
    if (edition?.source_r2_key && r2Client) {
      // Parse the source_r2_key (could be JSON array or single string)
      let uploadedFiles: Array<{ key: string; volume: string }> = [];
      
      try {
        const parsed = JSON.parse(edition.source_r2_key);
        if (Array.isArray(parsed)) {
          uploadedFiles = parsed;
        } else {
          uploadedFiles = [parsed];
        }
        jobLogs += `Parsed ${uploadedFiles.length} uploaded ZIP files\n`;
      } catch (e) {
        // Legacy single file format
        uploadedFiles = [{ key: edition.source_r2_key, volume: "unknown" }];
        jobLogs += `Legacy format - single file: ${edition.source_r2_key}\n`;
      }

      // Fetch and extract each ZIP file
      for (const uploadedFile of uploadedFiles) {
        jobLogs += `\nProcessing ZIP: ${uploadedFile.key} (${uploadedFile.volume})\n`;
        
        try {
          const filesFromZip = await extractXmlFromR2Zip(uploadedFile.key, uploadedFile.volume);
          xmlFiles.push(...filesFromZip);
          jobLogs += `  ✓ Extracted ${filesFromZip.length} XML files\n`;
          
          // Log first few file names for debugging
          if (filesFromZip.length > 0) {
            const sampleNames = filesFromZip.slice(0, 3).map(f => f.name);
            jobLogs += `  Sample files: ${sampleNames.join(', ')}\n`;
          }
        } catch (error) {
          console.error(`Error extracting ${uploadedFile.key}:`, error);
          jobLogs += `  ✗ Error: ${error instanceof Error ? error.message : "Unknown error"}\n`;
        }
      }
      
      jobLogs += `\nTotal XML files found: ${xmlFiles.length}\n`;
    } else if (!r2Client) {
      // Use sample data for development
      xmlFiles = getSampleXmlFiles();
      jobLogs += `R2 not configured. Using ${xmlFiles.length} sample files.\n`;
    } else {
      jobLogs += `No source_r2_key found on edition.\n`;
    }
    
    // Update logs
    await (supabase as AnySupabase)
      .from("ncc_ingestion_jobs")
      .update({ logs: jobLogs })
      .eq("id", job.id);
    job.logs = jobLogs;

    if (xmlFiles.length === 0) {
      return errorResponse("No XML files found to parse", 400);
    }

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
      
      // Refresh job data
      job.files_total = xmlFiles.length;
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
          xmlFile.content,
          xmlFile.volume
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
    const filesTotal = job.files_total || xmlFiles.length;
    const progress = filesTotal > 0 ? Math.round((processedSoFar / filesTotal) * 100) : 0;

    await (supabase as AnySupabase)
      .from("ncc_ingestion_jobs")
      .update({
        files_processed: processedSoFar,
        progress,
        status: processedSoFar < filesTotal ? "partial" : "success",
        logs: job.logs + `Processed ${filesProcessed} files this chunk. Total: ${processedSoFar}/${filesTotal}. Nodes created: ${totalNodesCreated}\n`,
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
      filesTotal: filesTotal,
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

// Extract XML files from a ZIP in R2
async function extractXmlFromR2Zip(objectKey: string, volume: string): Promise<XmlFile[]> {
  if (!r2Client) {
    throw new Error("R2 client not configured");
  }

  console.log(`[ZIP Extract] Fetching from R2: ${objectKey}`);

  // Fetch the ZIP file from R2
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: objectKey,
  });

  const response = await r2Client.send(command);
  
  if (!response.Body) {
    throw new Error("Empty response from R2");
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  const buffer = Buffer.concat(chunks);
  console.log(`[ZIP Extract] Downloaded ${buffer.length} bytes`);

  // Extract ZIP contents
  const zip = await JSZip.loadAsync(buffer);
  const xmlFiles: XmlFile[] = [];
  
  // Log all files in the ZIP for debugging
  const allPaths = Object.keys(zip.files);
  console.log(`[ZIP Extract] ZIP contains ${allPaths.length} entries`);
  console.log(`[ZIP Extract] Sample paths: ${allPaths.slice(0, 5).join(', ')}`);

  // Process each file in the ZIP
  for (const [path, file] of Object.entries(zip.files)) {
    // Skip directories
    if (file.dir) {
      continue;
    }
    
    // Check if it's an XML file (case insensitive)
    if (!path.toLowerCase().endsWith(".xml")) {
      continue;
    }

    // Skip hidden files and macOS resource forks
    if (path.startsWith("__MACOSX") || path.includes("/__") || path.startsWith(".")) {
      continue;
    }
    
    // Skip .DS_Store and other hidden files
    const fileName = path.split("/").pop() || "";
    if (fileName.startsWith(".")) {
      continue;
    }

    try {
      const content = await file.async("string");
      
      // Use just the filename (without folder path) for uniqueness
      // But prefix with volume to avoid conflicts
      const uniqueName = `${volume}/${path}`;
      
      xmlFiles.push({
        name: uniqueName,
        content,
        volume,
      });
    } catch (error) {
      console.error(`[ZIP Extract] Error reading ${path}:`, error);
    }
  }

  console.log(`[ZIP Extract] Extracted ${xmlFiles.length} XML files from ${objectKey}`);
  return xmlFiles;
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
  xmlContent: string,
  volume: string
): Promise<number> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    preserveOrder: false,
    trimValues: true,
  });

  let parsed: any;
  try {
    parsed = parser.parse(xmlContent);
  } catch (error) {
    console.error(`XML parse error in ${fileName}:`, error);
    return 0;
  }

  const nodes: ParsedNode[] = [];

  // Process the parsed XML structure based on NCC format
  processNCCNode(parsed, nodes, null, 0, "", volume);

  // Insert nodes into database in batches
  if (nodes.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const insertData = batch.map((node, index) => ({
        edition_id: editionId,
        node_type: node.node_type,
        official_ref: node.official_ref,
        title: node.title,
        node_text: node.node_text?.slice(0, 10000), // Limit text size
        parent_id: node.parent_id,
        sort_order: i + index,
        path: node.path,
        depth: node.depth,
        hash: node.hash,
        meta: { ...node.meta, volume: node.volume, source_file: fileName },
      }));

      await supabase
        .from("ncc_nodes")
        .insert(insertData as any);
    }
  }

  return nodes.length;
}

// Process NCC-specific XML structure
function processNCCNode(
  obj: any,
  nodes: ParsedNode[],
  parentPath: string | null,
  depth: number,
  parentId: string | null,
  volume: string
): void {
  if (!obj || typeof obj !== "object") return;

  // Check for NCC-specific elements
  // Handle <clause>, <part>, <specification> root elements
  const rootElements = ["clause", "part", "specification", "section", "volume", "Definitions"];
  
  for (const rootEl of rootElements) {
    if (obj[rootEl]) {
      processNCCElement(obj[rootEl], rootEl, nodes, parentPath, depth, parentId, volume);
      return;
    }
  }

  // Fallback: recursively check all keys
  for (const key of Object.keys(obj)) {
    if (key.startsWith("@_") || key === "#text" || key === "?xml") continue;
    
    const value = obj[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        processNCCNode(item, nodes, parentPath, depth, parentId, volume);
      }
    } else if (typeof value === "object") {
      processNCCNode(value, nodes, parentPath, depth, parentId, volume);
    }
  }
}

function processNCCElement(
  element: any,
  elementType: string,
  nodes: ParsedNode[],
  parentPath: string | null,
  depth: number,
  parentId: string | null,
  volume: string
): void {
  if (!element || typeof element !== "object") return;

  // Extract key fields from NCC XML structure
  const sptc = element.sptc || element["@_id"] || null; // Section-Part-Type-Clause reference
  const title = extractNCCTitle(element);
  const text = extractNCCText(element);
  const archiveNum = element["archive-num"] || null;
  const meta = extractNCCMeta(element);

  // Determine node type
  let nodeType = "Clause";
  const outputClass = element["@_outputclass"] || "";
  if (outputClass.includes("specification")) nodeType = "Specification";
  else if (outputClass.includes("part") || elementType === "part") nodeType = "Part";
  else if (outputClass.includes("section") || elementType === "section") nodeType = "Section";
  else if (elementType === "Definitions") nodeType = "Definition";
  else if (elementType === "volume") nodeType = "Volume";

  const ref = sptc || element["@_id"] || null;
  const path = parentPath ? `${parentPath}/${ref || nodeType}` : `/${ref || nodeType}`;
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify({ sptc, title, text: text?.slice(0, 500) }))
    .digest("hex");

  // Only create a node if we have meaningful content
  if (sptc || title || text) {
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
      meta: { ...meta, archive_num: archiveNum },
      volume: volume,
    });
  }

  // Process subclauses
  if (element.subclause) {
    const subclauses = Array.isArray(element.subclause) ? element.subclause : [element.subclause];
    for (const sub of subclauses) {
      processSubclause(sub, nodes, path, depth + 1, parentId, volume);
    }
  }

  // Process clauseref (references to other clauses in parts/specifications)
  if (element.clauseref) {
    const refs = Array.isArray(element.clauseref) ? element.clauseref : [element.clauseref];
    for (const ref of refs) {
      if (ref.clause) {
        processNCCElement(ref.clause, "clause", nodes, path, depth + 1, parentId, volume);
      }
    }
  }

  // Process nested subtopics (in parts)
  if (element.subtopic) {
    const subtopics = Array.isArray(element.subtopic) ? element.subtopic : [element.subtopic];
    for (const subtopic of subtopics) {
      if (subtopic.clauseref) {
        const refs = Array.isArray(subtopic.clauseref) ? subtopic.clauseref : [subtopic.clauseref];
        for (const ref of refs) {
          if (ref.clause) {
            processNCCElement(ref.clause, "clause", nodes, path, depth + 1, parentId, volume);
          }
        }
      }
    }
  }
}

function processSubclause(
  subclause: any,
  nodes: ParsedNode[],
  parentPath: string,
  depth: number,
  parentId: string | null,
  volume: string
): void {
  if (!subclause || typeof subclause !== "object") return;

  const num = subclause.num || null;
  const text = extractNCCText(subclause);
  const ref = num ? `(${num})` : null;
  const path = `${parentPath}/${ref || "sub"}`;
  const hash = crypto
    .createHash("md5")
    .update(JSON.stringify({ num, text: text?.slice(0, 500) }))
    .digest("hex");

  if (num || text) {
    nodes.push({
      node_type: "Subclause",
      official_ref: ref,
      title: null,
      node_text: text,
      parent_id: parentId,
      sort_order: nodes.length,
      path: path,
      depth: depth,
      hash: hash,
      meta: { num },
      volume: volume,
    });
  }
}

function extractNCCTitle(element: any): string | null {
  if (!element.title) return null;
  
  if (typeof element.title === "string") return element.title;
  if (element.title["#text"]) return element.title["#text"];
  
  // Handle complex title structure
  let titleText = "";
  if (typeof element.title === "object") {
    for (const key of Object.keys(element.title)) {
      if (key === "#text") {
        titleText += element.title[key];
      } else if (typeof element.title[key] === "string") {
        titleText += element.title[key];
      }
    }
  }
  return titleText || null;
}

function extractNCCText(element: any): string | null {
  const textParts: string[] = [];

  // Direct text content
  if (element["#text"]) {
    textParts.push(element["#text"]);
  }

  // Paragraph content
  if (element.p) {
    const paragraphs = Array.isArray(element.p) ? element.p : [element.p];
    for (const p of paragraphs) {
      if (typeof p === "string") {
        textParts.push(p);
      } else if (p["#text"]) {
        textParts.push(p["#text"]);
      } else if (typeof p === "object") {
        // Extract text from nested elements
        textParts.push(extractNestedText(p));
      }
    }
  }

  // List items
  if (element.ol || element.ul) {
    const list = element.ol || element.ul;
    const items = Array.isArray(list.li) ? list.li : (list.li ? [list.li] : []);
    for (const item of items) {
      if (typeof item === "string") {
        textParts.push(`• ${item}`);
      } else if (item["#text"]) {
        textParts.push(`• ${item["#text"]}`);
      } else if (typeof item === "object") {
        textParts.push(`• ${extractNestedText(item)}`);
      }
    }
  }

  // Callout content
  if (element.callout) {
    const callouts = Array.isArray(element.callout) ? element.callout : [element.callout];
    for (const callout of callouts) {
      const calloutText = extractNCCText(callout);
      if (calloutText) {
        textParts.push(`[Note: ${calloutText}]`);
      }
    }
  }

  return textParts.join("\n").trim() || null;
}

function extractNestedText(obj: any): string {
  if (typeof obj === "string") return obj;
  if (!obj || typeof obj !== "object") return "";

  let text = "";
  if (obj["#text"]) text += obj["#text"];

  for (const key of Object.keys(obj)) {
    if (key.startsWith("@_") || key === "#text") continue;
    const value = obj[key];
    if (typeof value === "string") {
      text += " " + value;
    } else if (typeof value === "object") {
      text += " " + extractNestedText(value);
    }
  }

  return text.trim();
}

function extractNCCMeta(element: any): Record<string, unknown> {
  const meta: Record<string, unknown> = {};

  // Extract attributes
  for (const key of Object.keys(element)) {
    if (key.startsWith("@_")) {
      meta[key.slice(2)] = element[key];
    }
  }

  // Extract facets (building class applicability)
  if (element.meta?.facet) {
    const facets = Array.isArray(element.meta.facet) ? element.meta.facet : [element.meta.facet];
    meta.building_classes = facets
      .map((f: any) => f["@_building"])
      .filter(Boolean);
  }

  return meta;
}

// Sample XML files for development/testing (fallback when R2 not configured)
function getSampleXmlFiles(): XmlFile[] {
  return [
    {
      name: "sample_clause.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<clause id="_sample-clause" outputclass="ncc-clause">
  <sptc>A1G1</sptc>
  <title>Sample Clause</title>
  <archive-num>2019: A1.1</archive-num>
  <subclause id="_sub1" outputclass="subclause">
    <num>1</num>
    <p>This is sample content for testing the parser.</p>
  </subclause>
</clause>`,
      volume: "volume_one",
    },
  ];
}
