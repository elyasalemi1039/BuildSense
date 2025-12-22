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


