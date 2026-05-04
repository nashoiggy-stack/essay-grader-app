"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle } from "lucide-react";
import type { StrategyAnalysis, StrategyResult } from "@/lib/strategy-types";
import { TIER_LABEL, EC_LABEL, PERCENTILE_LABEL } from "./helpers";

export function SnapshotBody({
  result,
  analysis,
}: {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
}) {
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
        {result.profileSummary.body}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <StatChip
          label="Academics"
          value={TIER_LABEL[analysis.academic.tier]}
          tooltip={analysis.academic.signals.join(" · ")}
          tone={
            analysis.academic.tier === "elite" || analysis.academic.tier === "strong"
              ? "good"
              : analysis.academic.tier === "limited"
                ? "bad"
                : "mid"
          }
        />
        <StatChip
          label="Extracurriculars"
          value={EC_LABEL[analysis.ec.tier]}
          tooltip={analysis.ec.signals.join(" · ")}
          tone={
            analysis.ec.tier === "exceptional" || analysis.ec.tier === "strong"
              ? "good"
              : analysis.ec.tier === "limited" || analysis.ec.tier === "missing"
                ? "bad"
                : "mid"
          }
        />
        <StatChip
          label="Positioning"
          value={PERCENTILE_LABEL[analysis.positioning.percentileEstimate]}
          tooltip={analysis.positioning.gaps.join(" · ")}
          tone={
            analysis.positioning.percentileEstimate === "top-10" ||
            analysis.positioning.percentileEstimate === "top-25"
              ? "good"
              : "mid"
          }
        />
      </div>

      <div className="rounded-xl bg-bg-surface border border-border-hair p-4">
        <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-1">
          Competitiveness Positioning
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
          {result.competitiveness.body}
        </p>
      </div>
    </div>
  );
}

function StatChip({
  label,
  value,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  tooltip: string;
  tone: "good" | "mid" | "bad";
}) {
  const [open, setOpen] = useState(false);
  const toneClass =
    tone === "good"
      ? "text-tier-safety-fg bg-tier-safety-soft"
      : tone === "bad"
        ? "text-tier-unlikely-fg bg-tier-unlikely-soft"
        : "text-tier-target-fg bg-tier-target-soft";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full  ${toneClass} hover:brightness-125 transition-[filter] duration-200`}
      >
        <span className="text-text-muted">{label}</span>
        <span className="font-semibold">{value}</span>
        <HelpCircle className="w-3 h-3 opacity-70" />
      </button>
      <AnimatePresence>
        {open && tooltip && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute left-0 top-full mt-2 w-72 z-10 rounded-lg bg-bg-inset border border-border-strong p-3 shadow-[0_16px_32px_rgba(0,0,0,0.4)]"
          >
            <p className="text-[11px] text-text-secondary leading-relaxed">{tooltip}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
