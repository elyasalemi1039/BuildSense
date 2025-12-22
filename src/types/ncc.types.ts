/**
 * NCC Digestion System Types
 */

import type {
  EditionKind,
  EditionStatus,
  NodeType,
  EdgeType,
  JobType,
  JobStatus,
  FileStatus,
  Jurisdiction,
} from "@/lib/constants/ncc-options";

// Legal status of an NCC edition
export type LegalStatus = "draft" | "adopted" | "superseded" | "withdrawn";

// XML schema compatibility
export type SchemaCompatibility = "fully_compatible" | "partially_compatible" | "breaking_changes";

// NCC Volumes
export type NCCVolume = "volume_one" | "volume_two" | "volume_three" | "housing_provisions";

// NCC Edition
export interface NCCEdition {
  id: string;
  kind: EditionKind;
  name: string;
  effective_date: string;
  applies_to_base_edition_id: string | null;
  jurisdiction: Jurisdiction | null;
  status: EditionStatus;
  source_r2_key: string | null;
  node_count: number;
  edge_count: number;
  term_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  
  // Edition Identity & Authority
  legal_status: LegalStatus;
  authority: string;
  replaces_edition_id: string | null;
  transition_end_date: string | null;
  
  // Structural Scope
  volumes_included: NCCVolume[];
  has_structural_changes: boolean;
  structural_change_notes: string | null;
  building_class_changes: string | null;
  performance_requirements_changed: boolean;
  
  // Machine-Readable Data & Ingestion
  has_xml_data: boolean;
  xml_schema_compatibility: SchemaCompatibility;
  new_data_fields: string[] | null;
  deprecated_fields: string[] | null;
  license: string;
  
  // Regulatory Logic Changes
  dts_threshold_changes: string | null;
  new_dts_pathways: string[] | null;
  removed_dts_provisions: string[] | null;
  mandatory_verification_changes: string | null;
  new_evidence_types: string[] | null;
  
  // Referenced Standards
  updated_standards: string[] | null;
  new_standards: string[] | null;
  removed_standards: string[] | null;
  standards_notes: string | null;
  
  // State & Territory Variations
  has_state_variations: boolean;
  state_variations_machine_readable: boolean;
  variation_overrides_dts: boolean;
  variation_adds_requirements: boolean;
  state_transition_differences: string | null;
  
  // Transition & Project Compatibility
  allows_project_lock: boolean;
  allows_auto_migration: boolean;
  requires_reassessment: boolean;
  validity_cutoff_date: string | null;
  mixing_editions_warning: boolean;
  
  // App Behaviour & UX Controls
  is_default_for_new_projects: boolean;
  hide_older_editions: boolean;
  ai_enabled: boolean;
  ai_validation_required: boolean;
  requires_new_calculators: boolean;
  requires_reindexing: boolean;
  new_features_required: string[] | null;
  
  // Legal & Risk Flags
  high_liability_areas: string[] | null;
  updated_disclaimers: boolean;
  guidance_only: boolean;
  internal_signoff: boolean;
  signoff_by: string | null;
  signoff_at: string | null;
  
  // Internal Version Control
  internal_version_id: string | null;
  allows_hotfixes: boolean;
  amendments_as_patches: boolean;
  audit_edition_queries: boolean;
  
  // Admin Notes
  admin_notes: string | null;
  change_summary: string | null;
}

export interface NCCEditionInsert {
  kind: EditionKind;
  name: string;
  effective_date: string;
  applies_to_base_edition_id?: string | null;
  jurisdiction?: Jurisdiction | null;
  status?: EditionStatus;
  source_r2_key?: string | null;
  created_by?: string | null;
}

// NCC Active Ruleset
export interface NCCActiveRuleset {
  id: string;
  base_edition_id: string;
  overlay_ids: string[];
  jurisdiction: Jurisdiction | null;
  is_default: boolean;
  updated_at: string;
  updated_by: string | null;
}

// NCC Node
export interface NCCNode {
  id: string;
  edition_id: string;
  node_type: NodeType;
  official_ref: string | null;
  title: string | null;
  node_text: string | null;
  parent_id: string | null;
  sort_order: number;
  path: string | null;
  depth: number;
  hash: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface NCCNodeInsert {
  edition_id: string;
  node_type: NodeType;
  official_ref?: string | null;
  title?: string | null;
  node_text?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  path?: string | null;
  depth?: number;
  hash?: string | null;
  meta?: Record<string, unknown>;
}

// NCC Edge
export interface NCCEdge {
  id: string;
  edition_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: EdgeType;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface NCCEdgeInsert {
  edition_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: EdgeType;
  meta?: Record<string, unknown>;
}

// NCC Term
export interface NCCTerm {
  id: string;
  edition_id: string;
  term: string;
  definition_node_id: string | null;
  definition_text: string | null;
  created_at: string;
}

export interface NCCTermInsert {
  edition_id: string;
  term: string;
  definition_node_id?: string | null;
  definition_text?: string | null;
}

// NCC Ingestion Job
export interface NCCIngestionJob {
  id: string;
  edition_id: string;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  files_total: number;
  files_processed: number;
  current_file: string | null;
  cursor_position: string | null;
  started_at: string | null;
  finished_at: string | null;
  logs: string;
  error: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface NCCIngestionJobInsert {
  edition_id: string;
  job_type: JobType;
  status?: JobStatus;
  progress?: number;
  files_total?: number;
  files_processed?: number;
  current_file?: string | null;
  cursor_position?: string | null;
  logs?: string;
  error?: Record<string, unknown> | null;
  created_by?: string | null;
}

// NCC Parse Progress
export interface NCCParseProgress {
  id: string;
  job_id: string;
  edition_id: string;
  file_path: string;
  file_status: FileStatus;
  nodes_created: number;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface NCCParseProgressInsert {
  job_id: string;
  edition_id: string;
  file_path: string;
  file_status?: FileStatus;
  nodes_created?: number;
  error_message?: string | null;
}

// API Response types
export interface CreateEditionResponse {
  edition?: NCCEdition;
  error?: string;
}

export interface UploadUrlResponse {
  uploadUrl?: string;
  objectKey?: string;
  error?: string;
}

export interface JobResponse {
  job?: NCCIngestionJob;
  error?: string;
}

export interface ParseResult {
  nodesCreated: number;
  edgesCreated: number;
  termsCreated: number;
  filesProcessed: number;
  filesTotal: number;
  isComplete: boolean;
  error?: string;
}


