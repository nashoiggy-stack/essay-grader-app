import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSuggestionsPrompt,
  SUGGESTIONS_SYSTEM_PROMPT,
  type SuggestionFocus,
} from "@/lib/suggestions-prompt";
// UNDO [opus-upgrade]: delete the ` as ANTHROPIC_MODEL` alias below to revert
// this endpoint to Sonnet — the variable name in the call site stays the same.
import { ANTHROPIC_MODEL_PREMIUM as ANTHROPIC_MODEL } from "@/lib/anthropic-model";

// Opus 4.6 can exceed 60s on long essays with the full refined-alignment
// rules. 300 is the Vercel Pro max.
export const maxDuration = 300;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { essayText, focus } = (await req.json()) as {
      essayText: string;
      focus: SuggestionFocus;
    };

    if (!essayText?.trim()) {
      return NextResponse.json({ error: "No essay text provided." }, { status: 400 });
    }

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

    let text = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if the model wrapped the JSON
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Aggressive recovery: try to extract JSON from mixed text/JSON responses.
      // The model sometimes prepends explanatory text before the JSON object.
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          // Also try extracting a bare array
          const arrMatch = text.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            try {
              parsed = { suggestions: JSON.parse(arrMatch[0]) };
            } catch {
              console.error("Failed to parse suggestions JSON after recovery:", text.slice(0, 500));
              return NextResponse.json(
                { error: "Failed to parse suggestions. Please try again." },
                { status: 500 }
              );
            }
          } else {
            console.error("Failed to parse suggestions JSON:", text.slice(0, 500));
            return NextResponse.json(
              { error: "Failed to parse suggestions. Please try again." },
              { status: 500 }
            );
          }
        }
      } else {
        console.error("No JSON found in suggestions response:", text.slice(0, 500));
        return NextResponse.json(
          { error: "Failed to parse suggestions. Please try again." },
          { status: 500 }
        );
      }
    }

    // Normalize response shape: the model should return { suggestions: [...] }
    // but might return a bare array or use different casing. Handle gracefully.
    if (Array.isArray(parsed)) {
      parsed = { suggestions: parsed };
    }
    if (!parsed.suggestions && Array.isArray(parsed.Suggestions)) {
      parsed = { suggestions: parsed.Suggestions };
    }
    // Normalize type casing — the model sometimes returns "CUT" / "REWRITE"
    if (Array.isArray(parsed.suggestions)) {
      parsed.suggestions = parsed.suggestions.map(
        (s: { type?: string; [k: string]: unknown }) => ({
          ...s,
          type: typeof s.type === "string" ? s.type.toLowerCase() : s.type,
        })
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Suggestions error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating suggestions." },
      { status: 500 }
    );
  }
}
