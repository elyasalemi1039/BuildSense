import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (projectError) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch checklists with steps
  const { data: checklists, error: checklistsError } = await supabase
    .from("project_checklists")
    .select(`
      *,
      steps:project_checklist_steps(
        *,
        attachments:project_checklist_attachments(*)
      )
    `)
    .eq("project_id", id)
    .order("created_at", { ascending: true });

  if (checklistsError) {
    return NextResponse.json({ error: checklistsError.message }, { status: 500 });
  }

  // Sort steps by sort_order
  const sortedChecklists = (checklists || []).map((c: any) => ({
    ...c,
    steps: (c.steps || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
  }));

  return NextResponse.json({ project, checklists: sortedChecklists });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: project, error } = await supabase
    .from("projects")
    .update({
      name: body.name,
      description: body.description,
      address: body.address,
      project_type: body.project_type,
      building_class: body.building_class,
      status: body.status,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

