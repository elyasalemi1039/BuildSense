import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
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

  const { templateId } = await request.json();

  // Fetch template and steps
  const { data: template, error: templateError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", templateId)
    .eq("is_published", true)
    .single();

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const { data: templateSteps } = await supabase
    .from("checklist_template_steps")
    .select(`
      *,
      dependencies:checklist_template_step_dependencies!step_id(depends_on_step_id)
    `)
    .eq("template_id", templateId)
    .order("sort_order");

  // Create project checklist
  const { data: checklist, error: checklistError } = await supabase
    .from("project_checklists")
    .insert({
      project_id: projectId,
      template_id: templateId,
      name: template.name,
      description: template.description,
      status: "not_started",
      created_by: user.id,
    })
    .select()
    .single();

  if (checklistError) {
    return NextResponse.json({ error: checklistError.message }, { status: 500 });
  }

  // Create checklist steps
  if (templateSteps && templateSteps.length > 0) {
    const stepsToInsert = templateSteps.map((step: any) => {
      // Check if this step has dependencies that block it initially
      const hasDependencies = step.dependencies && step.dependencies.length > 0;
      
      return {
        project_checklist_id: checklist.id,
        template_step_id: step.id,
        name: step.name,
        description: step.description,
        instructions: step.instructions,
        ncc_clause: step.ncc_clause,
        status: "pending",
        is_blocked: hasDependencies,
        blocked_reason: hasDependencies ? "Waiting for previous steps to complete" : null,
        sort_order: step.sort_order,
      };
    });

    const { error: stepsError } = await supabase
      .from("project_checklist_steps")
      .insert(stepsToInsert);

    if (stepsError) {
      console.error("Failed to create checklist steps:", stepsError);
    }
  }

  return NextResponse.json({ checklist });
}

