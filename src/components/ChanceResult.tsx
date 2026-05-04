"use client";

import React from "react";
import { motion } from "motion/react";
import type { ApplicationPlan, ChanceResult, Classification, College } from "@/lib/college-types";
import { BreakdownPanel } from "./BreakdownPanel";

// Color coding mirrors /colleges CollegeCard so the same school produces the
// same visual signal across surfaces. "Insufficient" is intentionally muted.
const TIER_STYLES: Record<Classification, { bg: string; text: string; bar: string }> = {
  safety:       { bg: "bg-tier-safety-soft",       text: "text-tier-safety-fg",       bar: "bg-tier-safety-fg" },
  likely:       { bg: "bg-tier-likely-soft",       text: "text-tier-likely-fg",       bar: "bg-tier-likely-fg" },
  target:       { bg: "bg-tier-target-soft",       text: "text-tier-target-fg",       bar: "bg-tier-target-fg" },
  reach:        { bg: "bg-tier-reach-soft",        text: "text-tier-reach-fg",        bar: "bg-tier-reach-fg" },
  unlikely:     { bg: "bg-tier-unlikely-soft",     text: "text-tier-unlikely-fg",     bar: "bg-tier-unlikely-fg" },
  insufficient: { bg: "bg-tier-insufficient-soft", text: "text-tier-insufficient-fg", bar: "bg-tier-insufficient-fg" },
};

interface ChanceResultProps {
  readonly result: ChanceResult;
  readonly collegeName: string;
  // Optional: surface the school-history scatterplot inside the breakdown
  // panel when feeder-school data is available for this college+plan.
  readonly college?: College;
  readonly applicationPlan?: ApplicationPlan;
  readonly userStats?: {
    readonly gpaWeighted: number | null;
    readonly sat: number | null;
    readonly act: number | null;
  };
}

function buildHeadline(result: ChanceResult, collegeName: string): string {
  const { classification, chance, multiple, strengths, weaknesses } = result;
  const strongPart = strengths.length > 0 ? strengths[0].split(" is ")[0] || strengths[0].split(" ")[0] : "your profile";
  const weakPart = weaknesses.length > 0 ? weaknesses[0].split(" is ")[0] || weaknesses[0].split(" ")[0] : null;
  const multipleClause = multiple >= 1.5 ? ` — that's ${multiple.toFixed(1)}× the typical admit rate` : "";

  switch (classification) {
    case "safety":
      return `${collegeName} reads as a safety for your profile (${chance.mid}% chance${multipleClause}). Focus on essays and demonstrating fit.`;
    case "likely":
      return weakPart
        ? `${collegeName} is a likely match for your profile (${chance.mid}% chance${multipleClause}). ${strongPart} helps; ${weakPart} is the gap to close.`
        : `${collegeName} is a likely match (${chance.mid}% chance${multipleClause}). Strong essays and ECs make this a real bet.`;
    case "target":
      return weakPart
        ? `Target at ${collegeName} (${chance.mid}% chance${multipleClause}). ${strongPart} is working for you, but ${weakPart} is what to address.`
        : `Target at ${collegeName} (${chance.mid}% chance${multipleClause}). Realistic but competitive — essays and ECs decide.`;
    case "reach":
      // Reach at high selectivity is genuinely good positioning when the
      // multiple is high. Communicate that, not panic.
      return multiple >= 1.5
        ? `${collegeName} is a reach (${chance.mid}% chance), but you're well-positioned — ${multiple.toFixed(1)}× the typical admit rate. At this selectivity, variance dominates: essays, ECs, and demonstrated interest become decisive.`
        : `${collegeName} is a reach (${chance.mid}% chance). At this selectivity, even strong profiles face uncertainty — essays, ECs, and demonstrated interest become decisive.`;
    case "unlikely":
      return `${collegeName} is unlikely on stats alone (${chance.mid}% chance). Would require something exceptional in essays, ECs, or hooks.`;
    case "insufficient":
      return `Add a GPA or test score to see a chance estimate for ${collegeName}.`;
  }
}

function buildNextStep(result: ChanceResult): string {
  const { classification, weaknesses } = result;
  if (classification === "insufficient") {
    return "Run the GPA Calculator and add SAT or ACT scores in your profile.";
  }
  if (weaknesses.length === 0) {
    return classification === "safety"
      ? "Keep building your extracurricular spike and start essay drafts early."
      : "Your profile is balanced — focus on essay quality and demonstrating fit.";
  }
  const top = weaknesses[0].toLowerCase();
  if (top.includes("gpa")) return "Raising your GPA will move the needle most here.";
  if (top.includes("sat") || top.includes("act") || top.includes("test")) return "Retaking the SAT/ACT could meaningfully improve your chances.";
  if (top.includes("essay")) return "Your essay score has room to grow — run it through the Essay Grader.";
  if (top.includes("ec") || top.includes("activit")) return "Build a stronger extracurricular spike — the EC Evaluator can help.";
  return "Address the gap above first — it's your biggest lever.";
}

