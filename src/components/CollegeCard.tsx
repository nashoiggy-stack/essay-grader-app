"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { Bookmark, GraduationCap } from "lucide-react";
import type { ClassifiedCollege } from "@/lib/college-types";
import type { ProfileSpike } from "@/lib/extracurricular-types";
import { hasProgramVariance } from "@/data/hook-multipliers";
import { BreakdownPanel } from "./BreakdownPanel";
import { getCachedJson } from "@/lib/cloud-storage";

const CLASS_COLORS = {
  unlikely: { bg: "bg-red-600/10", border: "border-red-600/20", text: "text-red-500", label: "Unlikely", ring: "ring-red-600/25" },
  reach: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Reach", ring: "ring-orange-500/25" },
  target: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Target", ring: "ring-amber-500/25" },
  likely: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Likely", ring: "ring-blue-500/25" },
  safety: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Safety", ring: "ring-emerald-500/25" },
  // Insufficient data: deliberately muted, no semantic color, no tier promise.
  insufficient: { bg: "bg-zinc-500/5", border: "border-zinc-500/10", text: "text-zinc-400", label: "Insufficient Data", ring: "ring-zinc-500/15" },
} as const;

// Low-confidence muted variant — overrides tier color so the card visually
// signals "we don't trust this number much". Applied when confidence === "low"
// or when the chance was derived from a fallback (ED/EA estimate).
const LOW_CONF_TEXT = "text-zinc-500";

// Map EC spike categories to college tags for matching
const SPIKE_TAG_MAP: Record<string, string[]> = {
  "stem research": ["research", "tech", "stem"],
  "research": ["research"],
  "community service": ["service", "community", "collaborative"],
  "arts": ["arts", "creative"],
  "athletics": ["athletics"],
  "leadership": ["collaborative", "pre-professional"],
  "business": ["pre-professional", "business"],
  "entrepreneurship": ["pre-professional", "business"],
};

function getSpikeMatch(spikes: ProfileSpike[], tags: string[]): string | null {
  for (const spike of spikes) {
    const matchTags = SPIKE_TAG_MAP[spike.category.toLowerCase()] ?? [];
    const match = matchTags.find((t) => tags.some((tag) => tag.toLowerCase().includes(t)));
    if (match) return spike.category;
  }
  return null;
}

interface CollegeCardProps {
  readonly item: ClassifiedCollege;
  readonly index: number;
  readonly isPinned?: boolean;
  readonly onTogglePin?: (name: string) => void;
  // Position in the FLAT (cross-group) sorted list. Used by the keyboard nav
  // hook to find/scroll a specific card via its data attribute.
  readonly flatIndex?: number;
  // True when this card is the keyboard-focused one — gets a focus ring.
  readonly focused?: boolean;
}

