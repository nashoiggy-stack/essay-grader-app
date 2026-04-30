"use client";

import React from "react";
import type { ChanceBreakdown, WhatIfScenario } from "@/lib/admissions";
import type { Classification } from "@/lib/college-types";

const TIER_TONE: Record<Classification, string> = {
  safety:       "text-emerald-400",
  likely:       "text-blue-400",
  target:       "text-amber-400",
  reach:        "text-orange-400",
  unlikely:     "text-red-500",
  insufficient: "text-zinc-500",
};

const TIER_LABEL: Record<Classification, string> = {
  safety:       "Safety",
  likely:       "Likely",
  target:       "Target",
  reach:        "Reach",
  unlikely:     "Unlikely",
  insufficient: "Insufficient data",
};

interface BreakdownPanelProps {
  readonly breakdown: ChanceBreakdown;
  readonly whatIfs?: readonly WhatIfScenario[];
}

// Renders the multiplier-stack trace as an accumulating list. Each row shows
// the layer, its multiplier, and the running chance after applying it. The
// what-if scenarios appear below the stack so users can see how malleable
// their position is.
export const BreakdownPanel: React.FC<BreakdownPanelProps> = ({
  breakdown,
  whatIfs = [],
}) => {
  const baseDisplay = round1(breakdown.baseRate);
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2">
          How we got here
        </h4>
        <div className="rounded-lg bg-[#0a0a14]/70 border border-white/[0.04] divide-y divide-white/[0.04]">
          {/* Base row */}
          <div className="px-3 py-2.5 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-zinc-200 font-medium">Base</div>
              <div className="text-[11px] text-zinc-500 truncate">{breakdown.baseLabel}</div>
            </div>
            <div className="text-[14px] font-mono tabular-nums text-zinc-300 shrink-0">
              {baseDisplay}%
            </div>
          </div>
          {/* Step rows */}
          {breakdown.steps.map((step, i) => (
            <div key={i} className="px-3 py-2.5 flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] text-zinc-200">
                  <span className="text-zinc-500 mr-2">×</span>
                  {step.label}
                  <span className="ml-2 text-zinc-500 font-mono">
                    {step.multiplier.toFixed(2)}×
                  </span>
                </div>
                {step.note && (
                  <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">
                    {step.note}
                  </div>
                )}
              </div>
              <div className="text-[14px] font-mono tabular-nums text-zinc-300 shrink-0">
                → {round1(step.runningChance)}%
              </div>
            </div>
          ))}
          {/* Final row */}
          <div className="px-3 py-2.5 flex items-baseline justify-between gap-3 bg-white/[0.02]">
            <div className="text-[12px] text-zinc-100 font-semibold uppercase tracking-[0.1em]">
              Final
            </div>
            <div className="text-[16px] font-mono tabular-nums font-bold text-zinc-100 shrink-0">
              {breakdown.finalChance}%
            </div>
          </div>
        </div>
      </div>

      {whatIfs.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400 mb-2">
            What-if
          </h4>
          <ul className="space-y-1.5">
            {whatIfs.map((s, i) => (
              <li
                key={i}
                className="rounded-lg bg-[#0a0a14]/70 border border-white/[0.04] px-3 py-2 flex items-baseline justify-between gap-3"
              >
                <span className="text-[12px] text-zinc-400 leading-snug">{s.label}</span>
                <span className="shrink-0 flex items-baseline gap-2">
                  <span className={`text-[13px] font-mono tabular-nums ${TIER_TONE[s.classification]}`}>
                    {s.chance}%
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${TIER_TONE[s.classification]}`}>
                    {TIER_LABEL[s.classification]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
