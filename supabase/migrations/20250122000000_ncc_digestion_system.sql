-- NCC Digestion System Schema
-- Migration: 20250122000000_ncc_digestion_system.sql
-- 
-- This migration creates the tables for the NCC (National Construction Code)
-- ingestion and management system.

-- ============================================
-- NCC EDITIONS TABLE
-- Stores edition metadata (BASE editions + OVERLAY amendments/variations)
-- ============================================
CREATE TABLE ncc_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('BASE', 'OVERLAY')),
  name TEXT NOT NULL, -- e.g. "NCC 2022", "NCC 2022 Amendment 2", "VIC Variations"
  effective_date DATE NOT NULL,
  applies_to_base_edition_id UUID NULL REFERENCES ncc_editions(id) ON DELETE SET NULL,
  jurisdiction TEXT NULL, -- e.g. 'VIC', 'NSW' for state overlays
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'parsed', 'indexed', 'published', 'archived')),
  source_r2_key TEXT NULL, -- R2 object key for the uploaded ZIP
  node_count INTEGER DEFAULT 0,
  edge_count INTEGER DEFAULT 0,
  term_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: OVERLAY must have a base edition
ALTER TABLE ncc_editions ADD CONSTRAINT overlay_requires_base 
  CHECK (kind = 'BASE' OR applies_to_base_edition_id IS NOT NULL);

-- ============================================
-- NCC ACTIVE RULESETS TABLE
-- Pointers to the currently active editions for new projects
-- ============================================
CREATE TABLE ncc_active_rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  overlay_ids UUID[] DEFAULT '{}',
  jurisdiction TEXT NULL, -- NULL = default/national
  is_default BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(jurisdiction)
);

-- ============================================
-- NCC NODES TABLE
-- Normalized NCC content (clause graph)
-- ============================================
CREATE TABLE ncc_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN (
    'Volume', 'Section', 'Part', 'Clause', 'Subclause', 
    'Definition', 'Appendix', 'Figure', 'Table', 'Note', 'Specification'
  )),
  official_ref TEXT NULL, -- e.g. "H1D1", "F6D2" - may be null for non-clauses
  title TEXT NULL,
  node_text TEXT NULL, -- Full text content
  parent_id UUID NULL REFERENCES ncc_nodes(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  path TEXT NULL, -- Materialized path like "/V2/H/1/H1D1"
  depth INTEGER DEFAULT 0,
  hash TEXT NULL, -- Content hash for diff detection
  meta JSONB DEFAULT '{}', -- Raw XML attributes, numbering, etc.
  search_tsv TSVECTOR, -- Full-text search vector
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC EDGES TABLE
-- Cross-references between nodes
-- ============================================
CREATE TABLE ncc_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  from_node_id UUID NOT NULL REFERENCES ncc_nodes(id) ON DELETE CASCADE,
  to_node_id UUID NOT NULL REFERENCES ncc_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL CHECK (edge_type IN (
    'references', 'defines', 'amends', 'varies', 'satisfies', 'see_also', 'parent'
  )),
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC TERMS TABLE
-- Definitions/Glossary terms
-- ============================================
CREATE TABLE ncc_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition_node_id UUID REFERENCES ncc_nodes(id) ON DELETE SET NULL,
  definition_text TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC INGESTION JOBS TABLE
-- Track upload/parse/index/publish jobs
-- ============================================
CREATE TABLE ncc_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL CHECK (job_type IN ('UPLOAD', 'PARSE', 'INDEX', 'PUBLISH')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'error', 'partial')),
  progress INTEGER DEFAULT 0, -- 0-100 percentage
  files_total INTEGER DEFAULT 0,
  files_processed INTEGER DEFAULT 0,
  current_file TEXT NULL, -- Currently processing file
  cursor_position TEXT NULL, -- For resumable parsing
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  logs TEXT DEFAULT '', -- Append-only log entries
  error JSONB NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC PARSE PROGRESS TABLE
-- Track file-by-file parsing progress for chunked processing
-- ============================================
CREATE TABLE ncc_parse_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES ncc_ingestion_jobs(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_status TEXT NOT NULL DEFAULT 'pending' CHECK (file_status IN ('pending', 'processing', 'completed', 'error')),
  nodes_created INTEGER DEFAULT 0,
  error_message TEXT NULL,
  processed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(job_id, file_path)
);

