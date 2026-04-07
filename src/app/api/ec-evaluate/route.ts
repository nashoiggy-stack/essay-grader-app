import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildECEvaluatePrompt } from "@/lib/ec-prompts";
import type { ECConversation, ProfileEvaluation } from "@/lib/extracurricular-types";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      temperature: 0,
      system: "You are a college admissions extracurricular evaluator. Return only valid JSON. No markdown fences.",
      messages: [{ role: "user", content: prompt }],
    });

    const raw =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown fences if present
    const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");

    const result: ProfileEvaluation = JSON.parse(cleaned);

    return NextResponse.json({ result });
  } catch (err) {
    console.error("EC Evaluate error:", err);
    return NextResponse.json(
      { error: "Failed to evaluate activities. Please try again." },
      { status: 500 }
    );
  }
}
