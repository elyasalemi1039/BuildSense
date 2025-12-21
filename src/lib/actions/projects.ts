"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import {
  isValidBuildingClass,
  isValidNCCContext,
  isValidNCCVersion,
  isValidProjectType,
  isValidAustralianState,
  areValidConstructionScopes,
  type BuildingClass,
  type NCCContext,
  type NCCVersion,
  type ProjectType,
  type AustralianState,
  type ConstructionScope,
} from "@/lib/constants/project-options";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

export async function getProjects(): Promise<{ projects: Project[]; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", projects: [] };
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      return { error: error.message, projects: [] };
    }

    return { projects: projects || [], error: null };
  } catch (error) {
    console.error("Get projects error:", error);
    return { error: "Failed to fetch projects", projects: [] };
  }
}

export interface CreateProjectInput {
  // Required
  name: string;
  // Step 1
  project_type?: string;
  building_class?: string;
  number_of_storeys?: number;
  construction_value?: number;
  ncc_context?: string;
  ncc_version?: string;
  // Step 2
  address?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  // Step 3
  construction_scopes?: string[];
  // Optional
  description?: string;
}

export async function createProject(data: CreateProjectInput) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // Validate required fields
    if (!data.name || data.name.trim().length < 3) {
      return { error: "Project name must be at least 3 characters" };
    }

    // Validate optional fields against allowed values
    if (data.project_type && !isValidProjectType(data.project_type)) {
      return { error: "Invalid project type" };
    }

    if (data.building_class && !isValidBuildingClass(data.building_class)) {
      return { error: "Invalid building class" };
    }

    if (data.ncc_context && !isValidNCCContext(data.ncc_context)) {
      return { error: "Invalid NCC context" };
    }

    if (data.ncc_version && !isValidNCCVersion(data.ncc_version)) {
      return { error: "Invalid NCC version" };
    }

    if (data.state && !isValidAustralianState(data.state)) {
      return { error: "Invalid state/territory" };
    }

    if (data.construction_scopes && data.construction_scopes.length > 0) {
      if (!areValidConstructionScopes(data.construction_scopes)) {
        return { error: "Invalid construction scope(s)" };
      }
    }

    // Validate number fields
    if (data.number_of_storeys !== undefined && (data.number_of_storeys < 1 || data.number_of_storeys > 200)) {
      return { error: "Number of storeys must be between 1 and 200" };
    }

    if (data.construction_value !== undefined && data.construction_value < 0) {
      return { error: "Construction value cannot be negative" };
    }

    // Build insert data with validated values
    const insertData: ProjectInsert = {
      user_id: user.id,
      name: data.name.trim(),
      description: data.description?.trim() ?? null,
      address: data.address?.trim() ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      state: (data.state as AustralianState) ?? null,
      building_class: (data.building_class as BuildingClass) ?? null,
      number_of_storeys: data.number_of_storeys ?? null,
      project_type: (data.project_type as ProjectType) ?? null,
      ncc_context: (data.ncc_context as NCCContext) ?? null,
      ncc_version: (data.ncc_version as NCCVersion) ?? null,
      construction_value: data.construction_value ?? null,
      construction_scopes: (data.construction_scopes as ConstructionScope[]) ?? null,
      status: "draft",
    };

    const { data: project, error } = await supabase
      .from("projects")
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard");
    return { project, error: null };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

export async function getProject(projectId: string): Promise<{ project: Project | null; error: string | null }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated", project: null };
    }

    const { data: project, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      return { error: error.message, project: null };
    }

    return { project, error: null };
  } catch (error) {
    console.error("Get project error:", error);
    return { error: "Failed to fetch project", project: null };
  }
}
