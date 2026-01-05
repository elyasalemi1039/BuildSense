import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; checklistId: string; stepId: string }> }
) {
  const { id: projectId, checklistId, stepId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await request.json();
  const { status, notes, reason, email } = body;

  // Update the step
  const updateData: any = {
    status,
    notes: notes || null,
  };

  if (status === "passed" || status === "failed") {
    updateData.completed_by = user.id;
    updateData.completed_at = new Date().toISOString();
  }

  if (status === "failed") {
    updateData.failure_reason = reason || null;
    if (email) {
      updateData.failure_notified_to = email;
      updateData.failure_notified_at = new Date().toISOString();
      // TODO: Actually send email via email service
    }
  }

  const { data: updatedStep, error: updateError } = await supabase
    .from("project_checklist_steps")
    .update(updateData)
    .eq("id", stepId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // If step passed, unblock dependent steps
  if (status === "passed") {
    // Get the template step ID to find dependencies
    const templateStepId = updatedStep.template_step_id;
    
    if (templateStepId) {
      // Find all steps in this checklist that depend on this template step
      const { data: checklistSteps } = await supabase
        .from("project_checklist_steps")
        .select("id, template_step_id, is_blocked")
        .eq("project_checklist_id", checklistId);

      // Get template dependencies
      const { data: allDependencies } = await supabase
        .from("checklist_template_step_dependencies")
        .select("step_id, depends_on_step_id");

      // For each checklist step, check if all its dependencies are now satisfied
      for (const step of checklistSteps || []) {
        if (!step.template_step_id || !step.is_blocked) continue;

        // Get dependencies for this template step
        const stepDeps = (allDependencies || [])
          .filter((d: any) => d.step_id === step.template_step_id)
          .map((d: any) => d.depends_on_step_id);

        if (stepDeps.length === 0) continue;

        // Check if all dependencies are passed
        const depChecklistSteps = (checklistSteps || []).filter((s: any) => 
          stepDeps.includes(s.template_step_id)
        );

        // Get current status of each dependency
        const { data: depStatuses } = await supabase
          .from("project_checklist_steps")
          .select("status")
          .in("id", depChecklistSteps.map((s: any) => s.id));

        const allPassed = (depStatuses || []).every((s: any) => 
          s.status === "passed" || s.status === "skipped"
        );

        if (allPassed) {
          // Unblock this step
          await supabase
            .from("project_checklist_steps")
            .update({ 
              is_blocked: false, 
              blocked_reason: null 
            })
            .eq("id", step.id);
        }
      }
    }
  }

  // Update checklist status based on steps
  const { data: allSteps } = await supabase
    .from("project_checklist_steps")
    .select("status")
    .eq("project_checklist_id", checklistId);

  const stepStatuses = (allSteps || []).map((s: any) => s.status);
  let checklistStatus = "not_started";
  
  if (stepStatuses.every((s: string) => s === "passed" || s === "skipped")) {
    checklistStatus = "completed";
  } else if (stepStatuses.some((s: string) => s === "failed")) {
    checklistStatus = "blocked";
  } else if (stepStatuses.some((s: string) => s !== "pending")) {
    checklistStatus = "in_progress";
  }

  await supabase
    .from("project_checklists")
    .update({ 
      status: checklistStatus,
      started_at: checklistStatus !== "not_started" ? new Date().toISOString() : null,
      completed_at: checklistStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", checklistId);

  return NextResponse.json({ step: updatedStep });
}

