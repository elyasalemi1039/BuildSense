-- BuildSense Database Schema
-- This migration sets up the complete database structure for the BuildSense compliance app

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
  
  -- Building Classification
  building_class TEXT, -- e.g., "Class 1a", "Class 2", "Class 5"
  building_type TEXT, -- e.g., "Residential", "Commercial", "Industrial"
  
  -- Location/Zone Data
  state TEXT, -- NSW, VIC, QLD, etc.
  climate_zone TEXT, -- e.g., "Zone 5"
  wind_region TEXT, -- e.g., "B2"
  bushfire_prone BOOLEAN DEFAULT FALSE,
  bushfire_attack_level TEXT, -- BAL-LOW, BAL-12.5, BAL-19, BAL-29, BAL-40, BAL-FZ
  
  -- Construction Details
  construction_stage TEXT, -- design, framing, waterproofing, final, etc.
  construction_type TEXT, -- e.g., "Timber Frame", "Brick Veneer"
  number_of_storeys INTEGER,
  floor_area DECIMAL(10, 2), -- in square meters
  
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
  construction_stage TEXT NOT NULL, -- framing, waterproofing, final, etc.
  
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')) DEFAULT 'pending',
  
  -- Dates
  scheduled_date DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Metadata
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
  
  -- Item Details
  title TEXT NOT NULL,
  description TEXT,
  ncc_clause TEXT, -- e.g., "H2D2", "P2.2.1"
  ncc_reference_text TEXT, -- Full text of the requirement
  
  -- Compliance Status
  is_compliant BOOLEAN,
  compliance_status TEXT CHECK (compliance_status IN ('pending', 'compliant', 'non_compliant', 'not_applicable', 'requires_certification')) DEFAULT 'pending',
  
  -- Evidence
  notes TEXT,
  photo_urls TEXT[], -- Array of R2 storage URLs
  document_urls TEXT[], -- Array of document URLs
  
  -- Inspection Details
  inspected_by UUID REFERENCES profiles(id),
  inspected_at TIMESTAMPTZ,
  geo_location JSONB, -- { lat, lng }
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INSPECTIONS TABLE
-- General inspection records (not tied to checklists)
-- ============================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Inspection Details
  title TEXT NOT NULL,
  description TEXT,
  inspection_type TEXT, -- e.g., "Pre-pour", "Frame", "Final"
  construction_stage TEXT,
  
  -- Results
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'passed', 'failed', 'conditional')) DEFAULT 'scheduled',
  overall_notes TEXT,
  
  -- Photos & Evidence
  photo_urls TEXT[],
  document_urls TEXT[],
  
  -- Inspector Info
  inspector_name TEXT,
  inspector_company TEXT,
  inspected_by UUID REFERENCES profiles(id),
  
  -- Dates
  scheduled_date TIMESTAMPTZ,
  inspection_date TIMESTAMPTZ,
  
  -- Metadata
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
  
  ncc_clause TEXT NOT NULL, -- e.g., "H2D2"
  ncc_title TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI_CONVERSATIONS TABLE
-- Store AI copilot conversations for context
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  ncc_clauses_cited TEXT[], -- Array of cited clauses
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEAM_MEMBERS TABLE (for future multi-user support)
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
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_checklists_project_id ON checklists(project_id);
CREATE INDEX idx_checklist_items_checklist_id ON checklist_items(checklist_id);
CREATE INDEX idx_inspections_project_id ON inspections(project_id);
CREATE INDEX idx_ncc_bookmarks_user_id ON ncc_bookmarks(user_id);
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id);

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

-- Profiles: Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects: Users can manage their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Checklists: Users can manage checklists for their projects
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

-- Checklist Items: Same pattern as checklists
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

-- Inspections: Users can manage inspections for their projects
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

-- NCC Bookmarks: Users can manage their own bookmarks
CREATE POLICY "Users can manage own bookmarks" ON ncc_bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- AI Conversations: Users can manage their own conversations
CREATE POLICY "Users can manage own conversations" ON ai_conversations
  FOR ALL USING (auth.uid() = user_id);

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




