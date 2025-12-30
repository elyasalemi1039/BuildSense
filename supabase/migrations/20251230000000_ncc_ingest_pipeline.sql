-- NCC Ingest Pipeline Schema (new, normalized)
-- Migration: 20251230000000_ncc_ingest_pipeline.sql
--
-- Implements the ingestion tables as specified:
-- - ncc_ingest_run
-- - ncc_xml_object
-- - ncc_document
-- - ncc_block
-- - ncc_reference
-- - ncc_asset
-- - ncc_asset_placement

-- 1) A single ingest run per zip upload
create table if not exists ncc_ingest_run (
  id uuid primary key default gen_random_uuid(),
  edition text not null,         -- e.g. "NCC_2022" (we will store editionId string)
  volume text not null,          -- e.g. "V1" "V2" "V3" "Housing"
  r2_zip_key text not null,
  status text not null default 'queued', -- queued|running|done|failed
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- 2) Every XML file becomes a "source object"
create table if not exists ncc_xml_object (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid references ncc_ingest_run(id) on delete cascade,
  xml_basename text not null, -- "2-2-1-application-of-part-2-2.xml" OR "532_0.7.0.xml"
  root_tag text not null,     -- clause|specification|figure|image-reference|etc
  outputclass text,
  raw_xml text,               -- optional: store raw for debugging (or store in R2 instead)
  sha256 text,
  created_at timestamptz not null default now(),
  unique (ingest_run_id, xml_basename)
);

-- 3) “Documents” you show in UI (clauses/specifications/etc)
create table if not exists ncc_document (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid references ncc_ingest_run(id) on delete cascade,
  xml_object_id uuid references ncc_xml_object(id) on delete cascade,

  doc_type text not null,      -- clause|specification|schedule|etc
  sptc text,                   -- "2.2.1"
  title text,
  archive_num text,
  jurisdiction text,           -- e.g. "WA" if detectable, else null

  created_at timestamptz not null default now(),

  -- for quick lookup
  unique (ingest_run_id, doc_type, sptc)
);

-- 4) Render blocks (so UI isn't re-parsing XML)
create table if not exists ncc_block (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references ncc_document(id) on delete cascade,
  block_index int not null,

  block_type text not null,    -- heading|p|list|table|image|note
  text text,                   -- plain text version (good for search)
  html text,                   -- sanitized html (optional)
  data jsonb,                  -- structured payload (lists/tables/callouts/etc)

  created_at timestamptz not null default now(),
  unique (document_id, block_index)
);

-- 5) References between objects (xref/conref)
create table if not exists ncc_reference (
  id uuid primary key default gen_random_uuid(),
  from_document_id uuid references ncc_document(id) on delete cascade,
  from_block_id uuid references ncc_block(id) on delete cascade,
  ref_type text not null,      -- xref|conref|image-reference|table-reference
  target_xml_basename text not null, -- normalized basename
  target_document_id uuid references ncc_document(id),
  created_at timestamptz not null default now()
);

-- 6) Assets (images)
create table if not exists ncc_asset (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid references ncc_ingest_run(id) on delete cascade,
  asset_type text not null,      -- image
  filename text not null,        -- "image-2-climate-zones-for-thermal-design.jpeg"
  r2_key text not null,          -- where it lives in R2
  width int,
  height int,
  created_at timestamptz not null default now(),
  unique (ingest_run_id, r2_key)
);

-- 7) Where an asset appears in the NCC content
create table if not exists ncc_asset_placement (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid references ncc_asset(id) on delete cascade,
  document_id uuid references ncc_document(id) on delete cascade,
  block_id uuid references ncc_block(id) on delete cascade,
  caption text,
  created_at timestamptz not null default now()
);

-- Indexes (minimal, critical)
create index if not exists idx_ncc_ingest_run_edition on ncc_ingest_run(edition);
create index if not exists idx_ncc_ingest_run_status on ncc_ingest_run(status);
create index if not exists idx_ncc_xml_object_ingest_basename on ncc_xml_object(ingest_run_id, xml_basename);
create index if not exists idx_ncc_document_ingest_sptc on ncc_document(ingest_run_id, doc_type, sptc);
create index if not exists idx_ncc_block_document on ncc_block(document_id, block_index);
create index if not exists idx_ncc_reference_target_basename on ncc_reference(target_xml_basename);

-- RLS: keep admin-only for now (worker will use service role)
alter table ncc_ingest_run enable row level security;
alter table ncc_xml_object enable row level security;
alter table ncc_document enable row level security;
alter table ncc_block enable row level security;
alter table ncc_reference enable row level security;
alter table ncc_asset enable row level security;
alter table ncc_asset_placement enable row level security;

create policy "Admins can manage ingest runs" on ncc_ingest_run
  for all using (is_admin());
create policy "Admins can manage xml objects" on ncc_xml_object
  for all using (is_admin());
create policy "Admins can manage documents" on ncc_document
  for all using (is_admin());
create policy "Admins can manage blocks" on ncc_block
  for all using (is_admin());
create policy "Admins can manage references" on ncc_reference
  for all using (is_admin());
create policy "Admins can manage assets" on ncc_asset
  for all using (is_admin());
create policy "Admins can manage asset placements" on ncc_asset_placement
  for all using (is_admin());


