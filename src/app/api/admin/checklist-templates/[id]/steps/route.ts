import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: templateId } = await params;
  const supabase = await createClient();
  const { steps } = await request.json();

  // Delete all existing steps (cascade will delete dependencies)
  await supabase
    .from("checklist_template_steps")
    .delete()
    .eq("template_id", templateId);

  if (!steps || steps.length === 0) {
    return NextResponse.json({ steps: [] });
  }

  // Insert new steps
  const stepsToInsert = steps.map((step: any, index: number) => ({
    template_id: templateId,
    name: step.name,
    description: step.description || null,
    instructions: step.instructions || null,
    ncc_clause: step.ncc_clause || null,
    requires_photo: step.requires_photo || false,
    requires_document: step.requires_document || false,
    requires_signature: step.requires_signature || false,
    estimated_duration_minutes: step.estimated_duration_minutes || null,
    failure_action: step.failure_action || "block",
    failure_email_template: step.failure_email_template || null,
    sort_order: index,
  }));

  const { data: insertedSteps, error: insertError } = await supabase
    .from("checklist_template_steps")
    .insert(stepsToInsert)
    .select();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Build ID mapping (old temp IDs to new real IDs)
  const idMapping = new Map<string, string>();
  steps.forEach((step: any, index: number) => {
    if (insertedSteps?.[index]) {
      idMapping.set(step.id, insertedSteps[index].id);
    }
  });

  // Insert dependencies
  const dependenciesToInsert: { step_id: string; depends_on_step_id: string; dependency_type: string }[] = [];
  
  steps.forEach((step: any) => {
    const newStepId = idMapping.get(step.id);
    if (!newStepId || !step.dependencies) return;
    
    step.dependencies.forEach((depId: string) => {
      const newDepId = idMapping.get(depId);
      if (newDepId) {
        dependenciesToInsert.push({
          step_id: newStepId,
          depends_on_step_id: newDepId,
          dependency_type: "must_pass",
        });
      }
    });
  });

  if (dependenciesToInsert.length > 0) {
    const { error: depError } = await supabase
      .from("checklist_template_step_dependencies")
      .insert(dependenciesToInsert);

    if (depError) {
      console.error("Failed to insert dependencies:", depError);
    }
  }

  // Fetch updated steps with dependencies
  const { data: finalSteps } = await supabase
    .from("checklist_template_steps")
    .select(`
      *,
      dependencies:checklist_template_step_dependencies!step_id(depends_on_step_id)
    `)
    .eq("template_id", templateId)
    .order("sort_order");

  const transformedSteps = (finalSteps || []).map((s: any) => ({
    ...s,
    dependencies: (s.dependencies || []).map((d: any) => d.depends_on_step_id),
  }));

  return NextResponse.json({ steps: transformedSteps });
}

