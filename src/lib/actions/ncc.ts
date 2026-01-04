"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { isValidEditionKind, isValidJurisdiction } from "@/lib/constants/ncc-options";
import type { 
  NCCEdition, 
  NCCEditionInsert, 
  NCCIngestionJob, 
  NCCNode,
  NCCActiveRuleset 
} from "@/types/ncc.types";

// Helper for NCC tables that aren't in generated types yet
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================
// EDITIONS
// ============================================

export async function getEditions(): Promise<{ editions: NCCEdition[]; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: editions, error } = await supabase
      .from("ncc_editions")
      .select("*")
      .order("effective_date", { ascending: false }) as { data: NCCEdition[] | null; error: any };

    if (error) {
      return { editions: [], error: error.message };
    }

    return { editions: editions || [], error: null };
  } catch (error) {
    console.error("Get editions error:", error);
    return { editions: [], error: error instanceof Error ? error.message : "Failed to fetch editions" };
  }
}

export async function getEdition(id: string): Promise<{ edition: NCCEdition | null; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: edition, error } = await supabase
      .from("ncc_editions")
      .select("*")
      .eq("id", id)
      .single() as { data: NCCEdition | null; error: any };

    if (error) {
      return { edition: null, error: error.message };
    }

    return { edition, error: null };
  } catch (error) {
    console.error("Get edition error:", error);
    return { edition: null, error: error instanceof Error ? error.message : "Failed to fetch edition" };
  }
}

export async function createEdition(data: {
  name: string;
  kind: string;
  effective_date: string;
  jurisdiction?: string;
  applies_to_base_edition_id?: string;
}): Promise<{ edition: NCCEdition | null; error: string | null }> {
  try {
    const { userId } = await requireAdmin();
    const supabase = await createClient();

    // Validate inputs
    if (!data.name || data.name.trim().length < 3) {
      return { edition: null, error: "Edition name must be at least 3 characters" };
    }

    if (!isValidEditionKind(data.kind)) {
      return { edition: null, error: "Invalid edition kind" };
    }

    if (data.jurisdiction && !isValidJurisdiction(data.jurisdiction)) {
      return { edition: null, error: "Invalid jurisdiction" };
    }

    if (data.kind === "OVERLAY" && !data.applies_to_base_edition_id) {
      return { edition: null, error: "Overlay editions require a base edition" };
    }

    const insertData: NCCEditionInsert = {
      name: data.name.trim(),
      kind: data.kind as NCCEditionInsert["kind"],
      effective_date: data.effective_date,
      jurisdiction: data.jurisdiction as NCCEditionInsert["jurisdiction"] ?? null,
      applies_to_base_edition_id: data.applies_to_base_edition_id ?? null,
      status: "draft",
      created_by: userId,
    };

    const { data: edition, error } = await supabase
      .from("ncc_editions")
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error("Create edition error:", error);
      return { edition: null, error: error.message };
    }

    revalidatePath("/admin/ncc");
    return { edition, error: null };
  } catch (error) {
    console.error("Create edition error:", error);
    return { edition: null, error: error instanceof Error ? error.message : "Failed to create edition" };
  }
}

export async function deleteEdition(id: string): Promise<{ error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // Check if edition is published
    const { data: edition } = await supabase
      .from("ncc_editions")
      .select("status")
      .eq("id", id)
      .single() as { data: { status: string } | null; error: any };

    if (edition?.status === "published") {
      return { error: "Cannot delete a published edition" };
    }

    const { error } = await supabase
      .from("ncc_editions")
      .delete()
      .eq("id", id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/admin/ncc");
    return { error: null };
  } catch (error) {
    console.error("Delete edition error:", error);
    return { error: error instanceof Error ? error.message : "Failed to delete edition" };
  }
}

// ============================================
// JOBS
// ============================================

export async function getJobs(editionId: string): Promise<{ jobs: NCCIngestionJob[]; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from("ncc_ingestion_jobs")
      .select("*")
      .eq("edition_id", editionId)
      .order("created_at", { ascending: false }) as { data: NCCIngestionJob[] | null; error: any };

    if (error) {
      return { jobs: [], error: error.message };
    }

    return { jobs: jobs || [], error: null };
  } catch (error) {
    console.error("Get jobs error:", error);
    return { jobs: [], error: error instanceof Error ? error.message : "Failed to fetch jobs" };
  }
}

export async function getLatestJob(editionId: string, jobType: string): Promise<{ job: NCCIngestionJob | null; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: job, error } = await supabase
      .from("ncc_ingestion_jobs")
      .select("*")
      .eq("edition_id", editionId)
      .eq("job_type", jobType)
      .order("created_at", { ascending: false })
      .limit(1)
      .single() as { data: NCCIngestionJob | null; error: any };

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows
      return { job: null, error: error.message };
    }

    return { job: job || null, error: null };
  } catch (error) {
    console.error("Get latest job error:", error);
    return { job: null, error: error instanceof Error ? error.message : "Failed to fetch job" };
  }
}

// ============================================
// NODES (for browsing)
// ============================================

export async function getNodes(
  editionId: string, 
  parentId: string | null = null,
  limit = 100
): Promise<{ nodes: NCCNode[]; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    let query = supabase
      .from("ncc_nodes")
      .select("*")
      .eq("edition_id", editionId)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (parentId === null) {
      query = query.is("parent_id", null);
    } else {
      query = query.eq("parent_id", parentId);
    }

    const { data: nodes, error } = await query as { data: NCCNode[] | null; error: any };

    if (error) {
      return { nodes: [], error: error.message };
    }

    return { nodes: nodes || [], error: null };
  } catch (error) {
    console.error("Get nodes error:", error);
    return { nodes: [], error: error instanceof Error ? error.message : "Failed to fetch nodes" };
  }
}

