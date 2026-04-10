import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  buildSingleActivityPrompt,
  buildProfileSynthesisPrompt,
} from "@/lib/ec-prompts";
import type {
  ECConversation,
  ActivityEvaluation,
  ProfileEvaluation,
} from "@/lib/extracurricular-types";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT =
  "You are a college admissions extracurricular evaluator. Return only valid JSON. No markdown fences.";

/**
 * Parse JSON response, stripping markdown fences if present.
 * Throws on invalid JSON.
 */
function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as T;
}

/**
 * Evaluate a single activity. Returns the parsed ActivityEvaluation.
 */
async function evaluateActivity(
  conv: ECConversation
): Promise<ActivityEvaluation> {
  const prompt = buildSingleActivityPrompt(conv);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const raw =
    response.content[0].type === "text" ? response.content[0].text : "";

  if (response.stop_reason === "max_tokens") {
    throw new Error(
      `Activity "${conv.title}" response truncated. The description may be too long.`
    );
  }

  return parseJsonResponse<ActivityEvaluation>(raw);
}

/**
 * Synthesize profile-level evaluation from pre-scored activities.
 */
async function synthesizeProfile(
  activities: ActivityEvaluation[]
): Promise<Omit<ProfileEvaluation, "activities">> {
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
    throw new Error("Profile synthesis response truncated.");
  }

  return parseJsonResponse<Omit<ProfileEvaluation, "activities">>(raw);
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

    // Step 1: Evaluate all activities in parallel.
    // Each call is ~5-15s; running in parallel keeps total latency close
    // to the slowest single call, not the sum.
    const activityResults = await Promise.allSettled(
      conversations.map((conv) => evaluateActivity(conv))
    );

    const activities: ActivityEvaluation[] = [];
    const failures: string[] = [];

    for (let i = 0; i < activityResults.length; i++) {
      const result = activityResults[i];
      if (result.status === "fulfilled") {
        activities.push(result.value);
      } else {
        const convTitle = conversations[i].title;
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        console.error(`Activity "${convTitle}" failed:`, reason);
        failures.push(`"${convTitle}": ${reason.slice(0, 80)}`);
      }
    }

    // If more than half the activities failed, abort.
    if (activities.length === 0) {
      return NextResponse.json(
        {
          error: `All activities failed to evaluate. ${failures[0] ?? "Unknown error."}`,
        },
        { status: 500 }
      );
    }

    if (failures.length > conversations.length / 2) {
      return NextResponse.json(
        {
          error: `${failures.length} of ${conversations.length} activities failed. Please try again.`,
        },
        { status: 500 }
      );
    }

    // Step 2: Synthesize profile-level evaluation from the scored activities.
    const profile = await synthesizeProfile(activities);

    const result: ProfileEvaluation = {
      activities,
      ...profile,
    };

    // If any activities failed but we succeeded overall, include a warning.
    if (failures.length > 0) {
      return NextResponse.json({
        result,
        warning: `${failures.length} activit${failures.length === 1 ? "y" : "ies"} could not be evaluated and ${failures.length === 1 ? "was" : "were"} skipped.`,
      });
    }

    return NextResponse.json({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("EC Evaluate error:", message);
    return NextResponse.json(
      {
        error: `Failed to evaluate activities: ${message.slice(0, 120)}. Please try again.`,
      },
      { status: 500 }
    );
  }
}
