import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/lib/supabase/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "OpenAI API key not configured",
        summary: null 
      }, { status: 200 });
    }

    const supabase = await createClient();

    // Get document with related xml_object
    const { data: document, error: docError } = await (supabase as AnySupabase)
      .from("ncc_document")
      .select(`
        id,
        doc_type,
        sptc,
        title,
        jurisdiction,
        ncc_xml_object (
          raw_xml
        )
      `)
      .eq("id", id)
      .single();

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found", summary: null }, { status: 404 });
    }

    const rawXml = document.ncc_xml_object?.raw_xml || "";
    
    // Extract key content from XML for AI
    const title = extractText(rawXml, "title") || document.title || "Untitled";
    const shortDesc = extractText(rawXml, "shortdesc") || "";
    const bodyText = extractBodyText(rawXml);
    
    // Truncate to reasonable size for API
    const truncatedBody = bodyText.slice(0, 4000);
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `You are an expert on the Australian National Construction Code (NCC). Analyze this NCC clause and provide a comprehensive summary.

CLAUSE: ${document.sptc || ""}
TITLE: ${title}
TYPE: ${document.doc_type}
${document.jurisdiction ? `JURISDICTION: ${document.jurisdiction}` : ""}

DESCRIPTION: ${shortDesc}

CONTENT:
${truncatedBody}

Provide a JSON response with:
1. "summary": A clear 2-3 sentence summary of what this clause covers and its purpose
2. "key_requirements": Array of 3-5 specific requirements or rules this clause establishes
3. "applies_to": Array of building types, situations, or professionals this applies to
4. "related_topics": Array of 3-5 related NCC topics or clauses to consider
5. "compliance_notes": Array of 2-3 practical compliance tips for builders/certifiers
6. "importance": "critical" | "high" | "medium" | "low" - how critical this is for safety/compliance

Be specific and practical. Focus on what builders and building certifiers need to know.`;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = completion.choices[0].message.content;
    const summary = content ? JSON.parse(content) : null;

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Document summary API error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary", summary: null },
      { status: 500 }
    );
  }
}

function extractText(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(regex);
  if (!match) return "";
  return stripTags(match[1]).trim();
}

function extractBodyText(xml: string): string {
  // Try to get body or conbody content
  let bodyMatch = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) {
    bodyMatch = xml.match(/<conbody[^>]*>([\s\S]*?)<\/conbody>/i);
  }
  if (!bodyMatch) return "";
  
  return stripTags(bodyMatch[1]);
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