export async function searchNodes(
  editionId: string,
  searchQuery: string,
  limit = 50
): Promise<{ nodes: NCCNode[]; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: nodes, error } = await supabase
      .from("ncc_nodes")
      .select("*")
      .eq("edition_id", editionId)
      .textSearch("search_tsv", searchQuery)
      .limit(limit) as { data: NCCNode[] | null; error: any };

    if (error) {
      return { nodes: [], error: error.message };
    }

    return { nodes: nodes || [], error: null };
  } catch (error) {
    console.error("Search nodes error:", error);
    return { nodes: [], error: error instanceof Error ? error.message : "Failed to search nodes" };
  }
}

// ============================================
// ACTIVE RULESETS
// ============================================

export async function getActiveRulesets(): Promise<{ rulesets: NCCActiveRuleset[]; error: string | null }> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data: rulesets, error } = await supabase
      .from("ncc_active_rulesets")
      .select("*")
      .order("jurisdiction", { ascending: true }) as { data: NCCActiveRuleset[] | null; error: any };

    if (error) {
      return { rulesets: [], error: error.message };
    }

    return { rulesets: rulesets || [], error: null };
  } catch (error) {
    console.error("Get active rulesets error:", error);
    return { rulesets: [], error: error instanceof Error ? error.message : "Failed to fetch active rulesets" };
  }
}

// ============================================
// PUBLISH
// ============================================

export async function publishEdition(editionId: string): Promise<{ error: string | null }> {
  try {
    const { userId } = await requireAdmin();
    const supabase = await createClient();

    // Get the edition
    const { data: edition, error: getError } = await supabase
      .from("ncc_editions")
      .select("*")
      .eq("id", editionId)
      .single() as { data: NCCEdition | null; error: any };

    if (getError || !edition) {
      return { error: "Edition not found" };
    }

    // Check if edition is already published
    if (edition.status === "published") {
      return { error: "Edition is already published" };
    }

    // For the new pipeline: check if all ingest runs are done
    const { data: ingestRuns, error: runsError } = await (supabase as AnySupabase)
      .from("ncc_ingest_run")
      .select("id, status")
      .eq("edition", editionId);

    if (runsError) {
      return { error: "Failed to check ingest runs" };
    }

    // Must have at least one ingest run
    if (!ingestRuns || ingestRuns.length === 0) {
      return { error: "No files have been uploaded. Please upload NCC files first." };
    }

    // All runs must be done
    const notDone = ingestRuns.filter((r: { status: string }) => r.status !== "done");
    if (notDone.length > 0) {
      const statuses = notDone.map((r: { status: string }) => r.status).join(", ");
      return { error: `All ingest runs must be completed. ${notDone.length} run(s) still pending: ${statuses}` };
    }

    // Start a transaction-like operation
    // 1. Update edition status to published
    const { error: updateError } = await (supabase as AnySupabase)
      .from("ncc_editions")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", editionId);

    if (updateError) {
      return { error: updateError.message };
    }

    // 2. Update or create active ruleset
    if (edition.kind === "BASE") {
      // Check if there's an existing default ruleset
      const { data: existing } = await supabase
        .from("ncc_active_rulesets")
        .select("id")
        .is("jurisdiction", null)
        .eq("is_default", true)
        .single() as { data: { id: string } | null; error: any };

      if (existing) {
        // Archive the old base edition and update the ruleset
        const { data: oldRuleset } = await supabase
          .from("ncc_active_rulesets")
          .select("base_edition_id")
          .eq("id", existing.id)
          .single() as { data: { base_edition_id: string } | null; error: any };

        if (oldRuleset) {
          await (supabase as AnySupabase)
            .from("ncc_editions")
            .update({ status: "archived" })
            .eq("id", oldRuleset.base_edition_id);
        }

        await (supabase as AnySupabase)
          .from("ncc_active_rulesets")
          .update({
            base_edition_id: editionId,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq("id", existing.id);
      } else {
        // Create new default ruleset
        await supabase
          .from("ncc_active_rulesets")
          .insert({
            base_edition_id: editionId,
            jurisdiction: null,
            is_default: true,
            updated_by: userId,
          } as any);
      }
    } else if (edition.kind === "OVERLAY" && edition.jurisdiction) {
      // Update or create jurisdiction-specific ruleset
      const { data: existingOverlay } = await supabase
        .from("ncc_active_rulesets")
        .select("id, overlay_ids")
        .eq("jurisdiction", edition.jurisdiction)
        .single() as { data: { id: string; overlay_ids: string[] | null } | null; error: any };

      if (existingOverlay) {
        const newOverlayIds = [...(existingOverlay.overlay_ids || []), editionId];
        await (supabase as AnySupabase)
          .from("ncc_active_rulesets")
          .update({
            overlay_ids: newOverlayIds,
            updated_at: new Date().toISOString(),
            updated_by: userId,
          })
          .eq("id", existingOverlay.id);
      }
      // Note: If no ruleset exists for this jurisdiction, the overlay won't be attached
      // This is intentional - a base ruleset should exist first
    }

    // 3. Create a PUBLISH job record
    await supabase
      .from("ncc_ingestion_jobs")
      .insert({
        edition_id: editionId,
        job_type: "PUBLISH",
        status: "success",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        logs: `Edition published successfully at ${new Date().toISOString()}`,
        created_by: userId,
      } as any);

    revalidatePath("/admin/ncc");
    revalidatePath(`/admin/ncc/${editionId}`);
    return { error: null };
  } catch (error) {
    console.error("Publish edition error:", error);
    return { error: error instanceof Error ? error.message : "Failed to publish edition" };
  }
}

