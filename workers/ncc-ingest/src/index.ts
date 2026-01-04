import { unzipSync, strFromU8 } from "fflate";

type IngestRunStatus = "queued" | "running" | "done" | "failed";

type Env = {
  R2_BUCKET: R2Bucket;
  NCC_INGEST_QUEUE: Queue;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENQUEUE_TOKEN: string;
};

type NccIngestRun = {
  id: string;
  edition: string; // editionId string
  volume: string; // "V1" | "V2" | "V3" | "Housing"
  r2_zip_key: string;
  status: IngestRunStatus;
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function refBasename(ref: string): string {
  const cleaned = ref.split("#")[0].split("?")[0];
  const parts = cleaned.split("/");
  return parts[parts.length - 1] || cleaned;
}

function isXmlPath(path: string) {
  return path.toLowerCase().endsWith(".xml");
}

function isImagePath(path: string) {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".svg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".pdf")
  );
}

function findBestFolder(entries: string[], folderNames: string[]): string | null {
  // Consider any path segment exactly matching any folderNames (case-insensitive).
  // Choose the folder root that contains the most matching files.
  const counts = new Map<string, number>();

  for (const p of entries) {
    const segs = p.split("/").filter(Boolean);
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i].toLowerCase();
      if (!folderNames.includes(seg)) continue;
      const folderPath = segs.slice(0, i + 1).join("/") + "/";
      counts.set(folderPath, (counts.get(folderPath) || 0) + 1);
    }
  }

  let best: string | null = null;
  let bestCount = -1;
  for (const [k, c] of counts.entries()) {
    if (c > bestCount) {
      bestCount = c;
      best = k;
    }
  }
  return best;
}

async function sbFetch(env: Env, path: string, init: RequestInit = {}) {
  const url = `${env.SUPABASE_URL}${path}`;
  const headers = new Headers(init.headers || {});
  headers.set("apikey", env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
  return fetch(url, { ...init, headers });
}

async function sbSelect<T>(env: Env, table: string, filter: string): Promise<T[]> {
  const res = await sbFetch(env, `/rest/v1/${table}?${filter}`, { method: "GET" });
  if (!res.ok) throw new Error(`Supabase select failed: ${table} (${res.status})`);
  return (await res.json()) as T[];
}

async function sbSelectSingle<T>(env: Env, table: string, filter: string): Promise<T> {
  const res = await sbFetch(env, `/rest/v1/${table}?${filter}&select=*`, { method: "GET" });
  if (!res.ok) throw new Error(`Supabase select failed: ${table} (${res.status})`);
  const rows = (await res.json()) as T[];
  if (!rows[0]) throw new Error(`Supabase select returned 0 rows: ${table}`);
  return rows[0];
}

async function sbUpdate(env: Env, table: string, filter: string, patch: unknown) {
  const res = await sbFetch(env, `/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase update failed: ${table} (${res.status}) ${text}`);
  }
}

async function sbDelete(env: Env, table: string, filter: string): Promise<void> {
  const res = await sbFetch(env, `/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase delete failed: ${table} (${res.status}) ${text}`);
  }
}

