-- ============================================
-- BuildSense Complete Database Schema
-- ============================================
-- This migration creates the entire database from scratch.
-- Run this ONCE on an empty Supabase project.
--
-- Combines:
-- - Initial schema (profiles, projects, checklists, inspections, etc.)
-- - Project enhancements (project_type, ncc_context, construction_scopes)
-- - NCC digestion system (editions, nodes, edges, terms, jobs)
-- - NCC edition enhancements (legal_status, volumes, standards, etc.)
-- - NCC ingest pipeline (ingest_run, xml_object, document, block, reference, asset)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  company TEXT,
  role TEXT CHECK (role IN ('builder', 'architect', 'surveyor', 'certifier', 'other')) DEFAULT 'builder',
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECTS TABLE
-- Stores building project information
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Project Type
  project_type TEXT CHECK (project_type IN ('new_build', 'renovation', 'extension')),
  
  -- Building Classification
  building_class TEXT,
  building_type TEXT,
  
  -- Location/Zone Data
  state TEXT,
  climate_zone TEXT,
  wind_region TEXT,
  bushfire_prone BOOLEAN DEFAULT FALSE,
  bushfire_attack_level TEXT,
  
  -- Construction Details
  construction_stage TEXT,
  construction_type TEXT,
  number_of_storeys INTEGER,
  floor_area DECIMAL(10, 2),
  construction_value BIGINT,
  construction_scopes TEXT[] DEFAULT '{}',
  
  -- NCC Context
  ncc_context TEXT CHECK (ncc_context IN ('volume_one', 'volume_two')),
  ncc_version TEXT CHECK (ncc_version IN ('ncc_2025', 'ncc_2022', 'ncc_2019')),
  ncc_base_edition_id UUID,
  ncc_overlay_ids UUID[] DEFAULT '{}',
  ncc_as_at_date DATE,
  
  -- Project Status
  status TEXT CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'archived')) DEFAULT 'draft',
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKLISTS TABLE
-- Stage-specific compliance checklists
-- ============================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  construction_stage TEXT NOT NULL,
  
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKLIST_ITEMS TABLE
-- Individual items within a checklist
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  ncc_clause TEXT,
  ncc_reference_text TEXT,
  
  is_compliant BOOLEAN,
  compliance_status TEXT CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'not_applicable', 'requires_certification')) DEFAULT 'pending',
  
  notes TEXT,
  photo_urls TEXT[],
  document_urls TEXT[],
  
  inspected_by UUID REFERENCES profiles(id),
  inspected_at TIMESTAMPTZ,
  geo_location JSONB,
  
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSPECTIONS TABLE
-- General inspection records
-- ============================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  title TEXT NOT NULL,
  description TEXT,
  inspection_type TEXT,
  construction_stage TEXT,
  
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'conditional')) DEFAULT 'scheduled',
  overall_notes TEXT,
  
  photo_urls TEXT[],
  document_urls TEXT[],
  
  inspector_name TEXT,
  inspector_company TEXT,
  inspected_by UUID REFERENCES profiles(id),
  
  scheduled_date TIMESTAMPTZ,
  inspection_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC_BOOKMARKS TABLE
-- User bookmarks for NCC clauses
-- ============================================
CREATE TABLE ncc_bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  ncc_clause TEXT NOT NULL,
  ncc_title TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI_CONVERSATIONS TABLE
-- Store AI copilot conversations
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  ncc_clauses_cited TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM_MEMBERS TABLE
-- ============================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  role TEXT CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, user_id)
);

