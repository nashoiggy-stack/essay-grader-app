"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
} from "lucide-react";
import type {
  DreamSchoolAction,
  StrategyAnalysis,
  StrategyResult,
  UrgencyTone,
} from "@/lib/strategy-types";

export function DreamSchoolBody({
  result,
  analysis,
  dreamSchool,
}: {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
  readonly dreamSchool: string | null;
}) {
  const ds = result.dreamSchool;
  // Levers are a deterministic engine output — single source of truth lives on
  // analysis.dreamSchool. Legacy v2 cached results stored an LLM-written
  // string array under result.dreamSchool.whatWouldChangeThis; fall back to
  // that so a stale entry that survived the cache-version bump still
  // renders something useful instead of crashing.
  const engineLevers = analysis.dreamSchool?.leversToImprove ?? [];
  const legacyLevers =
    (ds as unknown as { whatWouldChangeThis?: readonly string[] })?.whatWouldChangeThis ?? [];
  const leverLines: readonly string[] =
    engineLevers.length > 0
      ? engineLevers.map((l) => l.description)
      : legacyLevers;
  const [leversOpen, setLeversOpen] = useState(false);

  if (!ds && !dreamSchool) {
    return (
      <div className="pt-3">
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Pick a dream school using the selector above to get a dedicated early-application recommendation with specific reasoning for that school.
        </p>
      </div>
    );
  }

  if (!ds && dreamSchool) {
    return (
      <div className="pt-3">
        <p className="text-[13px] text-text-secondary leading-relaxed mb-2">
          You selected <span className="text-text-primary font-semibold">{dreamSchool}</span>, but this strategy was generated before that. Click <span className="text-text-primary font-semibold">Re-run</span> above to get the dedicated recommendation block.
        </p>
      </div>
    );
  }

  if (!ds) return null;

  return (
    <div className="space-y-4 pt-3">
      <ActionVerdictBlock
        action={ds.recommendedAction ?? "apply-early-conditional"}
        label={
          ds.actionLabel ??
          (ds as unknown as { verdictHeadline?: string }).verdictHeadline ??
          "Recommendation pending re-run"
        }
        tone={ds.urgencyTone ?? "caution"}
      />

      <div>
        <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-1.5">
          Reasoning
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
          {ds.reasoning}
        </p>
      </div>

      {leverLines.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setLeversOpen((v) => !v)}
            aria-expanded={leversOpen}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-text hover:text-accent-text transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            What would change this recommendation?
          </button>
          <AnimatePresence initial={false}>
            {leversOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden"
              >
                <ul className="mt-3 space-y-2">
                  {leverLines.map((lever, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-text-secondary leading-relaxed"
                    >
                      <span className="text-accent-text mt-0.5 shrink-0">→</span>
                      <span>{lever}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

const TONE_STYLES: Record<
  UrgencyTone,
  { bg: string; ring: string; text: string; icon: React.ElementType; eyebrow: string }
> = {
  // Verdict tones use the OKLCH tier tokens so they stay legible in
  // light, dark, and monochrome themes.
  go: {
    bg: "bg-tier-safety-soft",
    ring: "ring-tier-safety-fg/40",
    text: "text-tier-safety-fg",
    icon: CheckCircle2,
    eyebrow: "Recommended",
  },
  caution: {
    bg: "bg-tier-target-soft",
    ring: "ring-tier-target-fg/40",
    text: "text-tier-target-fg",
    icon: AlertTriangle,
    eyebrow: "Proceed with care",
  },
  stop: {
    bg: "bg-tier-unlikely-soft",
    ring: "ring-tier-unlikely-fg/40",
    text: "text-tier-unlikely-fg",
    icon: XCircle,
    eyebrow: "Hold",
  },
};

function ActionVerdictBlock({
  action,
  label,
  tone,
}: {
  action: DreamSchoolAction;
  label: string;
  tone: UrgencyTone;
}) {
  // Defensive default: legacy share snapshots / v2 cached results predate
  // urgencyTone. Treat missing tone as "caution" so the page renders
  // instead of crashing on undefined.style lookup.
  const s = TONE_STYLES[tone] ?? TONE_STYLES.caution;
  const Icon = s.icon;
  // action is part of the type contract but the visible label already
  // names the action; it stays in props for analytics/aria-label use.
  void action;
  return (
    <div className={`rounded-xl ${s.bg}  ${s.ring} p-4 flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-bg-surface">
        <Icon className={`w-5 h-5 ${s.text}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-[0.08em] font-bold ${s.text} mb-0.5`}>
          {s.eyebrow}
        </p>
        <p className="text-[14px] text-text-primary font-semibold leading-snug">
          {label}
        </p>
      </div>
    </div>
  );
}