export const CollegeCard: React.FC<CollegeCardProps> = ({
  item,
  index,
  isPinned = false,
  onTogglePin,
  flatIndex,
  focused = false,
}) => {
  const {
    college: c,
    classification,
    reason,
    chance,
    confidence,
    yieldProtectedNote,
    usedFallback,
    recruitedAthletePathway,
    breakdown,
    majorMatch,
    matchReason,
  } = item;
  const colors = CLASS_COLORS[classification];
  const isLowConf = confidence === "low" || usedFallback != null;
  const chanceTextClass = isLowConf ? LOW_CONF_TEXT : colors.text;

  const spikeMatch = useMemo(() => {
    const ecResult = getCachedJson<{ spikes?: Parameters<typeof getSpikeMatch>[0] }>(
      "ec-evaluator-result",
    );
    if (!ecResult?.spikes?.length) return null;
    return getSpikeMatch(ecResult.spikes, c.tags);
  }, [c.tags]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -2 }}
      data-college-card-index={flatIndex ?? undefined}
      className={`group rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-5 sm:p-6 hover:bg-[#13131f] hover:border-white/[0.14] hover:shadow-[0_8px_24px_rgba(10,16,29,0.6)] transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
        focused ? "ring-2 ring-blue-500/30" : ""
      }`}
    >
      {/* ── Header: Name + chance dominant ─────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} ring-1 ${colors.ring}`}>
              {colors.label}
            </span>
            {c.usNewsRank && (
              <span className="text-[10px] text-zinc-500 font-medium">
                #{c.usNewsRank} US News
              </span>
            )}
          </div>
          <h4 className="text-base sm:text-lg font-semibold text-zinc-100 truncate leading-tight">
            {c.name}
          </h4>
          <p className="text-[11px] text-zinc-500 mt-1">
            {c.state} &middot; {c.type === "public" ? "Public" : "Private"} &middot; {c.setting}
          </p>
        </div>

        {/* Right column: pin + chance estimate */}
        <div className="shrink-0 flex items-start gap-2">
          {onTogglePin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(c.name);
              }}
              aria-label={isPinned ? `Unpin ${c.name}` : `Pin ${c.name} to your list`}
              aria-pressed={isPinned}
              className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-[background-color,color] duration-200 ${
                isPinned
                  ? "bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
                  : "bg-white/[0.03] text-zinc-500 hover:bg-white/[0.08] hover:text-zinc-300"
              }`}
            >
              <Bookmark
                className="w-4 h-4"
                strokeWidth={1.75}
                fill={isPinned ? "currentColor" : "none"}
              />
            </button>
          )}
          {/* Admission chance — replaces the old FIT 80 number. Midpoint is
              prominent; the low-high range underneath communicates uncertainty
              without faking precision. Muted color when confidence is low or
              the value comes from an ED/EA fallback. */}
          <div className="text-right">
            <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-0.5">Chance</p>
            <p
              className={`text-3xl sm:text-4xl font-semibold font-mono tabular-nums leading-none ${chanceTextClass}`}
            >
              {classification === "insufficient" ? "—" : `${chance.mid}%`}
            </p>
            {classification !== "insufficient" && (
              <p className="text-[10px] font-mono tabular-nums text-zinc-500 mt-0.5">
                {chance.low}–{chance.high}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Hairline separator ──────────────────────────────────── */}
      <div className="h-px bg-white/[0.05] -mx-5 sm:-mx-6 mb-4" />

      {/* ── Stats row: horizontal with generous spacing ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        <MetaStat label="Accept Rate" value={`${c.acceptanceRate}%`} />
        <MetaStat label="Avg GPA" value={c.avgGPAUW.toFixed(2)} secondary={`${c.avgGPAW.toFixed(2)} W`} />
        <MetaStat label="SAT" value={`${c.sat25}–${c.sat75}`} />
        <MetaStat label="ACT" value={`${c.act25}–${c.act75}`} />
      </div>

      {/* ── Essay advisory note (selective schools only) ──────────────
          Essays don't contribute a multiplier in the chance model — they're
          surfaced as advisory text per SPEC. Show only at high-selectivity
          schools where strong essays can meaningfully shift outcomes. */}
      {classification !== "insufficient" && c.acceptanceRate < 25 && (
        <p className="mt-3 text-[11px] text-zinc-500 leading-snug">
          Numbers assume average essay quality. Strong essays at this selectivity can shift chances meaningfully.
        </p>
      )}

      {/* ── Program-specific variance note ─────────────────────────────
          Schools where program admit rates differ meaningfully from school-
          overall (Penn M&T, Cornell college splits, Berkeley CS/EECS, etc.)
          The chance model uses school-overall always; this note flags that
          a competitive program could shift things. Per-program data sourcing
          is a separate workstream. */}
      {classification !== "insufficient" && hasProgramVariance(c.name) && (
        <p className="mt-2 text-[11px] text-zinc-500 leading-snug">
          Some programs at this school may have admit rates that differ from the school overall.
        </p>
      )}

      {/* ── Confidence + caveat badges ──────────────────────────── */}
      {(isLowConf || yieldProtectedNote || usedFallback || recruitedAthletePathway) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {recruitedAthletePathway && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25">
              Recruited athlete pathway
            </span>
          )}
          {confidence === "low" && !recruitedAthletePathway && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20">
              Low confidence
            </span>
          )}
          {usedFallback === "ed" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20">
              ED estimate based on overall trends
            </span>
          )}
          {usedFallback === "ea" && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20">
              EA estimate based on overall trends
            </span>
          )}
          {yieldProtectedNote && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20">
              May consider demonstrated interest
            </span>
          )}
        </div>
      )}

      {/* ── Reasoning (only if present) ─────────────────────────── */}
      {reason && (
        <p className="mt-4 pt-4 border-t border-white/[0.05] text-[12px] text-zinc-400 leading-relaxed">
          {reason}
        </p>
      )}

      {spikeMatch && (
        <p className="mt-2 text-[11px] text-blue-400/80 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          Your {spikeMatch} profile aligns with this school
        </p>
      )}

      <MajorFitFlag item={item} />
      {/* Specific deterministic rationale — shown below the badge when we
          have at least one fragment (rank in field, knownFor tag, pipeline,
          earnings). Not shown when the badge itself is absent. */}
      {majorMatch && majorMatch !== "none" && matchReason && (
        <p className="mt-1 ml-[18px] text-[11px] text-zinc-500 leading-snug">
          {matchReason}
        </p>
      )}

      {/* ── Multiplier-stack breakdown (collapsible) ──────────────────────
          Renders the same accumulating-chance trace shown on /chances. The
          card-level expander is intentionally subtle — power users can
          inspect the math without taking visual real estate from scanning
          the list. What-if scenarios are intentionally scoped to /chances
          (where the user has a single school selected) since rendering them
          per-card would balloon visual footprint. */}
      {breakdown && classification !== "insufficient" && (
        <details className="group mt-4 pt-4 border-t border-white/[0.05]">
          <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-open:rotate-180">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            See the breakdown
          </summary>
          <div className="mt-3">
            <BreakdownPanel breakdown={breakdown} />
          </div>
        </details>
      )}
    </motion.div>
  );
};

// ── Major-fit pill + expandable breakdown ──────────────────────────────────
// Single compact pill summarizes the best-level match (with "+N" suffix when
// other majors also match at that level). Click to reveal a per-major
// breakdown with score bars sorted highest first. The previous design's
// dual "Best fit · Avg across selected" line was confusing — replaced by
// the inline expansion below.

const PILL_TONE = {
  strong: { bg: "bg-emerald-500/10", text: "text-emerald-400", ring: "ring-emerald-500/25", bar: "bg-emerald-400" },
  decent: { bg: "bg-amber-500/10", text: "text-amber-400", ring: "ring-amber-500/25", bar: "bg-amber-400" },
  none:   { bg: "bg-white/[0.03]", text: "text-zinc-500", ring: "ring-white/[0.06]", bar: "bg-zinc-600" },
} as const;

function MajorFitFlag({ item }: { item: ClassifiedCollege }) {
  const breakdown = item.majorFitBreakdown ?? [];

  // No active selections at all → render nothing (filter UI shows nothing
  // selected, the card stays clean).
  if (breakdown.length === 0) return null;

  // Pick the best level present and the single highest-scoring entry at
  // that level. The pill names that one major; "+N" indicates how many
  // OTHER majors also match at the same level.
  const strong = breakdown.filter((b) => b.level === "strong");
  const decent = breakdown.filter((b) => b.level === "decent");

  const level: "strong" | "decent" | "none" =
    strong.length > 0 ? "strong" : decent.length > 0 ? "decent" : "none";

  const list = level === "strong" ? strong : level === "decent" ? decent : [];
  const top = [...list].sort((a, b) => b.score - a.score)[0];
  const others = list.length - 1;

  const tone = PILL_TONE[level];
  const verb = level === "strong" ? "Strong in" : level === "decent" ? "Adjacent in" : "";

  let pillLabel: string;
  if (level === "none") {
    pillLabel = "No fit in selected";
  } else if (top) {
    pillLabel = `${verb} ${top.name}${others > 0 ? ` +${others}` : ""}`;
  } else {
    pillLabel = "No fit in selected";
  }

  // Sorted by score desc for the expanded breakdown. Bars colored by the
  // entry's own level (mixing strong-green and decent-amber rows is fine —
  // it makes the level distinction visible at a glance).
  const sorted = [...breakdown].sort((a, b) => b.score - a.score);

  return (
    <div className="mt-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${tone.bg} ${tone.text} ring-1 ${tone.ring}`}
      >
        <GraduationCap
          className="w-3 h-3 shrink-0"
          strokeWidth={level === "strong" ? 2 : 1.75}
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em]">
          {pillLabel}
        </span>
      </span>
      {/* Per-major breakdown — always visible, no toggle. Sorted by score
          desc; bars colored by each entry's own level so strong rows
          (green) stand out from adjacent rows (amber) at a glance. */}
      <ul className="mt-2 space-y-1.5">
        {sorted.map((b) => {
          const rowTone = PILL_TONE[b.level];
          const score = Math.round(b.score);
          return (
            <li
              key={`${b.kind}:${b.name}`}
              className="flex items-center gap-2.5 text-[11px] leading-snug"
            >
              <span className="text-zinc-400 truncate min-w-0 basis-[40%] sm:basis-[35%]">
                {b.name}
                {b.kind === "interest" && (
                  <span className="ml-1 text-zinc-600">(interest)</span>
                )}
              </span>
              <span
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={score}
                aria-label={`${b.name} fit score`}
                className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden min-w-[40px]"
              >
                <span
                  className={`block h-full rounded-full ${rowTone.bar} transition-[width] duration-300`}
                  style={{ width: `${score}%` }}
                />
              </span>
              <span className="font-mono tabular-nums text-zinc-300 shrink-0 w-7 text-right">
                {score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MetaStat({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-600 uppercase tracking-[0.15em] mb-1">{label}</p>
      <p className="text-sm font-mono tabular-nums text-zinc-200">{value}</p>
      {secondary && (
        <p className="text-[10px] font-mono tabular-nums text-zinc-500 mt-0.5">{secondary}</p>
      )}
    </div>
  );
}