-- ============================================
-- NCC EDITIONS TABLE
-- Stores edition metadata (BASE editions + OVERLAY amendments/variations)
-- ============================================
CREATE TABLE ncc_editions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('BASE', 'OVERLAY')),
  name TEXT NOT NULL,
  effective_date DATE NOT NULL,
  applies_to_base_edition_id UUID NULL REFERENCES ncc_editions(id) ON DELETE SET NULL,
  jurisdiction TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'uploaded', 'parsed', 'indexed', 'published', 'archived')),
  source_r2_key TEXT NULL,
  node_count INTEGER DEFAULT 0,
  edge_count INTEGER DEFAULT 0,
  term_count INTEGER DEFAULT 0,
  
  -- Enhanced fields
  legal_status TEXT CHECK (legal_status IN ('draft', 'adopted', 'superseded', 'withdrawn')) DEFAULT 'draft',
  authority TEXT DEFAULT 'Australian Building Codes Board',
  replaces_edition_id UUID REFERENCES ncc_editions(id),
  transition_end_date DATE,
  volumes_included TEXT[] DEFAULT ARRAY['volume_one', 'volume_two', 'volume_three', 'housing_provisions'],
  has_structural_changes BOOLEAN DEFAULT FALSE,
  structural_change_notes TEXT,
  building_class_changes TEXT,
  performance_requirements_changed BOOLEAN DEFAULT FALSE,
  has_xml_data BOOLEAN DEFAULT FALSE,
  xml_schema_compatibility TEXT CHECK (xml_schema_compatibility IN ('fully_compatible', 'partially_compatible', 'breaking_changes')) DEFAULT 'fully_compatible',
  new_data_fields TEXT[],
  deprecated_fields TEXT[],
  license TEXT DEFAULT 'CC BY 4.0',
  dts_threshold_changes TEXT,
  new_dts_pathways TEXT[],
  removed_dts_provisions TEXT[],
  mandatory_verification_changes TEXT,
  new_evidence_types TEXT[],
  updated_standards TEXT[],
  new_standards TEXT[],
  removed_standards TEXT[],
  standards_notes TEXT,
  has_state_variations BOOLEAN DEFAULT FALSE,
  state_variations_machine_readable BOOLEAN DEFAULT FALSE,
  variation_overrides_dts BOOLEAN DEFAULT FALSE,
  variation_adds_requirements BOOLEAN DEFAULT FALSE,
  state_transition_differences TEXT,
  allows_project_lock BOOLEAN DEFAULT TRUE,
  allows_auto_migration BOOLEAN DEFAULT FALSE,
  requires_reassessment BOOLEAN DEFAULT FALSE,
  validity_cutoff_date DATE,
  mixing_editions_warning BOOLEAN DEFAULT TRUE,
  is_default_for_new_projects BOOLEAN DEFAULT FALSE,
  hide_older_editions BOOLEAN DEFAULT FALSE,
  ai_enabled BOOLEAN DEFAULT FALSE,
  ai_validation_required BOOLEAN DEFAULT TRUE,
  requires_new_calculators BOOLEAN DEFAULT FALSE,
  requires_reindexing BOOLEAN DEFAULT FALSE,
  new_features_required TEXT[],
  high_liability_areas TEXT[],
  updated_disclaimers BOOLEAN DEFAULT FALSE,
  guidance_only BOOLEAN DEFAULT FALSE,
  internal_signoff BOOLEAN DEFAULT FALSE,
  signoff_by UUID REFERENCES auth.users(id),
  signoff_at TIMESTAMPTZ,
  internal_version_id TEXT,
  allows_hotfixes BOOLEAN DEFAULT TRUE,
  amendments_as_patches BOOLEAN DEFAULT TRUE,
  audit_edition_queries BOOLEAN DEFAULT TRUE,
  admin_notes TEXT,
  change_summary TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraint: OVERLAY must have a base edition
ALTER TABLE ncc_editions ADD CONSTRAINT overlay_requires_base 
  CHECK (kind = 'BASE' OR applies_to_base_edition_id IS NOT NULL);

-- Add FK for projects.ncc_base_edition_id
ALTER TABLE projects ADD CONSTRAINT fk_projects_ncc_base_edition 
  FOREIGN KEY (ncc_base_edition_id) REFERENCES ncc_editions(id);

-- ============================================
-- NCC ACTIVE RULESETS TABLE
-- ============================================
CREATE TABLE ncc_active_rulesets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_edition_id UUID NOT NULL REFERENCES ncc_editions(id) ON DELETE CASCADE,
  overlay_ids UUID[] DEFAULT '{}',
  jurisdiction TEXT NULL,
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
  official_ref TEXT NULL,
  title TEXT NULL,
  node_text TEXT NULL,
  parent_id UUID NULL REFERENCES ncc_nodes(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  path TEXT NULL,
  depth INTEGER DEFAULT 0,
  hash TEXT NULL,
  meta JSONB DEFAULT '{}',
  search_tsv TSVECTOR,
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
  progress INTEGER DEFAULT 0,
  files_total INTEGER DEFAULT 0,
  files_processed INTEGER DEFAULT 0,
  current_file TEXT NULL,
  cursor_position TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  logs TEXT DEFAULT '',
  error JSONB NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NCC PARSE PROGRESS TABLE
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
-- NCC INGEST PIPELINE TABLES (new normalized schema)
-- ============================================

-- 1) A single ingest run per zip upload
CREATE TABLE ncc_ingest_run (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition TEXT NOT NULL,
  volume TEXT NOT NULL,
  r2_zip_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

-- 2) Every XML file becomes a "source object"
CREATE TABLE ncc_xml_object (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id UUID REFERENCES ncc_ingest_run(id) ON DELETE CASCADE,
  xml_basename TEXT NOT NULL,
  root_tag TEXT NOT NULL,
  outputclass TEXT,
  raw_xml TEXT,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ingest_run_id, xml_basename)
);

