-- Add new project fields for the enhanced project creation wizard
-- Migration: 20250121000000_add_project_fields.sql

-- Add project_type column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_type TEXT 
  CHECK (project_type IN ('new_build', 'renovation', 'extension'));

-- Add NCC-related columns
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncc_context TEXT 
  CHECK (ncc_context IN ('volume_one', 'volume_two'));

ALTER TABLE projects ADD COLUMN IF NOT EXISTS ncc_version TEXT 
  CHECK (ncc_version IN ('ncc_2025', 'ncc_2022', 'ncc_2019'));

-- Add construction value (stored in cents to avoid floating point issues)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_value BIGINT;

-- Add construction scopes as an array of text
ALTER TABLE projects ADD COLUMN IF NOT EXISTS construction_scopes TEXT[] DEFAULT '{}';

-- Update building_class to have a CHECK constraint for valid values
-- First drop the column if it exists without constraint, then recreate
-- Note: This is done as a comment - in production you'd handle migration carefully
-- ALTER TABLE projects DROP COLUMN IF EXISTS building_class;
-- ALTER TABLE projects ADD COLUMN building_class TEXT CHECK (building_class IN (...));

-- Add CHECK constraint for construction_scopes array values
-- PostgreSQL doesn't support CHECK on array elements directly, so we use a function

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
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_construction_scopes;
ALTER TABLE projects ADD CONSTRAINT check_construction_scopes 
  CHECK (validate_construction_scopes(construction_scopes));

-- Create index for faster queries on new columns
CREATE INDEX IF NOT EXISTS idx_projects_project_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_ncc_context ON projects(ncc_context);








