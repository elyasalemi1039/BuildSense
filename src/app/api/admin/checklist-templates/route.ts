import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/admin";

export async function GET() {
  const supabase = await createClient();
  
  const { data: templates, error } = await supabase
    .from("checklist_templates")
    .select(`
      *,
      checklist_template_steps(count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to include steps count
  const transformedTemplates = (templates || []).map((t: any) => ({
    ...t,
    steps_count: t.checklist_template_steps?.[0]?.count || 0,
  }));

  return NextResponse.json({ templates: transformedTemplates });
}

export async function POST(request: NextRequest) {
  const adminCheck = await isAdmin();
  if (!adminCheck) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = await createClient();
  const body = await request.json();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: template, error } = await supabase
    .from("checklist_templates")
    .insert({
      name: body.name,
      description: body.description || null,
      category: body.category || "custom",
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ template: { ...template, steps_count: 0 } });
}