-- 3) "Documents" you show in UI (clauses/specifications/etc)
CREATE TABLE ncc_document (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id UUID REFERENCES ncc_ingest_run(id) ON DELETE CASCADE,
  xml_object_id UUID REFERENCES ncc_xml_object(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  sptc TEXT,
  title TEXT,
  archive_num TEXT,
  jurisdiction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ingest_run_id, doc_type, sptc)
);

-- 4) Render blocks (so UI isn't re-parsing XML)
CREATE TABLE ncc_block (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES ncc_document(id) ON DELETE CASCADE,
  block_index INT NOT NULL,
  block_type TEXT NOT NULL,
  text TEXT,
  html TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, block_index)
);

-- 5) References between objects (xref/conref)
CREATE TABLE ncc_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_document_id UUID REFERENCES ncc_document(id) ON DELETE CASCADE,
  from_block_id UUID REFERENCES ncc_block(id) ON DELETE CASCADE,
  ref_type TEXT NOT NULL,
  target_xml_basename TEXT NOT NULL,
  target_document_id UUID REFERENCES ncc_document(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Assets (images)
CREATE TABLE ncc_asset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingest_run_id UUID REFERENCES ncc_ingest_run(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  width INT,
  height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ingest_run_id, r2_key)
);

-- 7) Where an asset appears in the NCC content
CREATE TABLE ncc_asset_placement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES ncc_asset(id) ON DELETE CASCADE,
  document_id UUID REFERENCES ncc_document(id) ON DELETE CASCADE,
  block_id UUID REFERENCES ncc_block(id) ON DELETE CASCADE,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Core app indexes
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_ncc_context ON projects(ncc_context);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_inspections_project_id ON inspections(project_id);
CREATE INDEX idx_ncc_bookmarks_user_id ON ncc_bookmarks(user_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id);

-- NCC editions indexes
CREATE INDEX idx_ncc_editions_status ON ncc_editions(status);
CREATE INDEX idx_ncc_editions_kind ON ncc_editions(kind);
CREATE INDEX idx_ncc_editions_jurisdiction ON ncc_editions(jurisdiction);
CREATE INDEX idx_ncc_editions_legal_status ON ncc_editions(legal_status);
CREATE INDEX idx_ncc_editions_is_default ON ncc_editions(is_default_for_new_projects);
CREATE INDEX idx_ncc_editions_replaces ON ncc_editions(replaces_edition_id);

-- NCC nodes indexes
CREATE INDEX idx_ncc_nodes_edition_id ON ncc_nodes(edition_id);
CREATE INDEX idx_ncc_nodes_official_ref ON ncc_nodes(edition_id, official_ref);
CREATE INDEX idx_ncc_nodes_parent_id ON ncc_nodes(parent_id, sort_order);
CREATE INDEX idx_ncc_nodes_node_type ON ncc_nodes(edition_id, node_type);
CREATE INDEX idx_ncc_nodes_path ON ncc_nodes(edition_id, path);
CREATE INDEX idx_ncc_nodes_search ON ncc_nodes USING GIN(search_tsv);

-- NCC edges indexes
CREATE INDEX idx_ncc_edges_from ON ncc_edges(from_node_id);
CREATE INDEX idx_ncc_edges_to ON ncc_edges(to_node_id);
CREATE INDEX idx_ncc_edges_edition ON ncc_edges(edition_id);

-- NCC terms indexes
CREATE INDEX idx_ncc_terms_edition ON ncc_terms(edition_id);
CREATE INDEX idx_ncc_terms_term ON ncc_terms(edition_id, term);

-- NCC jobs indexes
CREATE INDEX idx_ncc_jobs_edition ON ncc_ingestion_jobs(edition_id);
CREATE INDEX idx_ncc_jobs_status ON ncc_ingestion_jobs(status);
CREATE INDEX idx_ncc_parse_progress_job ON ncc_parse_progress(job_id, file_status);