// Score-bar segments map to the new five-tier thresholds (5 / 20 / 40 / 70 /
// 100). Width-weighted so the fill aligns with the labeled segment.
const SEGMENT_TEMPLATE = "5fr 15fr 20fr 30fr 30fr"; // unlikely | reach | target | likely | safety

export const ChanceResultDisplay: React.FC<ChanceResultProps> = ({
  result,
  collegeName,
  college,
  applicationPlan,
  userStats,
}) => {
  const style = TIER_STYLES[result.classification];
  const headline = buildHeadline(result, collegeName);
  const nextStep = buildNextStep(result);
  const showMultiple = result.classification !== "insufficient" && result.multiple >= 1.5;
  const tierUpper = result.tierLabel.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-bg-surface rounded-md p-6 sm:p-8 border border-border-hair space-y-6"
    >
      {/* Tier + percentage display */}
      <div className="text-center">
        <p className="text-xs text-text-muted uppercase tracking-[0.08em] mb-2">
          Your chances at {collegeName}
        </p>
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-flex flex-col items-center px-6 py-3 rounded-md ${style.bg} border border-border-hair`}
        >
          <span className={`text-4xl sm:text-5xl font-bold font-mono tabular-nums ${style.text} leading-none`}>
            {result.classification === "insufficient" ? "—" : `${result.chance.mid}%`}
          </span>
          <span className={`mt-1 text-xs font-semibold uppercase tracking-[0.08em] ${style.text}`}>
            {tierUpper}
            {showMultiple && (
              <span className="ml-1 text-text-secondary font-normal normal-case tracking-normal">
                ({result.multiple.toFixed(1)}× typical)
              </span>
            )}
          </span>
        </motion.div>
        {result.confidence !== "high" && result.classification !== "insufficient" && (
          <p className="mt-2 text-xs text-text-faint">
            {result.confidence === "low" ? "Low confidence — add GPA and test scores for a better estimate" : "Add more data for a more reliable estimate"}
          </p>
        )}
      </div>

      {/* Tier bar — segments weighted by the actual classification thresholds
          (unlikely <5, reach 5-19, target 20-39, likely 40-69, safety ≥70).
          Fill clamps to bar width so the bar position visually matches the
          tier label even at extreme values. */}
      {result.classification !== "insufficient" && (
        <div>
          <div className="grid text-[10px] text-text-faint uppercase tracking-[0.08em] mb-1.5"
               style={{ gridTemplateColumns: SEGMENT_TEMPLATE }}>
            <span className="text-left">Unlikely</span>
            <span className="text-center">Reach</span>
            <span className="text-center">Target</span>
            <span className="text-center">Likely</span>
            <span className="text-right">Safety</span>
          </div>
          <div className="h-2 rounded-full bg-bg-inset overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${style.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(2, result.chance.mid))}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      )}

      {/* Headline narrative */}
      <div className="rounded-md bg-bg-inset border border-border-strong p-5">
        <p className="text-[15px] text-text-primary leading-relaxed font-medium">
          {headline}
        </p>
        <div className="mt-3 pt-3 border-t border-border-hair flex items-start gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-text shrink-0 mt-[2px]">
            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            <span className="text-text-secondary font-medium">Next step:</span> {nextStep}
          </p>
        </div>
      </div>

      {/* Multiplier breakdown + what-ifs (collapsible) */}
      {result.breakdown && (
        <details className="group rounded-md bg-bg-surface border border-border-hair overflow-hidden">
          <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none hover:bg-bg-elevated transition-[background-color] duration-200">
            <span className="text-xs text-text-muted font-medium">See the breakdown</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-faint transition-transform duration-300 group-open:rotate-180">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </summary>
          <div className="px-4 pb-4 pt-1 space-y-4">
            <p className="text-[12px] text-text-muted leading-relaxed">{result.explanation}</p>
            <BreakdownPanel breakdown={result.breakdown} whatIfs={result.whatIfs} />
          </div>
        </details>
      )}

      {/* Strengths & Weaknesses — colors reuse the tier-safety / tier-unlikely
          tokens so they adapt across light / dark / monochrome themes
          (raw text-emerald-400 / text-red-400 failed 4.5:1 in light mode). */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-tier-safety-fg mb-2">Strengths</h4>
          {result.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-tier-safety-fg mt-0.5 shrink-0">+</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-faint">No notable strengths identified yet</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-tier-unlikely-fg mb-2">Areas to Improve</h4>
          {result.weaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="text-tier-unlikely-fg mt-0.5 shrink-0">!</span>{w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-faint">No major weaknesses identified</p>
          )}
        </div>
      </div>

      {/* Missing data hints — neutral CTAs, not weaknesses */}
      {result.missingDataHints && result.missingDataHints.length > 0 && (
        <ul className="rounded-md bg-bg-inset border border-border-hair p-3 space-y-1.5">
          {result.missingDataHints.map((hint, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="text-text-muted mt-0.5 shrink-0">+</span>
              <a
                href={hint.href}
                className="hover:text-text-primary underline decoration-zinc-700 underline-offset-2"
              >
                {hint.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* The page-level "Estimates only" disclaimer with the methodology
          link (chances/page.tsx:33-47) covers this. A second amber block
          here was redundant + dark-only. */}
    </motion.div>
  );
};
