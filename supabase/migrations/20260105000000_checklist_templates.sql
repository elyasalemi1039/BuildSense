-- ============================================
-- CHECKLIST TEMPLATES SYSTEM
-- Admin-created templates with step dependencies
-- ============================================

-- Checklist templates (admin-created)
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('pre_construction', 'foundation', 'framing', 'roofing', 'plumbing', 'electrical', 'insulation', 'drywall', 'finishing', 'final_inspection', 'custom')) DEFAULT 'custom',
  building_class TEXT, -- Optional: restrict to specific building class
  jurisdiction TEXT,   -- Optional: restrict to specific jurisdiction
  is_published BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template steps (individual items in a template)
CREATE TABLE checklist_template_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  ncc_clause TEXT,           -- Link to NCC clause if applicable
  requires_photo BOOLEAN DEFAULT FALSE,
  requires_document BOOLEAN DEFAULT FALSE,
  requires_signature BOOLEAN DEFAULT FALSE,
  estimated_duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  
  -- Failure handling
  failure_action TEXT CHECK (failure_action IN ('block', 'warn', 'notify')) DEFAULT 'block',
  failure_email_template TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step dependencies (which steps block other steps)
CREATE TABLE checklist_template_step_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES checklist_template_steps(id) ON DELETE CASCADE,
  depends_on_step_id UUID NOT NULL REFERENCES checklist_template_steps(id) ON DELETE CASCADE,
  dependency_type TEXT CHECK (dependency_type IN ('must_complete', 'must_pass')) DEFAULT 'must_pass',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(step_id, depends_on_step_id),
  CHECK (step_id != depends_on_step_id)
);

-- ============================================
-- PROJECT CHECKLISTS (instances of templates)
-- ============================================

-- Project checklist (instance of a template for a specific project)
CREATE TABLE project_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'blocked')) DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project checklist steps (instances of template steps)
CREATE TABLE project_checklist_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_checklist_id UUID NOT NULL REFERENCES project_checklists(id) ON DELETE CASCADE,
  template_step_id UUID REFERENCES checklist_template_steps(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  ncc_clause TEXT,
  
  -- Status tracking
  status TEXT CHECK (status IN ('pending', 'in_progress', 'passed', 'failed', 'skipped', 'blocked')) DEFAULT 'pending',
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  
  -- Completion data
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Failure handling
  failure_reason TEXT,
  failure_notified_at TIMESTAMPTZ,
  failure_notified_to TEXT, -- Email address
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments for checklist steps (photos, documents)
CREATE TABLE project_checklist_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES project_checklist_steps(id) ON DELETE CASCADE,
  attachment_type TEXT CHECK (attachment_type IN ('photo', 'document', 'signature')) NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRADIE CONTACTS (for failure notifications)
-- ============================================

CREATE TABLE tradie_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  trade TEXT CHECK (trade IN ('plumber', 'electrician', 'carpenter', 'roofer', 'painter', 'tiler', 'plasterer', 'landscaper', 'hvac', 'general', 'other')),
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_checklist_templates_category ON checklist_templates(category);
CREATE INDEX idx_checklist_templates_published ON checklist_templates(is_published);
CREATE INDEX idx_checklist_template_steps_template ON checklist_template_steps(template_id);
CREATE INDEX idx_checklist_template_step_deps_step ON checklist_template_step_dependencies(step_id);
CREATE INDEX idx_checklist_template_step_deps_depends ON checklist_template_step_dependencies(depends_on_step_id);
CREATE INDEX idx_project_checklists_project ON project_checklists(project_id);
CREATE INDEX idx_project_checklists_template ON project_checklists(template_id);
CREATE INDEX idx_project_checklist_steps_checklist ON project_checklist_steps(project_checklist_id);
CREATE INDEX idx_project_checklist_attachments_step ON project_checklist_attachments(step_id);
CREATE INDEX idx_tradie_contacts_user ON tradie_contacts(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_step_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_checklist_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tradie_contacts ENABLE ROW LEVEL SECURITY;

-- Templates: Admins can manage, users can read published
CREATE POLICY "Admins can manage checklist templates" ON checklist_templates
  FOR ALL USING (is_admin());

CREATE POLICY "Users can read published templates" ON checklist_templates
  FOR SELECT USING (is_published = TRUE);

-- Template Steps: Admins can manage, users can read
CREATE POLICY "Admins can manage template steps" ON checklist_template_steps
  FOR ALL USING (is_admin());

CREATE POLICY "Users can read template steps" ON checklist_template_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checklist_templates 
      WHERE id = template_id AND is_published = TRUE
    )
  );

-- Template Step Dependencies: Same as steps
CREATE POLICY "Admins can manage step dependencies" ON checklist_template_step_dependencies
  FOR ALL USING (is_admin());

CREATE POLICY "Users can read step dependencies" ON checklist_template_step_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM checklist_template_steps cts
      JOIN checklist_templates ct ON ct.id = cts.template_id
      WHERE cts.id = step_id AND ct.is_published = TRUE
    )
  );

-- Project Checklists: Users can manage their own
CREATE POLICY "Users can manage own project checklists" ON project_checklists
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_id AND user_id = auth.uid()
    )
  );

-- Project Checklist Steps: Users can manage for own projects
CREATE POLICY "Users can manage own checklist steps" ON project_checklist_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_checklists pc
      JOIN projects p ON p.id = pc.project_id
      WHERE pc.id = project_checklist_id AND p.user_id = auth.uid()
    )
  );

-- Attachments: Users can manage for own projects
CREATE POLICY "Users can manage own attachments" ON project_checklist_attachments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM project_checklist_steps pcs
      JOIN project_checklists pc ON pc.id = pcs.project_checklist_id
      JOIN projects p ON p.id = pc.project_id
      WHERE pcs.id = step_id AND p.user_id = auth.uid()
    )
  );

-- Tradie Contacts: Users can manage their own
CREATE POLICY "Users can manage own tradie contacts" ON tradie_contacts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_checklist_templates_updated_at BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_template_steps_updated_at BEFORE UPDATE ON checklist_template_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_checklists_updated_at BEFORE UPDATE ON project_checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_checklist_steps_updated_at BEFORE UPDATE ON project_checklist_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tradie_contacts_updated_at BEFORE UPDATE ON tradie_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE checklist_templates IS 'Admin-created checklist templates for construction stages';
COMMENT ON TABLE checklist_template_steps IS 'Individual steps within a checklist template';
COMMENT ON TABLE checklist_template_step_dependencies IS 'Dependencies between template steps (blocking logic)';
COMMENT ON TABLE project_checklists IS 'Instance of a template assigned to a specific project';
COMMENT ON TABLE project_checklist_steps IS 'Instance of a template step for a project checklist';
COMMENT ON TABLE project_checklist_attachments IS 'Photos, documents, signatures attached to checklist steps';
COMMENT ON TABLE tradie_contacts IS 'Contact information for tradies for failure notifications';

