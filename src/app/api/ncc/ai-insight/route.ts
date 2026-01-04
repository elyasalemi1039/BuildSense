import { NextRequest, NextResponse } from "next/server";

interface SearchResult {
  id: string;
  doc_type: string;
  sptc: string | null;
  title: string | null;
  jurisdiction: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { query, results } = await request.json() as { query: string; results: SearchResult[] };

    if (!query || !results?.length) {
      return NextResponse.json({ insight: null });
    }

    // Check if OpenAI is configured
    const openaiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiKey) {
      // Return a basic insight without AI
      const clauses = results
        .filter(r => r.sptc)
        .map(r => r.sptc)
        .slice(0, 5);

      return NextResponse.json({
        insight: {
          summary: `Found ${results.length} relevant clauses and specifications related to "${query}".`,
          key_points: [
            `Most results are ${results[0]?.doc_type === "clause" ? "clauses" : "specifications"}`,
            results.some(r => r.jurisdiction) 
              ? `Some results have jurisdiction-specific variations`
              : "Results apply across all jurisdictions",
          ],
          related_clauses: clauses,
        },
      });
    }

    // Use OpenAI for enhanced insights
    const context = results.map(r => 
      `${r.doc_type.toUpperCase()} ${r.sptc || ""}: ${r.title || "No title"}${r.jurisdiction ? ` (${r.jurisdiction})` : ""}`
    ).join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert on the Australian National Construction Code (NCC). 
Given a search query and matching results, provide a brief, helpful summary.
Return JSON with: summary (1-2 sentences), key_points (array of 2-3 bullet points), related_clauses (array of up to 5 SPTC codes that might be relevant).
Be concise and practical. Focus on what a builder or certifier would need to know.`,
          },
          {
            role: "user",
            content: `Search query: "${query}"

Matching results:
${context}

Provide a helpful summary.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.error("OpenAI API error:", await response.text());
      // Fallback to basic insight
      return NextResponse.json({
        insight: {
          summary: `Found ${results.length} relevant clauses related to "${query}".`,
          key_points: [],
          related_clauses: results.filter(r => r.sptc).map(r => r.sptc).slice(0, 5),
        },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    const insight = JSON.parse(content);

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("AI insight error:", error);
    return NextResponse.json(
      { insight: null, error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}

