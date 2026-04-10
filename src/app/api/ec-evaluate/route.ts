import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildECEvaluatePrompt } from "@/lib/ec-prompts";
import type { ECConversation, ProfileEvaluation } from "@/lib/extracurricular-types";

export const maxDuration = 120;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Each activity in the JSON response consumes roughly 400-500 tokens
// (name, category, tier, tierExplanation, 4 scores, highlights[], improvements[]).
// Profile-level fields add another ~1000. Budget generously.
const TOKENS_PER_ACTIVITY = 600;
const PROFILE_OVERHEAD_TOKENS = 1500;
const MIN_TOKENS = 4000;
const MAX_TOKENS_CAP = 16000;

function computeMaxTokens(activityCount: number): number {
  const estimated = PROFILE_OVERHEAD_TOKENS + activityCount * TOKENS_PER_ACTIVITY;
  return Math.min(MAX_TOKENS_CAP, Math.max(MIN_TOKENS, estimated));
}

export async function POST(req: NextRequest) {
  try {
    const { conversations } = (await req.json()) as {
      conversations: ECConversation[];
    };

    if (!conversations?.length) {
      return NextResponse.json(
        { error: "No activities to evaluate." },
        { status: 400 }
      );
    }

    const prompt = buildECEvaluatePrompt(conversations);
    const maxTokens = computeMaxTokens(conversations.length);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      temperature: 0,
      system: "You are a college admissions extracurricular evaluator. Return only valid JSON. No markdown fences.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Warn if we hit the token ceiling — response was likely truncated
    if (response.stop_reason === "max_tokens") {
      console.error(
        `EC Evaluate: response truncated at ${maxTokens} tokens for ${conversations.length} activities. Raw length: ${raw.length}`
      );
      return NextResponse.json(
        {
          error:
            "Evaluation response was too long. Try evaluating fewer activities at once, or shorten your longest activity descriptions.",
        },
        { status: 500 }
      );
    }

    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    let result: ProfileEvaluation;
    try {
      result = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("EC Evaluate JSON parse error:", parseErr);
      console.error("Raw response (first 500 chars):", cleaned.slice(0, 500));
      console.error("Raw response (last 500 chars):", cleaned.slice(-500));
      return NextResponse.json(
        {
          error:
            "The evaluator returned malformed data. Please try again — this usually resolves on retry.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("EC Evaluate error:", message);
    return NextResponse.json(
      {
        error: `Failed to evaluate activities: ${message.slice(0, 100)}. Please try again.`,
      },
      { status: 500 }
    );
  }
}
