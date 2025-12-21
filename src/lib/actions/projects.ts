"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function getProjects() {
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

export async function createProject(data: {
  name: string;
  address?: string;
  building_class?: string;
  description?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: data.name,
        address: data.address,
        building_class: data.building_class,
        description: data.description,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return { error: error.message };
    }

    revalidatePath("/projects");
    return { project, error: null };
  } catch (error) {
    console.error("Create project error:", error);
    return { error: "Failed to create project" };
  }
}

