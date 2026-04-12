import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSuggestionsPrompt,
  SUGGESTIONS_SYSTEM_PROMPT,
  FILTER_SYSTEM_PROMPT,
  type SuggestionFocus,
} from "@/lib/suggestions-prompt";
// UNDO [opus-upgrade]: delete the ` as ANTHROPIC_MODEL` alias below to revert
// this endpoint to Sonnet — the variable name in the call site stays the same.
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";

// Opus 4.6 can exceed 60s on long essays with the full refined-alignment
// rules. Two-stage pipeline (Opus generate + Opus filter) needs headroom.
// 300 is the Vercel Pro max.
export const maxDuration = 300;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── JSON repair & parse helpers ─────────────────────────────────────────
// Shared across Stage 1 and Stage 2 parsing.

function repairJson(raw: string): string {
  let s = raw;
  s = s.replace(/,\s*([}\]])/g, "$1");
  s = s.replace(/"([^"]*?)"/g, (_match, inner: string) =>
    `"${inner.replace(/\n/g, "\\n")}"`
  );
  return s;
}

function tryParse(s: string): unknown | null {
  try { return JSON.parse(s); } catch { return null; }
}

interface Suggestion {
  type: string;
  original: string;
  replacement: string;
  reason: string;
}

/** Extract and normalize a suggestions payload from raw model text. */
function extractSuggestions(raw: string): { suggestions: Suggestion[] } {
  let text = raw.trim();

  // Strip markdown code fences
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any = tryParse(text);

  if (parsed === null) parsed = tryParse(repairJson(text));

  if (parsed === null) {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) parsed = tryParse(objMatch[0]) ?? tryParse(repairJson(objMatch[0]));
  }

  if (parsed === null) {
    const arrMatch = text.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const arr = tryParse(arrMatch[0]) ?? tryParse(repairJson(arrMatch[0]));
      if (arr !== null) parsed = { suggestions: arr };
    }
  }

  if (parsed === null) {
    console.error("All JSON parse attempts failed:", text.slice(0, 500));
    return { suggestions: [] };
  }

  // Normalize shape
  if (Array.isArray(parsed)) parsed = { suggestions: parsed };
  if (!parsed.suggestions && Array.isArray(parsed.Suggestions)) {
    parsed = { suggestions: parsed.Suggestions };
  }

  // Normalize type casing
  if (Array.isArray(parsed.suggestions)) {
    parsed.suggestions = parsed.suggestions.map(
      (s: { type?: string; [k: string]: unknown }) => ({
        ...s,
        type: typeof s.type === "string" ? s.type.toLowerCase() : s.type,
      })
    );
  }

  return { suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [] };
}

// ── Stage 1: Generate suggestions ───────────────────────────────────────

async function generateSuggestions(essayText: string, focus: SuggestionFocus): Promise<Suggestion[]> {
  const focusPrompt = buildSuggestionsPrompt(focus);

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: `${SUGGESTIONS_SYSTEM_PROMPT}\n\n${focusPrompt}`,
    messages: [
      {
        role: "user",
        content: `Here is the essay to analyze. Generate inline suggestions focused on "${focus}".\n\n---\n${essayText}\n---`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractSuggestions(text).suggestions;
}

// ── Stage 2: Filter suggestions ─────────────────────────────────────────
// Uses Opus to validate and prune Stage 1 output — nuanced cross-category
// judgment benefits from the strongest model.

async function filterSuggestions(essayText: string, stage1: Suggestion[]): Promise<Suggestion[]> {
  if (stage1.length === 0) return [];

  const message = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    temperature: 0,
    system: FILTER_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `ORIGINAL ESSAY:\n---\n${essayText}\n---\n\nCANDIDATE SUGGESTIONS:\n${JSON.stringify({ suggestions: stage1 }, null, 2)}\n\nReturn only the suggestions that pass validation. Same JSON format.`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return extractSuggestions(text).suggestions;
}

// ── Route handler ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { essayText, focus } = (await req.json()) as {
      essayText: string;
      focus: SuggestionFocus;
    };

    if (!essayText?.trim()) {
      return NextResponse.json({ error: "No essay text provided." }, { status: 400 });
    }

    // Stage 1: Generate
    const stage1 = await generateSuggestions(essayText, focus);

    // Stage 2: Filter (with fallback)
    let finalSuggestions: Suggestion[];
    try {
      const filtered = await filterSuggestions(essayText, stage1);

      if (filtered.length > 0) {
        finalSuggestions = filtered;
      } else {
        // Stage 2 returned empty — fallback to top 6 from Stage 1
        finalSuggestions = stage1.slice(0, 6);
      }
    } catch (filterErr) {
      // Stage 2 failed entirely — fallback to Stage 1 output
      console.error("Stage 2 filter failed, using Stage 1 output:", filterErr);
      finalSuggestions = stage1;
    }

    return NextResponse.json({ suggestions: finalSuggestions });
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating suggestions." },
      { status: 500 }
    );
  }
}
