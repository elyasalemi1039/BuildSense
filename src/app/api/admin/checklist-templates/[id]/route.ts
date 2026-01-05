import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch template
  const { data: template, error: templateError } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (templateError) {
    return NextResponse.json({ error: templateError.message }, { status: 404 });
  }

  // Fetch steps with dependencies
  const { data: steps, error: stepsError } = await supabase
    .from("checklist_template_steps")
    .select(`
      *,
      dependencies:checklist_template_step_dependencies!step_id(depends_on_step_id)
    `)
    .eq("template_id", id)
    .order("sort_order");

  if (stepsError) {
    return NextResponse.json({ error: stepsError.message }, { status: 500 });
  }

  // Transform steps to include dependencies as array of IDs
  const transformedSteps = (steps || []).map((s: any) => ({
    ...s,
    dependencies: (s.dependencies || []).map((d: any) => d.depends_on_step_id),
  }));

  return NextResponse.json({ template, steps: transformedSteps });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: template, error } = await supabase
    .from("checklist_templates")
    .update({
      name: body.name,
      description: body.description,
      category: body.category,
      is_published: body.is_published,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("checklist_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

