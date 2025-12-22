/**
 * NCC Digestion System Constants
 * 
 * Allowed values for NCC edition and node fields.
 */

// Edition kinds
export const EDITION_KINDS = ["BASE", "OVERLAY"] as const;
export type EditionKind = (typeof EDITION_KINDS)[number];

// Edition statuses (ingestion pipeline)
export const EDITION_STATUSES = ["draft", "uploaded", "parsing", "parsed", "indexing", "indexed", "published", "archived"] as const;
export type EditionStatus = (typeof EDITION_STATUSES)[number];

// Legal statuses
export const LEGAL_STATUSES = ["draft", "adopted", "superseded", "withdrawn"] as const;
export type LegalStatus = (typeof LEGAL_STATUSES)[number];

// XML Schema Compatibility
export const SCHEMA_COMPATIBILITIES = ["fully_compatible", "partially_compatible", "breaking_changes"] as const;
export type SchemaCompatibility = (typeof SCHEMA_COMPATIBILITIES)[number];

// NCC Volumes
export const NCC_VOLUMES = [
  { value: "volume_one", label: "Volume One", description: "Class 2-9 buildings" },
  { value: "volume_two", label: "Volume Two", description: "Class 1 and 10 buildings" },
  { value: "volume_three", label: "Volume Three", description: "Plumbing and Drainage" },
  { value: "housing_provisions", label: "Housing Provisions", description: "Combined Class 1 and 10" },
] as const;
export const NCC_VOLUME_VALUES = NCC_VOLUMES.map((v) => v.value);
export type NCCVolume = (typeof NCC_VOLUME_VALUES)[number];

// High liability areas for legal flags
export const HIGH_LIABILITY_AREAS = [
  { value: "fire_safety", label: "Fire Safety" },
  { value: "structural", label: "Structural" },
  { value: "waterproofing", label: "Waterproofing" },
  { value: "accessibility", label: "Accessibility" },
  { value: "energy_efficiency", label: "Energy Efficiency" },
  { value: "plumbing", label: "Plumbing & Drainage" },
] as const;

// Node types
export const NODE_TYPES = [
  "Volume",
  "Section", 
  "Part",
  "Clause",
  "Subclause",
  "Definition",
  "Appendix",
  "Figure",
  "Table",
  "Note",
  "Specification",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

// Edge types
export const EDGE_TYPES = [
  "references",
  "defines", 
  "amends",
  "varies",
  "satisfies",
  "see_also",
  "parent",
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

// Job types
export const JOB_TYPES = ["UPLOAD", "PARSE", "INDEX", "PUBLISH"] as const;
export type JobType = (typeof JOB_TYPES)[number];

// Job statuses
export const JOB_STATUSES = ["queued", "running", "success", "error", "partial"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// File statuses for parse progress
export const FILE_STATUSES = ["pending", "processing", "completed", "error"] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

// Australian jurisdictions
export const JURISDICTIONS = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
] as const;

export const JURISDICTION_VALUES = JURISDICTIONS.map((j) => j.value);
export type Jurisdiction = (typeof JURISDICTION_VALUES)[number];

// Validation helpers
export function isValidEditionKind(value: string): value is EditionKind {
  return EDITION_KINDS.includes(value as EditionKind);
}

export function isValidEditionStatus(value: string): value is EditionStatus {
  return EDITION_STATUSES.includes(value as EditionStatus);
}

export function isValidNodeType(value: string): value is NodeType {
  return NODE_TYPES.includes(value as NodeType);
}

export function isValidEdgeType(value: string): value is EdgeType {
  return EDGE_TYPES.includes(value as EdgeType);
}

export function isValidJobType(value: string): value is JobType {
  return JOB_TYPES.includes(value as JobType);
}

export function isValidJobStatus(value: string): value is JobStatus {
  return JOB_STATUSES.includes(value as JobStatus);
}

export function isValidJurisdiction(value: string): value is Jurisdiction {
  return JURISDICTION_VALUES.includes(value as Jurisdiction);
}