async function sbInsert<T>(env: Env, table: string, rows: unknown[], returnRep = false, upsert = false): Promise<T[]> {
  const headers: Record<string, string> = {
    Prefer: returnRep ? "return=representation" : "return=minimal",
  };
  
  // Add upsert header if requested
  if (upsert) {
    headers.Prefer = `resolution=merge-duplicates,${headers.Prefer}`;
  }
  
  const res = await sbFetch(env, `/rest/v1/${table}`, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase insert failed: ${table} (${res.status}) ${text}`);
  }
  return returnRep ? ((await res.json()) as T[]) : ([] as T[]);
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function extractFirstTag(xml: string): { rootTag: string; outputclass: string | null } {
  const m = xml.match(/<([A-Za-z0-9:_-]+)([^>]*)>/);
  const tag = m?.[1] || "unknown";
  const attrs = m?.[2] || "";
  const oc = attrs.match(/\boutputclass\s*=\s*\"([^\"]+)\"/)?.[1] || null;
  // strip namespace prefix
  const rootTag = tag.includes(":") ? tag.split(":").pop() || tag : tag;
  return { rootTag, outputclass: oc };
}

function textBetween(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || null;
}

function inferJurisdictionFromBasename(basename: string): string | null {
  const m = basename.match(/-([A-Z]{2,3})\.xml$/);
  return m?.[1] || null;
}

function extractRefs(xml: string): Array<{ ref_type: string; target_xml_basename: string }> {
  const refs: Array<{ ref_type: string; target_xml_basename: string }> = [];

  // href="...xml"
  for (const m of xml.matchAll(/\bhref\s*=\s*\"([^\"]+\.xml[^\"]*)\"/gi)) {
    refs.push({ ref_type: "xref", target_xml_basename: refBasename(m[1]) });
  }

  // conref="...xml"
  for (const m of xml.matchAll(/\bconref\s*=\s*\"([^\"]+\.xml[^\"]*)\"/gi)) {
    refs.push({ ref_type: "conref", target_xml_basename: refBasename(m[1]) });
  }

  return refs;
}

function extractImageReferenceBasenames(xml: string): string[] {
  const basenames: string[] = [];
  for (const m of xml.matchAll(/<image-reference[^>]*\bconref\s*=\s*\"([^\"]+\.xml[^\"]*)\"/gi)) {
    basenames.push(refBasename(m[1]));
  }
  return basenames;
}

function extractImageFilenameFromDescriptor(descriptorXml: string): string | null {
  // Fallback heuristics: find any image-like filename in the descriptor XML.
  const m = descriptorXml.match(/([A-Za-z0-9._-]+\.(?:jpg|jpeg|png|svg|webp|gif|pdf))/i);
  return m?.[1] || null;
}

async function ingestRun(env: Env, ingestRunId: string) {
  console.log(`[Ingest Run ${ingestRunId}] Starting...`);
  const run = await sbSelectSingle<NccIngestRun>(env, "ncc_ingest_run", `id=eq.${ingestRunId}`);
  console.log(`[Ingest Run ${ingestRunId}] Current status: ${run.status}`);

  if (run.status === "done") {
    console.log(`[Ingest Run ${ingestRunId}] Already done, skipping`);
    return;
  }
  // Don't skip "running" - we want to allow retries

  // ALWAYS clean up any existing data before starting
  // This ensures idempotency - we can safely retry the same run
  console.log(`[Ingest Run ${ingestRunId}] Cleaning up existing data...`);
  
  try {
    // First get all document IDs for this run to delete references
    const existingDocs = await sbSelect<{ id: string }>(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}&select=id`);
    console.log(`[Ingest Run ${ingestRunId}] Found ${existingDocs.length} existing documents to clean up`);
    
    if (existingDocs.length > 0) {
      const docIds = existingDocs.map(d => d.id).join(',');
      // Delete references that point to these documents
      try {
        await sbDelete(env, "ncc_reference", `from_document_id=in.(${docIds})`);
        console.log(`[Ingest Run ${ingestRunId}] Deleted references (from)`);
      } catch (e) {
        console.log(`[Ingest Run ${ingestRunId}] No references to delete (from)`);
      }
      try {
        await sbDelete(env, "ncc_reference", `target_document_id=in.(${docIds})`);
        console.log(`[Ingest Run ${ingestRunId}] Deleted references (target)`);
      } catch (e) {
        console.log(`[Ingest Run ${ingestRunId}] No references to delete (target)`);
      }
    }
    
    // Delete main tables - CASCADE will handle children
    try {
      await sbDelete(env, "ncc_asset", `ingest_run_id=eq.${ingestRunId}`);
      console.log(`[Ingest Run ${ingestRunId}] Deleted assets`);
    } catch (e) {
      console.log(`[Ingest Run ${ingestRunId}] No assets to delete or error:`, e);
    }
    
    try {
      await sbDelete(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}`);
      console.log(`[Ingest Run ${ingestRunId}] Deleted documents`);
    } catch (e) {
      console.log(`[Ingest Run ${ingestRunId}] No documents to delete or error:`, e);
    }
    
    try {
      await sbDelete(env, "ncc_xml_object", `ingest_run_id=eq.${ingestRunId}`);
      console.log(`[Ingest Run ${ingestRunId}] Deleted xml_objects`);
    } catch (e) {
      console.log(`[Ingest Run ${ingestRunId}] No xml_objects to delete or error:`, e);
    }
    
    console.log(`[Ingest Run ${ingestRunId}] Cleanup complete`);
  } catch (e) {
    console.error(`[Ingest Run ${ingestRunId}] Cleanup error (continuing anyway):`, e);
  }

  await sbUpdate(env, "ncc_ingest_run", `id=eq.${ingestRunId}`, {
    status: "running",
    error: null,
  });

  try {
    const obj = await env.R2_BUCKET.get(run.r2_zip_key);
    if (!obj) throw new Error(`ZIP not found in R2: ${run.r2_zip_key}`);
    const buf = new Uint8Array(await obj.arrayBuffer());

    const zipEntries = unzipSync(buf); // { [path]: Uint8Array }
    const paths = Object.keys(zipEntries);

    // Find XML/ (or XMLs/) folder
    const xmlFolder = findBestFolder(paths.filter(isXmlPath), ["xml", "xmls"]);
    if (!xmlFolder) throw new Error("ZIP missing XML folder");

    // Collect XML files under xmlFolder
    const xmlPaths = paths.filter((p) => p.startsWith(xmlFolder) && isXmlPath(p));
    console.log(`[Ingest Run ${run.id}] Found ${xmlPaths.length} XML files in ${xmlFolder}`);
    
    // Find and process images
    const imagesFolder = findBestFolder(paths.filter(isImagePath), ["images", "image"]);
    const assetByFilename = new Map<string, { id: string; r2_key: string }>();
    
    if (imagesFolder) {
      const imagePaths = paths.filter((p) => p.startsWith(imagesFolder) && isImagePath(p));
      console.log(`[Ingest Run ${run.id}] Found ${imagePaths.length} images in ${imagesFolder}`);
      
      // Upload all images to R2 first (R2 binding ops don't count toward subrequest limit)
      const assetRows: any[] = [];
      for (const p of imagePaths) {
        const filename = p.split("/").pop() || p;
        const r2Key = `ncc/${run.edition}/${run.volume}/assets/${filename}`;
        
        // Upload to R2
        await env.R2_BUCKET.put(r2Key, zipEntries[p], {
          httpMetadata: { contentType: contentTypeFor(filename) },
        });
        
        assetRows.push({
          ingest_run_id: run.id,
          asset_type: "image",
          filename,
          r2_key: r2Key,
        });
      }
      
      // Batch insert all assets in ONE database call
      if (assetRows.length > 0) {
        console.log(`[Ingest Run ${run.id}] Inserting ${assetRows.length} assets`);
        const insertedAssets = await sbInsert<{ id: string; filename: string; r2_key: string }>(
          env, "ncc_asset", assetRows, true
        );
        for (const a of insertedAssets) {
          assetByFilename.set(a.filename, { id: a.id, r2_key: a.r2_key });
        }
        console.log(`[Ingest Run ${run.id}] Inserted ${insertedAssets.length} assets`);
      }
    }

    // Pass A: index xml objects + documents
    const xmlObjectIdByBasename = new Map<string, string>();
    const documentIdByXmlObjectId = new Map<string, string>();
    const xmlContentByBasename = new Map<string, string>();

    // Insert xml objects in batches
    const xmlObjectRows: any[] = [];
    for (const p of xmlPaths) {
      const basename = p.split("/").pop() || p;
      const xml = strFromU8(zipEntries[p]);
      const { rootTag, outputclass } = extractFirstTag(xml);
      const sha = await sha256Hex(zipEntries[p]);

      xmlContentByBasename.set(basename, xml);
      xmlObjectRows.push({
        ingest_run_id: run.id,
        xml_basename: basename,
        root_tag: rootTag,
        outputclass,
        sha256: sha,
        raw_xml: null,
      });
    }

    // Bulk insert xml objects (representation to get ids)
    const insertedXmlObjects = await sbInsert<{ id: string; xml_basename: string; root_tag: string; outputclass: string | null }>(
      env,
      "ncc_xml_object",
      xmlObjectRows,
      true
    );
    for (const row of insertedXmlObjects) {
      xmlObjectIdByBasename.set(row.xml_basename, row.id);
    }

    // Insert documents (clause/specification)
    // Deduplicate by (doc_type, sptc) since the same clause can appear in multiple XML files
    // (e.g., jurisdictional variants like -NSW.xml, -VIC.xml)
    const docRows: any[] = [];
    const seenDocKeys = new Set<string>();
    for (const xo of insertedXmlObjects) {
      if (xo.root_tag !== "clause" && xo.root_tag !== "specification") continue;
      const xml = xmlContentByBasename.get(xo.xml_basename) || "";
      const sptc = textBetween(xml, "sptc");
      const title = textBetween(xml, "title");
      const archiveNum = textBetween(xml, "archive-num");
      const jurisdiction = inferJurisdictionFromBasename(xo.xml_basename);
      
      // Skip duplicates (keep first occurrence)
      const docKey = `${xo.root_tag}::${sptc || "null"}`;
      if (seenDocKeys.has(docKey)) {
        console.log(`[Ingest Run ${run.id}] Skipping duplicate doc: ${docKey} from ${xo.xml_basename}`);
        continue;
      }
      seenDocKeys.add(docKey);
      
      docRows.push({
        ingest_run_id: run.id,
        xml_object_id: xo.id,
        doc_type: xo.root_tag,
        sptc,
        title,
        archive_num: archiveNum,
        jurisdiction,
      });
    }

    console.log(`[Ingest Run ${run.id}] Inserting ${docRows.length} documents (${seenDocKeys.size} unique)`);
    const insertedDocs = docRows.length
      ? await sbInsert<{ id: string; xml_object_id: string }>(env, "ncc_document", docRows, true)
      : [];
    for (const d of insertedDocs) {
      documentIdByXmlObjectId.set(d.xml_object_id, d.id);
    }

    // Pass B: blocks + references + images
    // SKIPPED for now - too many subrequests per document
    // TODO: Add this as a separate processing phase
    console.log(`[Ingest Run ${run.id}] Skipping Pass B (blocks/refs/images) to stay under subrequest limit`);

    await sbUpdate(env, "ncc_ingest_run", `id=eq.${ingestRunId}`, {
      status: "done",
      finished_at: new Date().toISOString(),
      error: null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await sbUpdate(env, "ncc_ingest_run", `id=eq.${ingestRunId}`, {
      status: "failed",
      finished_at: new Date().toISOString(),
      error: msg,
    });
    throw err;
  }
}

function contentTypeFor(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/enqueue" && request.method === "POST") {
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
      if (!token || token !== env.ENQUEUE_TOKEN) return json({ error: "Unauthorized" }, { status: 401 });

      const body = (await request.json().catch(() => ({}))) as { ingestRunId?: string };
      if (!body.ingestRunId) return json({ error: "Missing ingestRunId" }, { status: 400 });

      await env.NCC_INGEST_QUEUE.send({ ingestRunId: body.ingestRunId });
      return json({ ok: true, ingestRunId: body.ingestRunId });
    }

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    // Test Supabase connection
    if (url.pathname === "/test-supabase") {
      try {
        const testUrl = `${env.SUPABASE_URL}/rest/v1/ncc_ingest_run?select=id,status&limit=1`;
        console.log(`[Test] Calling: ${testUrl}`);
        console.log(`[Test] SUPABASE_URL: ${env.SUPABASE_URL ? 'SET' : 'NOT SET'}`);
        console.log(`[Test] SUPABASE_SERVICE_ROLE_KEY: ${env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + env.SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET'}`);
        
        const res = await fetch(testUrl, {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        });
        const text = await res.text();
        console.log(`[Test] Response status: ${res.status}`);
        console.log(`[Test] Response body: ${text.substring(0, 500)}`);
        
        return json({ 
          ok: res.ok, 
          status: res.status, 
          supabaseUrl: env.SUPABASE_URL ? 'SET' : 'NOT SET',
          serviceKeySet: !!env.SUPABASE_SERVICE_ROLE_KEY,
          body: text.substring(0, 500) 
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Test] Error:`, e);
        return json({ ok: false, error: msg }, { status: 500 });
      }
    }

    // Test cleanup for a specific ingest run
    if (url.pathname.startsWith("/test-cleanup/")) {
      const ingestRunId = url.pathname.split("/test-cleanup/")[1];
      try {
        console.log(`[Test Cleanup] Starting for ${ingestRunId}`);
        
        // Count existing documents
        const docs = await sbSelect<{ id: string }>(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}&select=id`);
        console.log(`[Test Cleanup] Found ${docs.length} documents`);
        
        // Try to delete
        const deleteUrl = `${env.SUPABASE_URL}/rest/v1/ncc_document?ingest_run_id=eq.${ingestRunId}`;
        console.log(`[Test Cleanup] Calling DELETE: ${deleteUrl}`);
        
        const deleteRes = await fetch(deleteUrl, {
          method: "DELETE",
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: "return=representation",
          },
        });
        const deleteText = await deleteRes.text();
        console.log(`[Test Cleanup] Delete response: ${deleteRes.status} - ${deleteText.substring(0, 500)}`);
        
        // Count again
        const docsAfter = await sbSelect<{ id: string }>(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}&select=id`);
        console.log(`[Test Cleanup] After delete: ${docsAfter.length} documents`);
        
        return json({
          ok: deleteRes.ok,
          status: deleteRes.status,
          docsBefore: docs.length,
          docsAfter: docsAfter.length,
          deleteResponse: deleteText.substring(0, 500),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Test Cleanup] Error:`, e);
        return json({ ok: false, error: msg }, { status: 500 });
      }
    }

    // Test processing a specific ingest run (for debugging)
    if (url.pathname.startsWith("/test-ingest/")) {
      const ingestRunId = url.pathname.split("/test-ingest/")[1];
      try {
        console.log(`[Test Ingest] Starting for ${ingestRunId}`);
        await ingestRun(env, ingestRunId);
        return json({ ok: true, ingestRunId });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const stack = e instanceof Error ? e.stack : "No stack";
        console.error(`[Test Ingest] Error:`, e);
        return json({ ok: false, error: msg, stack }, { status: 500 });
      }
    }

    return json({ error: "Not Found" }, { status: 404 });
  },

  async queue(batch: MessageBatch<{ ingestRunId: string }>, env: Env) {
    for (const msg of batch.messages) {
      const ingestRunId = msg.body?.ingestRunId;
      if (!ingestRunId) {
        console.error("[Queue] Message missing ingestRunId:", msg.body);
        msg.ack(); // Don't retry invalid messages
        continue;
      }
      console.log(`[Queue] Processing ingest run: ${ingestRunId}`);
      try {
        await ingestRun(env, ingestRunId);
        console.log(`[Queue] Successfully processed: ${ingestRunId}`);
        msg.ack();
      } catch (e) {
        console.error(`[Queue] Error processing ${ingestRunId}:`, e);
        console.error(`[Queue] Error stack:`, e instanceof Error ? e.stack : "No stack");
        // Let CF retry; we mark run failed in DB already.
        msg.retry();
      }
    }
  },
};


