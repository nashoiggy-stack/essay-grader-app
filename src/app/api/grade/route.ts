import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GRADING_SYSTEM_PROMPT } from "@/lib/prompts";
import type { GradingResult } from "@/lib/types";

export const maxDuration = 60;
export const runtime = "nodejs";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function computeAdjustedScore(
  rawScore: number,
  words: number
): { adjustedScore: number; penalty: number } {
  if (words >= 480 && words <= 650) return { adjustedScore: rawScore, penalty: 0 };
  const distance = words < 480 ? 480 - words : words - 650;
  // Penalty scales: up to ~15 points off for being 200+ words out of range
  const penalty = Math.min(Math.round((distance / 200) * 15), 15);
  return { adjustedScore: Math.max(0, rawScore - penalty), penalty };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let essayText = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const pasted = formData.get("text") as string | null;

      if (file && file.size > 0) {
        const { parseUploadedFile } = await import("@/lib/parse-file");
        const parsed = await parseUploadedFile(file);
        if (!parsed.ok) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        essayText = parsed.text;
      } else if (pasted && pasted.trim()) {
        essayText = pasted.trim();
      }
    } else {
      const body = await req.json();
      essayText = (body.text || "").trim();
    }

    if (!essayText) {
      return NextResponse.json(
        { error: "No essay text provided. Please paste your essay or upload a PDF/Doc file." },
        { status: 400 }
      );
    }

    const words = wordCount(essayText);

    if (words < 50) {
      return NextResponse.json(
        {
          error: `Your essay is only ${words} words — that's too short to grade meaningfully. Common App essays are typically 480-650 words. Add more content and try again.`,
        },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      temperature: 0,
      system: GRADING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Grade this ${words}-word Common App essay. Be concise in feedback (2 sentences max per criterion). Respond with JSON only, no explanation.\n\n---\n${essayText}\n---`,
        },
      ],
    });

    let responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Strip markdown code fences if the model wrapped the JSON
    responseText = responseText.trim();
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse grading JSON:", responseText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse grading response. Please try again." },
        { status: 500 }
      );
    }

    // Compute raw score (average of 7 Common App criteria)
    const commonScores = Object.values(parsed.commonApp) as { score: number }[];
    const rawScore = Math.round(
      commonScores.reduce((sum, c) => sum + c.score, 0) / commonScores.length
    );

    // Compute VSPICE composite (average of 6 dimensions, kept on 1-4 scale)
    const vspiceScores = Object.values(parsed.vspice) as { score: number }[];
    const vspiceComposite =
      Math.round(
        (vspiceScores.reduce((sum, c) => sum + c.score, 0) / vspiceScores.length) *
          100
      ) / 100;

    // Adjusted score with word count penalty
    const { adjustedScore, penalty } = computeAdjustedScore(rawScore, words);

    const result: GradingResult = {
      ...parsed,
      wordCount: words,
      rawScore,
      adjustedScore,
      wordCountPenalty: penalty,
      vspiceComposite,
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Grading error:", message);
    return NextResponse.json(
      { error: `Grading failed: ${message}` },
      { status: 500 }
    );
  }
}