-- ============================================
-- ADD NCC FIELDS TO PROJECTS TABLE
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncc_base_edition_id UUID REFERENCES ncc_editions(id);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncc_overlay_ids UUID[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncc_as_at_date DATE;

-- ============================================
-- ADD ADMIN ROLE TO PROFILES
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ncc_editions_status ON ncc_editions(status);
CREATE INDEX IF NOT EXISTS idx_ncc_editions_kind ON ncc_editions(kind);
CREATE INDEX IF NOT EXISTS idx_ncc_editions_jurisdiction ON ncc_editions(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_ncc_nodes_edition_id ON ncc_nodes(edition_id);
CREATE INDEX IF NOT EXISTS idx_ncc_nodes_official_ref ON ncc_nodes(edition_id, official_ref);
CREATE INDEX IF NOT EXISTS idx_ncc_nodes_parent_id ON ncc_nodes(parent_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_ncc_nodes_node_type ON ncc_nodes(edition_id, node_type);
CREATE INDEX IF NOT EXISTS idx_ncc_nodes_path ON ncc_nodes(edition_id, path);
CREATE INDEX IF NOT EXISTS idx_ncc_nodes_search ON ncc_nodes USING GIN(search_tsv);

CREATE INDEX IF NOT EXISTS idx_ncc_edges_from ON ncc_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_ncc_edges_to ON ncc_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_ncc_edges_edition ON ncc_edges(edition_id);

CREATE INDEX IF NOT EXISTS idx_ncc_terms_edition ON ncc_terms(edition_id);
CREATE INDEX IF NOT EXISTS idx_ncc_terms_term ON ncc_terms(edition_id, term);

CREATE INDEX IF NOT EXISTS idx_ncc_jobs_edition ON ncc_ingestion_jobs(edition_id);
CREATE INDEX IF NOT EXISTS idx_ncc_jobs_status ON ncc_ingestion_jobs(status);

CREATE INDEX IF NOT EXISTS idx_ncc_parse_progress_job ON ncc_parse_progress(job_id, file_status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update search_tsv on node insert/update
CREATE OR REPLACE FUNCTION update_ncc_node_search_tsv()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_tsv := to_tsvector('english', 
    COALESCE(NEW.official_ref, '') || ' ' || 
    COALESCE(NEW.title, '') || ' ' || 
    COALESCE(NEW.node_text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ncc_nodes_search_tsv ON ncc_nodes;
CREATE TRIGGER trg_ncc_nodes_search_tsv
  BEFORE INSERT OR UPDATE OF official_ref, title, node_text
  ON ncc_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_ncc_node_search_tsv();

-- Update edition counts after parse
CREATE OR REPLACE FUNCTION update_edition_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ncc_editions 
  SET 
    node_count = (SELECT COUNT(*) FROM ncc_nodes WHERE edition_id = NEW.edition_id),
    updated_at = NOW()
  WHERE id = NEW.edition_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all NCC tables
ALTER TABLE ncc_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_active_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_parse_progress ENABLE ROW LEVEL SECURITY;

-- Helper function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NCC Editions: Admins can do everything, public can read published
CREATE POLICY "Admins can manage editions" ON ncc_editions
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published editions" ON ncc_editions
  FOR SELECT USING (status = 'published');

-- NCC Active Rulesets: Admins can manage, public can read
CREATE POLICY "Admins can manage active rulesets" ON ncc_active_rulesets
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read active rulesets" ON ncc_active_rulesets
  FOR SELECT USING (TRUE);

-- NCC Nodes: Admins can manage, public can read from published editions
CREATE POLICY "Admins can manage nodes" ON ncc_nodes
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published nodes" ON ncc_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- NCC Edges: Same as nodes
CREATE POLICY "Admins can manage edges" ON ncc_edges
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published edges" ON ncc_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- NCC Terms: Same as nodes
CREATE POLICY "Admins can manage terms" ON ncc_terms
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published terms" ON ncc_terms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- Ingestion Jobs: Admins only
CREATE POLICY "Admins can manage ingestion jobs" ON ncc_ingestion_jobs
  FOR ALL USING (is_admin());

-- Parse Progress: Admins only
CREATE POLICY "Admins can manage parse progress" ON ncc_parse_progress
  FOR ALL USING (is_admin());

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE ncc_editions IS 'NCC edition versions (base editions and overlays/amendments)';
COMMENT ON TABLE ncc_active_rulesets IS 'Pointers to currently active NCC editions for new projects';
COMMENT ON TABLE ncc_nodes IS 'Normalized NCC content as a clause graph';
COMMENT ON TABLE ncc_edges IS 'Cross-references between NCC nodes';
COMMENT ON TABLE ncc_terms IS 'NCC definitions and glossary terms';
COMMENT ON TABLE ncc_ingestion_jobs IS 'Track NCC ingestion job progress';
COMMENT ON TABLE ncc_parse_progress IS 'Track file-by-file parsing for chunked processing';









