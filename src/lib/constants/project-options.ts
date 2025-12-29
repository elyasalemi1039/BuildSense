/**
 * Project Options Constants
 * 
 * These are the allowed values for project fields.
 * Used for both frontend dropdowns and server-side validation.
 * Any changes here should be reflected in the database constraints.
 */

// Project Types
export const PROJECT_TYPES = [
  { value: "new_build", label: "New Build" },
  { value: "renovation", label: "Renovation/Alteration" },
  { value: "extension", label: "Extension" },
] as const;

export const PROJECT_TYPE_VALUES = PROJECT_TYPES.map((t) => t.value);
export type ProjectType = (typeof PROJECT_TYPE_VALUES)[number];

// Building Classes
export const BUILDING_CLASSES = [
  { value: "class_1a", label: "Class 1a", description: "Single dwelling (detached house, townhouse)" },
  { value: "class_1b", label: "Class 1b", description: "Boarding house, guest house, hostel (≤12 people)" },
  { value: "class_2", label: "Class 2", description: "Apartment building (2+ sole-occupancy units)" },
  { value: "class_3", label: "Class 3", description: "Residential building (hotel, motel, backpackers)" },
  { value: "class_4", label: "Class 4", description: "Dwelling in a Class 5-9 building" },
  { value: "class_5", label: "Class 5", description: "Office building" },
  { value: "class_6", label: "Class 6", description: "Shop or retail premises" },
  { value: "class_7a", label: "Class 7a", description: "Car park" },
  { value: "class_7b", label: "Class 7b", description: "Warehouse or storage" },
  { value: "class_8", label: "Class 8", description: "Laboratory, factory, or production facility" },
  { value: "class_9a", label: "Class 9a", description: "Health care building (hospital, clinic)" },
  { value: "class_9b", label: "Class 9b", description: "Assembly building (theatre, school, church)" },
  { value: "class_9c", label: "Class 9c", description: "Aged care building" },
  { value: "class_10a", label: "Class 10a", description: "Non-habitable (garage, carport, shed)" },
  { value: "class_10b", label: "Class 10b", description: "Structure (fence, mast, retaining wall)" },
  { value: "class_10c", label: "Class 10c", description: "Private bushfire shelter" },
] as const;

export const BUILDING_CLASS_VALUES = BUILDING_CLASSES.map((c) => c.value);
export type BuildingClass = (typeof BUILDING_CLASS_VALUES)[number];

// NCC Contexts
export const NCC_CONTEXTS = [
  { value: "volume_one", label: "Volume One", description: "Class 2-9 buildings" },
  { value: "volume_two", label: "Volume Two", description: "Class 1 & 10 buildings" },
] as const;

export const NCC_CONTEXT_VALUES = NCC_CONTEXTS.map((c) => c.value);
export type NCCContext = (typeof NCC_CONTEXT_VALUES)[number];

// NCC Versions
export const NCC_VERSIONS = [
  { value: "ncc_2025", label: "NCC 2025" },
  { value: "ncc_2022", label: "NCC 2022" },
  { value: "ncc_2019", label: "NCC 2019 (Amendment 1)" },
] as const;

export const NCC_VERSION_VALUES = NCC_VERSIONS.map((v) => v.value);
export type NCCVersion = (typeof NCC_VERSION_VALUES)[number];

// Australian States/Territories
export const AUSTRALIAN_STATES = [
  { value: "NSW", label: "New South Wales" },
  { value: "VIC", label: "Victoria" },
  { value: "QLD", label: "Queensland" },
  { value: "WA", label: "Western Australia" },
  { value: "SA", label: "South Australia" },
  { value: "TAS", label: "Tasmania" },
  { value: "ACT", label: "Australian Capital Territory" },
  { value: "NT", label: "Northern Territory" },
] as const;

export const AUSTRALIAN_STATE_VALUES = AUSTRALIAN_STATES.map((s) => s.value);
export type AustralianState = (typeof AUSTRALIAN_STATE_VALUES)[number];

// Construction Scopes - Main
export const MAIN_CONSTRUCTION_SCOPES = [
  { value: "structural", label: "Structural", description: "Foundations, framing, load-bearing elements" },
  { value: "waterproofing", label: "Waterproofing", description: "Wet areas, roofing, external membranes" },
  { value: "energy_efficiency", label: "Energy Efficiency", description: "Insulation, glazing, thermal performance" },
  { value: "fire_safety", label: "Fire Safety", description: "Fire separation, detection, egress" },
  { value: "accessibility", label: "Accessibility", description: "Access for people with disabilities" },
  { value: "plumbing_drainage", label: "Plumbing & Drainage", description: "Water supply, sanitary drainage" },
  { value: "termite_management", label: "Termite Management", description: "Termite barriers and protection" },
  { value: "sound_insulation", label: "Sound Insulation", description: "Acoustic performance requirements" },
] as const;

// Construction Scopes - Advanced
export const ADVANCED_CONSTRUCTION_SCOPES = [
  { value: "ventilation", label: "Ventilation & Condensation", description: "Natural and mechanical ventilation" },
  { value: "hvac", label: "Mechanical Services (HVAC)", description: "Heating, cooling, air conditioning" },
  { value: "electrical", label: "Electrical & Lighting", description: "Electrical installations, emergency lighting" },
  { value: "egress", label: "Egress & Exits", description: "Exit paths, doors, stairways" },
  { value: "health_amenity", label: "Health & Amenity", description: "Room heights, light, ventilation" },
  { value: "stormwater", label: "Stormwater Management", description: "Drainage, detention, overflow" },
  { value: "site_works", label: "Site & External Works", description: "Driveways, retaining walls, fencing" },
] as const;

export const ALL_CONSTRUCTION_SCOPES = [...MAIN_CONSTRUCTION_SCOPES, ...ADVANCED_CONSTRUCTION_SCOPES] as const;
export const CONSTRUCTION_SCOPE_VALUES = ALL_CONSTRUCTION_SCOPES.map((s) => s.value);
export type ConstructionScope = (typeof CONSTRUCTION_SCOPE_VALUES)[number];

// Project Status
export const PROJECT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
] as const;

export const PROJECT_STATUS_VALUES = PROJECT_STATUSES.map((s) => s.value);
export type ProjectStatus = (typeof PROJECT_STATUS_VALUES)[number];

/**
 * Validation helper functions
 */
export function isValidProjectType(value: string): value is ProjectType {
  return PROJECT_TYPE_VALUES.includes(value as ProjectType);
}

export function isValidBuildingClass(value: string): value is BuildingClass {
  return BUILDING_CLASS_VALUES.includes(value as BuildingClass);
}

export function isValidNCCContext(value: string): value is NCCContext {
  return NCC_CONTEXT_VALUES.includes(value as NCCContext);
}

export function isValidNCCVersion(value: string): value is NCCVersion {
  return NCC_VERSION_VALUES.includes(value as NCCVersion);
}

export function isValidAustralianState(value: string): value is AustralianState {
  return AUSTRALIAN_STATE_VALUES.includes(value as AustralianState);
}

export function isValidConstructionScope(value: string): value is ConstructionScope {
  return CONSTRUCTION_SCOPE_VALUES.includes(value as ConstructionScope);
}

export function areValidConstructionScopes(values: string[]): values is ConstructionScope[] {
  return values.every(isValidConstructionScope);
}

export function isValidProjectStatus(value: string): value is ProjectStatus {
  return PROJECT_STATUS_VALUES.includes(value as ProjectStatus);
}




