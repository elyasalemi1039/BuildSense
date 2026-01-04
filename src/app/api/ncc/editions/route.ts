import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get published editions
    const { data: editions, error } = await supabase
      .from("ncc_editions")
      .select("id, name, effective_date, jurisdiction")
      .eq("status", "published")
      .order("effective_date", { ascending: false }) as { 
        data: { id: string; name: string; effective_date: string; jurisdiction: string | null }[] | null; 
        error: any 
      };

    if (error) {
      console.error("Failed to fetch editions:", error);
      return NextResponse.json({ editions: [], error: error.message }, { status: 500 });
    }

    return NextResponse.json({ editions: editions || [] });
  } catch (error) {
    console.error("Editions API error:", error);
    return NextResponse.json(
      { editions: [], error: "Failed to fetch editions" },
      { status: 500 }
    );
  }
}

