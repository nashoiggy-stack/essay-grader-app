// /api/interest-map — maps a free-text academic interest to a set of
// formal majors + program keywords via Haiku 4.5. Feeds the Pass 4 widening
// of the major-fit matcher (see src/lib/major-match.ts MajorMatchInput's
// relatedMajors / expandedKeywords fields).
//
// Behind the NEXT_PUBLIC_LLM_INTEREST_MAP flag on the client — this route
// itself is always live, but the client only calls it when the flag is on.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { withAnthropicRetry } from "@/lib/anthropic-retry";
import { ANTHROPIC_MODEL } from "@/lib/anthropic-model";
import { MAJORS } from "@/lib/college-types";

// Sonnet 4.6 — overkill for pure classification, but the quality bump on
// tricky free-text interests ("generative AI ethics", "climate adaptation
// in coastal cities") justifies the cost for a call we cache for 7 days.
// Uses the shared ANTHROPIC_MODEL constant so swapping models is a
// single-file change across every route.
const INTEREST_MAP_MODEL = ANTHROPIC_MODEL;

// Short calls, no long reasoning — 30s is plenty.
export const maxDuration = 30;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Allowlist for relatedMajors — the model is asked to only pick from this
// list, but we also filter server-side as defense-in-depth.
const MAJOR_SET = new Set(MAJORS as readonly string[]);

const RequestSchema = z.object({
  interest: z.string().min(1).max(200),
});

const ResponseSchema = z.object({
  relatedMajors: z.array(z.string()).max(4),
  keywords: z.array(z.string()).max(8),
  confidence: z.number().min(0).max(1),
});

export type InterestMapResult = z.infer<typeof ResponseSchema>;

const SYSTEM_PROMPT = `You help a college matching tool translate a student's free-text academic interest into formal majors and program keywords.

Given an INTEREST, return JSON with:
  - "relatedMajors": up to 4 entries, each copied EXACTLY (case-sensitive) from this list:
    ${JSON.stringify([...MAJORS])}
    Pick the majors a student with this interest would plausibly study. Return [] if none clearly fits. NEVER invent majors not on the list.
  - "keywords": up to 8 short terms (2-4 words each, no punctuation) that would realistically appear in a college program catalog, department name, or research area description for this interest. Aim for specific and concrete (e.g. "urban planning", "environmental policy") over generic ("policy").
  - "confidence": float in [0.0, 1.0] estimating how crisply this interest maps to known academic fields. Vague or non-academic interests ("cool stuff") score near 0; precise interests ("theoretical computer science") score near 1.

Return ONLY the JSON object. No markdown, no prose, no explanation.`;

function parseJsonResponse(raw: string): unknown {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as unknown;
    const reqParsed = RequestSchema.safeParse(body);
    if (!reqParsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Expected { interest: string } (1-200 chars)." },
        { status: 400 },
      );
    }

    const interest = reqParsed.data.interest.trim();
    if (!interest) {
      return NextResponse.json({ error: "Interest cannot be empty." }, { status: 400 });
    }

    const response = await withAnthropicRetry(() =>
      anthropic.messages.create({
        model: INTEREST_MAP_MODEL,
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `INTEREST: ${interest}` }],
      }),
    );

    const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from model." },
        { status: 502 },
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = parseJsonResponse(raw);
    } catch {
      console.error("Interest map: JSON parse failed. Raw:", raw.slice(0, 300));
      return NextResponse.json(
        { error: "Model returned invalid JSON." },
        { status: 502 },
      );
    }

    const validated = ResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.error("Interest map: schema validation failed:", validated.error.message);
      return NextResponse.json(
        { error: "Model response failed schema validation." },
        { status: 502 },
      );
    }

    // Defense-in-depth: drop any relatedMajors the model produced that aren't
    // in MAJOR_SET (prompt asks for exact match, but belt-and-suspenders).
    const result: InterestMapResult = {
      relatedMajors: validated.data.relatedMajors.filter((m) => MAJOR_SET.has(m)),
      keywords: validated.data.keywords.map((k) => k.trim()).filter((k) => k.length > 0),
      confidence: validated.data.confidence,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    let message = err instanceof Error ? err.message : String(err);
    let status = 500;
    if (err instanceof Anthropic.APIError) {
      status = err.status ?? 500;
      const body = err.error as { error?: { message?: string } } | undefined;
      message = body?.error?.message ?? err.message;
    }
    console.error("Interest map error:", message);
    return NextResponse.json(
      { error: `Failed to map interest: ${message.slice(0, 200)}` },
      { status },
    );
  }
}
