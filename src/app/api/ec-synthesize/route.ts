import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildProfileSynthesisPrompt } from "@/lib/ec-prompts";
import type {
  ActivityEvaluation,
  ProfileEvaluation,
} from "@/lib/extracurricular-types";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a college admissions extracurricular evaluator. Return only valid JSON. No markdown fences.";

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

export async function POST(req: NextRequest) {
  try {
    const { activities } = (await req.json()) as {
      activities: ActivityEvaluation[];
    };

    if (!activities?.length) {
      return NextResponse.json(
        { error: "No scored activities to synthesize." },
        { status: 400 }
      );
    }

    const summaries = activities.map((a) => ({
      activityName: a.activityName,
      category: a.category,
      tier: a.tier,
      scores: a.scores,
    }));

    const prompt = buildProfileSynthesisPrompt(summaries);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    if (response.stop_reason === "max_tokens") {
      return NextResponse.json(
        { error: "Profile synthesis response truncated." },
        { status: 500 }
      );
    }

    let profile: Omit<ProfileEvaluation, "activities">;
    try {
      profile = parseJsonResponse<Omit<ProfileEvaluation, "activities">>(raw);
    } catch (parseErr) {
      console.error("Synthesis JSON parse error:", parseErr);
      return NextResponse.json(
        { error: "The synthesizer returned malformed data. Please try again." },
        { status: 500 }
      );
    }

    const result: ProfileEvaluation = {
      activities,
      ...profile,
    };

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("EC Synthesize error:", message);
    return NextResponse.json(
      { error: `Failed to synthesize profile: ${message.slice(0, 120)}` },
      { status: 500 }
    );
  }
}
