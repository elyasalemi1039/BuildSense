import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      *,
      project_checklists(
        id,
        status
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to include checklist counts
  const transformedProjects = (projects || []).map((p: any) => {
    const checklists = p.project_checklists || [];
    return {
      ...p,
      checklists_count: checklists.length,
      completed_checklists: checklists.filter((c: any) => c.status === "completed").length,
    };
  });

  return NextResponse.json({ projects: transformedProjects });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (!profile || profile.subscription_tier === "free") {
    return NextResponse.json({ 
      error: "Pro subscription required to create projects" 
    }, { status: 403 });
  }

  const body = await request.json();

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: body.name,
      description: body.description || null,
      address: body.address || null,
      project_type: body.project_type || null,
      building_class: body.building_class || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ project: { ...project, checklists_count: 0, completed_checklists: 0 } });
}

