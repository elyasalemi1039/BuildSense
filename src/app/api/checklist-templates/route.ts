import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only fetch published templates
  const { data: templates, error } = await supabase
    .from("checklist_templates")
    .select(`
      id,
      name,
      description,
      category,
      checklist_template_steps(count)
    `)
    .eq("is_published", true)
    .order("category")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform to include steps count
  const transformedTemplates = (templates || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    steps_count: t.checklist_template_steps?.[0]?.count || 0,
  }));

  return NextResponse.json({ templates: transformedTemplates });
}

