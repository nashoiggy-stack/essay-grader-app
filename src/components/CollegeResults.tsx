"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { Bookmark, ArrowRight, HelpCircle, X } from "lucide-react";
import type { ClassifiedCollege, Classification } from "@/lib/college-types";
import { CollegeCard } from "./CollegeCard";

interface CollegeResultsProps {
  readonly results: ClassifiedCollege[];
  readonly sortedBy: (key: "acceptanceRate" | "fit") => ClassifiedCollege[];
  readonly pinnedCount?: number;
  readonly isPinned?: (name: string) => boolean;
  readonly onTogglePin?: (name: string) => void;
}

const GROUPS: { key: Classification; label: string; color: string }[] = [
  { key: "safety", label: "Safety", color: "text-emerald-400" },
  { key: "likely", label: "Likely", color: "text-blue-400" },
  { key: "target", label: "Target", color: "text-amber-400" },
  { key: "reach", label: "Reach", color: "text-orange-400" },
  { key: "unlikely", label: "Unlikely", color: "text-red-500" },
];

export const CollegeResults: React.FC<CollegeResultsProps> = ({
  results,
  sortedBy,
  pinnedCount = 0,
  isPinned,
  onTogglePin,
}) => {
  const [sort, setSort] = useState<"acceptanceRate" | "fit">("acceptanceRate");

  const sorted = sort === "fit" ? sortedBy("fit") : results;

  if (results.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 ring-1 ring-white/[0.06] text-center">
        <p className="text-zinc-500 text-lg mb-2">No schools match your filters</p>
        <p className="text-zinc-600 text-sm">Try broadening your criteria — remove a filter or widen the acceptance rate range.</p>
      </div>
    );
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: sorted.filter((r) => r.classification === g.key),
  }));

  return (
    <div className="space-y-8">
      {/* Pinned-count CTA bar — directs users to Strategy Engine */}
      {pinnedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center justify-between gap-3 rounded-xl bg-blue-500/5 border border-blue-500/15 px-4 py-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bookmark className="w-4 h-4 text-blue-300 shrink-0" fill="currentColor" />
            <p className="text-sm text-zinc-200">
              <span className="font-semibold text-blue-200">{pinnedCount}</span>
              <span className="text-zinc-400"> school{pinnedCount === 1 ? "" : "s"} pinned to your list</span>
            </p>
          </div>
          <Link
            href="/strategy"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
          >
            View Strategy
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-500">Sort by:</span>
        {(["acceptanceRate", "fit"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`text-xs px-3 py-1 rounded-lg transition-[background-color,color,box-shadow] duration-200 ${
              sort === key
                ? "bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30"
                : "bg-[#0c0c1a]/90 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {key === "acceptanceRate" ? "Acceptance Rate" : "Fit Score"}
          </button>
        ))}
        <FitScoreHelp />
      </div>

      {/* Grouped results */}
      {grouped.map((group) => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${group.color}`}>
                {group.label}
              </h3>
              <span className="text-xs text-zinc-600">({group.items.length})</span>
              <div className="flex-1 h-px bg-[#0c0c1a]/90" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((item, i) => (
                <CollegeCard
                  key={item.college.name}
                  item={item}
                  index={i}
                  isPinned={isPinned?.(item.college.name)}
                  onTogglePin={onTogglePin}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Fit Score help popover ──────────────────────────────────────────────────
// Explains what the Fit Score number means in plain language. Click the
// icon to reveal; click outside or press Escape to dismiss.

const FIT_BANDS: { range: string; label: string; color: string; blurb: string }[] = [
  { range: "80–100", label: "Safety",   color: "text-emerald-400", blurb: "Strong odds — your stats are well above the school's average." },
  { range: "65–79",  label: "Likely",   color: "text-blue-400",    blurb: "Good chance but not guaranteed — stats above average." },
  { range: "50–64",  label: "Target",   color: "text-amber-400",   blurb: "Stats land inside the school's typical range." },
  { range: "30–49",  label: "Reach",    color: "text-orange-400",  blurb: "Stats are below the typical range, still plausible." },
  { range: "0–29",   label: "Unlikely", color: "text-red-500",     blurb: "Stats are far below the typical admit." },
];

const FitScoreHelp: React.FC = () => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="What is the Fit Score?"
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[#0c0c1a]/90 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">What&rsquo;s this?</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Fit Score explanation"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 z-40 w-[min(92vw,380px)] rounded-2xl bg-[#0f0f1c] border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.5)] p-5"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-zinc-100">About the Fit Score</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13px] text-zinc-300 leading-relaxed mb-3">
              A 0&ndash;100 number that estimates how well your profile lines up with
              the kind of student this school typically admits. It&rsquo;s a starting
              point for thinking about your list &mdash; not a verdict.
            </p>

            <p className="text-[11px] text-zinc-500 uppercase tracking-[0.12em] mb-2">
              What goes into it
            </p>
            <ul className="text-[13px] text-zinc-300 leading-relaxed space-y-1.5 mb-4 pl-4 list-disc marker:text-zinc-600">
              <li>
                <span className="text-zinc-200 font-medium">GPA</span> compared to the
                school&rsquo;s average (unweighted and weighted).
              </li>
              <li>
                <span className="text-zinc-200 font-medium">SAT / ACT</span> compared
                to the school&rsquo;s 25th&ndash;75th percentile range.
              </li>
              <li>
                <span className="text-zinc-200 font-medium">Essays</span> (if graded)
                give a small boost.
              </li>
            </ul>

            <p className="text-[11px] text-zinc-500 uppercase tracking-[0.12em] mb-2">
              What the number means
            </p>
            <div className="space-y-1.5 mb-4">
              {FIT_BANDS.map((b) => (
                <div key={b.label} className="flex items-baseline gap-2 text-[12px]">
                  <span className="font-mono tabular-nums text-zinc-500 w-14 shrink-0">
                    {b.range}
                  </span>
                  <span className={`font-semibold w-[72px] shrink-0 ${b.color}`}>
                    {b.label}
                  </span>
                  <span className="text-zinc-400 leading-snug">{b.blurb}</span>
                </div>
              ))}
            </div>

            <p className="text-[12px] text-zinc-400 leading-relaxed bg-white/[0.03] rounded-lg p-3 ring-1 ring-white/[0.04]">
              <span className="text-zinc-200 font-medium">Heads up:</span> at schools
              with under 15% acceptance, even a perfect academic profile caps around
              82. Admission there also depends on essays, recommendations, and
              extracurriculars &mdash; things a score can&rsquo;t fully capture.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