-- NCC ingest pipeline indexes
CREATE INDEX idx_ncc_ingest_run_edition ON ncc_ingest_run(edition);
CREATE INDEX idx_ncc_ingest_run_status ON ncc_ingest_run(status);
CREATE INDEX idx_ncc_xml_object_ingest_basename ON ncc_xml_object(ingest_run_id, xml_basename);
CREATE INDEX idx_ncc_document_ingest_sptc ON ncc_document(ingest_run_id, doc_type, sptc);
CREATE INDEX idx_ncc_block_document ON ncc_block(document_id, block_index);
CREATE INDEX idx_ncc_reference_target_basename ON ncc_reference(target_xml_basename);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Validate construction scopes
CREATE OR REPLACE FUNCTION validate_construction_scopes(scopes TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  valid_scopes TEXT[] := ARRAY[
    'structural', 'waterproofing', 'energy_efficiency', 'fire_safety',
    'accessibility', 'plumbing_drainage', 'termite_management', 'sound_insulation',
    'ventilation', 'hvac', 'electrical', 'egress', 'health_amenity',
    'stormwater', 'site_works'
  ];
  scope TEXT;
BEGIN
  IF scopes IS NULL THEN
    RETURN TRUE;
  END IF;
  
  FOREACH scope IN ARRAY scopes
  LOOP
    IF NOT scope = ANY(valid_scopes) THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraint using the function
ALTER TABLE projects ADD CONSTRAINT check_construction_scopes 
  CHECK (validate_construction_scopes(construction_scopes));

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_active_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_parse_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_ingest_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_xml_object ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_document ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_asset ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncc_asset_placement ENABLE ROW LEVEL SECURITY;

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

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Checklists policies
CREATE POLICY "Users can view checklists for own projects" ON checklists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = checklists.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checklists for own projects" ON checklists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = checklists.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklists for own projects" ON checklists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = checklists.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checklists for own projects" ON checklists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = checklists.project_id AND projects.user_id = auth.uid()
    )
  );

-- Checklist Items policies
CREATE POLICY "Users can view checklist items" ON checklist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checklists 
      JOIN projects ON projects.id = checklists.project_id 
      WHERE checklists.id = checklist_items.checklist_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage checklist items" ON checklist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM checklists 
      JOIN projects ON projects.id = checklists.project_id 
      WHERE checklists.id = checklist_items.checklist_id AND projects.user_id = auth.uid()
    )
  );

-- Inspections policies
CREATE POLICY "Users can view inspections for own projects" ON inspections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = inspections.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage inspections for own projects" ON inspections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = inspections.project_id AND projects.user_id = auth.uid()
    )
  );

-- NCC Bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON ncc_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- AI Conversations policies
CREATE POLICY "Users can manage own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

-- NCC Editions policies
CREATE POLICY "Admins can manage editions" ON ncc_editions
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published editions" ON ncc_editions
  FOR SELECT USING (status = 'published');

-- NCC Active Rulesets policies
CREATE POLICY "Admins can manage active rulesets" ON ncc_active_rulesets
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read active rulesets" ON ncc_active_rulesets
  FOR SELECT USING (TRUE);

-- NCC Nodes policies
CREATE POLICY "Admins can manage nodes" ON ncc_nodes
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published nodes" ON ncc_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- NCC Edges policies
CREATE POLICY "Admins can manage edges" ON ncc_edges
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published edges" ON ncc_edges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- NCC Terms policies
CREATE POLICY "Admins can manage terms" ON ncc_terms
  FOR ALL USING (is_admin());

CREATE POLICY "Public can read published terms" ON ncc_terms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ncc_editions 
      WHERE id = edition_id AND status = 'published'
    )
  );

-- Ingestion Jobs policies
CREATE POLICY "Admins can manage ingestion jobs" ON ncc_ingestion_jobs
  FOR ALL USING (is_admin());

-- Parse Progress policies
CREATE POLICY "Admins can manage parse progress" ON ncc_parse_progress
  FOR ALL USING (is_admin());

-- NCC Ingest Pipeline policies (admin-only for now)
CREATE POLICY "Admins can manage ingest runs" ON ncc_ingest_run
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage xml objects" ON ncc_xml_object
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage documents" ON ncc_document
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage blocks" ON ncc_block
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage references" ON ncc_reference
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage assets" ON ncc_asset
  FOR ALL USING (is_admin());

CREATE POLICY "Admins can manage asset placements" ON ncc_asset_placement
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

COMMENT ON COLUMN ncc_editions.legal_status IS 'Legal status of this edition (draft, adopted, superseded, withdrawn)';
COMMENT ON COLUMN ncc_editions.authority IS 'Publishing authority, typically ABCB';
COMMENT ON COLUMN ncc_editions.replaces_edition_id IS 'The edition this one supersedes';
COMMENT ON COLUMN ncc_editions.transition_end_date IS 'Date after which previous edition cannot be used';
COMMENT ON COLUMN ncc_editions.volumes_included IS 'Array of volume identifiers included in this edition';
COMMENT ON COLUMN ncc_editions.xml_schema_compatibility IS 'Compatibility with previous edition schema';
COMMENT ON COLUMN ncc_editions.dts_threshold_changes IS 'Description of DTS threshold changes';
COMMENT ON COLUMN ncc_editions.allows_project_lock IS 'Whether projects can be locked to this edition';
COMMENT ON COLUMN ncc_editions.ai_enabled IS 'Whether AI assistant can use this edition';
COMMENT ON COLUMN ncc_editions.guidance_only IS 'Whether this edition is marked as guidance only during early adoption';
COMMENT ON COLUMN ncc_editions.internal_signoff IS 'Whether internal review has been completed';

