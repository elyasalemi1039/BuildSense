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
  const run = await sbSelectSingle<NccIngestRun>(env, "ncc_ingest_run", `id=eq.${ingestRunId}`);

  if (run.status === "done") return;
  if (run.status === "running") return;

  // Clean up any existing data from a previous failed attempt
  // This ensures idempotency - we can safely retry the same run
  // First get all document IDs for this run
  const existingDocs = await sbSelect<{ id: string }>(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}&select=id`);
  if (existingDocs.length > 0) {
    const docIds = existingDocs.map(d => d.id).join(',');
    // Delete references that point to these documents
    try {
      await sbDelete(env, "ncc_reference", `from_document_id=in.(${docIds})`);
    } catch (e) {
      // Ignore
    }
    try {
      await sbDelete(env, "ncc_reference", `target_document_id=in.(${docIds})`);
    } catch (e) {
      // Ignore
    }
  }
  
  // Now delete the main tables (CASCADE will handle children)
  await sbDelete(env, "ncc_asset", `ingest_run_id=eq.${ingestRunId}`); // Will cascade to asset_placement
  await sbDelete(env, "ncc_document", `ingest_run_id=eq.${ingestRunId}`); // Will cascade to blocks
  await sbDelete(env, "ncc_xml_object", `ingest_run_id=eq.${ingestRunId}`);

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

    // Find Images folder
    const imagesFolder = findBestFolder(paths.filter(isImagePath), ["images", "image"]);

    // Collect XML files under xmlFolder
    const xmlPaths = paths.filter((p) => p.startsWith(xmlFolder) && isXmlPath(p));

    // Upload assets (if any)
    const assetByFilename = new Map<string, { id: string; r2_key: string }>();
    if (imagesFolder) {
      const imagePaths = paths.filter((p) => p.startsWith(imagesFolder) && isImagePath(p));
      // Upload each to deterministic R2 key
      for (const p of imagePaths) {
        const filename = p.split("/").pop() || p;
        const r2Key = `ncc/${run.edition}/${run.volume}/assets/${filename}`;
        
        await env.R2_BUCKET.put(r2Key, zipEntries[p], {
          httpMetadata: {
            contentType: contentTypeFor(filename),
          },
        });
        const inserted = await sbInsert<{ id: string; r2_key: string; filename: string }>(
          env,
          "ncc_asset",
          [
            {
              ingest_run_id: run.id,
              asset_type: "image",
              filename,
              r2_key: r2Key,
            },
          ],
          true
        );
        if (inserted[0]) assetByFilename.set(filename, { id: inserted[0].id, r2_key: inserted[0].r2_key });
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
    const docRows: any[] = [];
    for (const xo of insertedXmlObjects) {
      if (xo.root_tag !== "clause" && xo.root_tag !== "specification") continue;
      const xml = xmlContentByBasename.get(xo.xml_basename) || "";
      const sptc = textBetween(xml, "sptc");
      const title = textBetween(xml, "title");
      const archiveNum = textBetween(xml, "archive-num");
      const jurisdiction = inferJurisdictionFromBasename(xo.xml_basename);
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

    const insertedDocs = docRows.length
      ? await sbInsert<{ id: string; xml_object_id: string }>(env, "ncc_document", docRows, true)
      : [];
    for (const d of insertedDocs) {
      documentIdByXmlObjectId.set(d.xml_object_id, d.id);
    }

    // Pass B: blocks + references + images
    for (const d of insertedDocs) {
      const xmlObjId = d.xml_object_id;
      const xmlBasename = [...xmlObjectIdByBasename.entries()].find(([, id]) => id === xmlObjId)?.[0];
      if (!xmlBasename) continue;
      const xml = xmlContentByBasename.get(xmlBasename) || "";

      const blocks: any[] = [];
      let blockIndex = 0;

      const title = textBetween(xml, "title");
      if (title) {
        blocks.push({ document_id: d.id, block_index: blockIndex++, block_type: "heading", text: title, html: null, data: null });
      }

      // paragraphs
      for (const m of xml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
        const text = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (text) blocks.push({ document_id: d.id, block_index: blockIndex++, block_type: "p", text, html: null, data: null });
      }

      // lists (li)
      const items: string[] = [];
      for (const m of xml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
        const t = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        if (t) items.push(t);
      }
      if (items.length) {
        blocks.push({
          document_id: d.id,
          block_index: blockIndex++,
          block_type: "list",
          text: items.join("\n"),
          html: null,
          data: { items },
        });
      }

      // images: create placeholder blocks with descriptor basename
      const imageDescriptorBasenames = extractImageReferenceBasenames(xml);
      for (const desc of imageDescriptorBasenames) {
        blocks.push({
          document_id: d.id,
          block_index: blockIndex++,
          block_type: "image",
          text: null,
          html: null,
          data: { descriptor_xml_basename: desc },
        });
      }

      const insertedBlocks = blocks.length
        ? await sbInsert<{ id: string; block_type: string; data: any }>(env, "ncc_block", blocks, true)
        : [];

      // references (xref/conref) at document-level (no block attachment yet)
      const refs = extractRefs(xml);
      const refRows: any[] = [];
      for (const r of refs) {
        const targetXmlObjId = xmlObjectIdByBasename.get(r.target_xml_basename);
        const targetDocId = targetXmlObjId ? documentIdByXmlObjectId.get(targetXmlObjId) || null : null;
        refRows.push({
          from_document_id: d.id,
          from_block_id: null,
          ref_type: r.ref_type,
          target_xml_basename: r.target_xml_basename,
          target_document_id: targetDocId,
        });
      }
      if (refRows.length) {
        await sbInsert(env, "ncc_reference", refRows, false);
      }

      // resolve image blocks -> assets + placements
      for (const b of insertedBlocks) {
        if (b.block_type !== "image") continue;
        const desc = b.data?.descriptor_xml_basename;
        if (!desc) continue;
        const descriptorXml = xmlContentByBasename.get(desc);
        if (!descriptorXml) continue;
        const filename = extractImageFilenameFromDescriptor(descriptorXml);
        if (!filename) continue;
        const asset = assetByFilename.get(filename);
        if (!asset) continue;

        // placement
        await sbInsert(env, "ncc_asset_placement", [
          {
            asset_id: asset.id,
            document_id: d.id,
            block_id: b.id,
            caption: null,
          },
        ]);

        // update block data with resolved asset
        await sbUpdate(env, "ncc_block", `id=eq.${b.id}`, {
          data: { assetId: asset.id, r2Key: asset.r2_key, filename },
        });
      }
    }

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

    return json({ error: "Not Found" }, { status: 404 });
  },

  async queue(batch: MessageBatch<{ ingestRunId: string }>, env: Env) {
    for (const msg of batch.messages) {
      const ingestRunId = msg.body?.ingestRunId;
      if (!ingestRunId) continue;
      try {
        await ingestRun(env, ingestRunId);
        msg.ack();
      } catch (e) {
        // Let CF retry; we mark run failed in DB already.
        msg.retry();
      }
    }
  },
};


