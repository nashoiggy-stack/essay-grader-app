"use client";

import React from "react";
import { GapItem } from "@/components/GapItem";
import type { StrategyAnalysis, StrategyResult } from "@/lib/strategy-types";

export function GapsBody({
  result,
  analysis,
}: {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
}) {
  // Pair analyzer weakness flags with LLM bullets by index when available.
  const llmBullets = result.weaknessDiagnosis.bullets ?? [];
  return (
    <div className="space-y-3 pt-3">
      {result.weaknessDiagnosis.body && (
        <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
          {result.weaknessDiagnosis.body}
        </p>
      )}
      <div className="space-y-2">
        {analysis.weaknesses.map((w, i) => (
          <GapItem key={w.code} flag={w} fixSuggestion={llmBullets[i] ?? null} />
        ))}
      </div>
    </div>
  );
}
