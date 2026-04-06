import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSuggestionsPrompt,
  SUGGESTIONS_SYSTEM_PROMPT,
  type SuggestionFocus,
} from "@/lib/suggestions-prompt";

export const maxDuration = 60;
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
      model: "claude-sonnet-4-6",
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
      console.error("Failed to parse suggestions JSON:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse suggestions. Please try again." },
        { status: 500 }
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
