-- Enhanced NCC Editions Schema
-- Based on comprehensive field analysis for future-proof NCC management

-- Add new columns to ncc_editions table
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS legal_status TEXT CHECK (legal_status IN ('draft', 'adopted', 'superseded', 'withdrawn')) DEFAULT 'draft';
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS authority TEXT DEFAULT 'Australian Building Codes Board';
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS replaces_edition_id UUID REFERENCES ncc_editions(id);
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS transition_end_date DATE;

-- Structural Scope
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS volumes_included TEXT[] DEFAULT ARRAY['volume_one', 'volume_two', 'volume_three', 'housing_provisions'];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS has_structural_changes BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS structural_change_notes TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS building_class_changes TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS performance_requirements_changed BOOLEAN DEFAULT FALSE;

-- Machine-Readable Data & Ingestion
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS has_xml_data BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS xml_schema_compatibility TEXT CHECK (xml_schema_compatibility IN ('fully_compatible', 'partially_compatible', 'breaking_changes')) DEFAULT 'fully_compatible';
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS new_data_fields TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS deprecated_fields TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'CC BY 4.0';

-- Regulatory Logic Changes (Rules-as-Code impact)
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS dts_threshold_changes TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS new_dts_pathways TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS removed_dts_provisions TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS mandatory_verification_changes TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS new_evidence_types TEXT[];

-- Referenced Standards
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS updated_standards TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS new_standards TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS removed_standards TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS standards_notes TEXT;

-- State & Territory Variations
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS has_state_variations BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS state_variations_machine_readable BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS variation_overrides_dts BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS variation_adds_requirements BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS state_transition_differences TEXT;

-- Transition & Project Compatibility
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS allows_project_lock BOOLEAN DEFAULT TRUE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS allows_auto_migration BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS requires_reassessment BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS validity_cutoff_date DATE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS mixing_editions_warning BOOLEAN DEFAULT TRUE;

-- App Behaviour & UX Controls
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS is_default_for_new_projects BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS hide_older_editions BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS ai_validation_required BOOLEAN DEFAULT TRUE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS requires_new_calculators BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS requires_reindexing BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS new_features_required TEXT[];

-- Legal & Risk Flags
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS high_liability_areas TEXT[];
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS updated_disclaimers BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS guidance_only BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS internal_signoff BOOLEAN DEFAULT FALSE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS signoff_by UUID REFERENCES auth.users(id);
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS signoff_at TIMESTAMPTZ;

-- Internal Version Control
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS internal_version_id TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS allows_hotfixes BOOLEAN DEFAULT TRUE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS amendments_as_patches BOOLEAN DEFAULT TRUE;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS audit_edition_queries BOOLEAN DEFAULT TRUE;

-- Admin Notes
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE ncc_editions ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ncc_editions_legal_status ON ncc_editions(legal_status);
CREATE INDEX IF NOT EXISTS idx_ncc_editions_is_default ON ncc_editions(is_default_for_new_projects);
CREATE INDEX IF NOT EXISTS idx_ncc_editions_replaces ON ncc_editions(replaces_edition_id);

-- Comments for documentation
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

