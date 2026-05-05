"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Bookmark, ArrowRight, HelpCircle } from "lucide-react";
import type { ClassifiedCollege, Classification } from "@/lib/college-types";
import { CollegeCard } from "./CollegeCard";

type SortKey = "acceptanceRate" | "chance" | "majorMatch";

interface CollegeResultsProps {
  readonly results: ClassifiedCollege[];
  readonly sortedBy: (key: SortKey) => ClassifiedCollege[];
  readonly pinnedCount?: number;
  readonly isPinned?: (name: string) => boolean;
  readonly onTogglePin?: (name: string) => void;
  // When the user clicks the "?" next to the Fit Score sort, open the
  // single canonical tier/Fit Score legend that already lives on the page.
  readonly onShowGuide?: () => void;
  // True when the user has picked a major or typed an interest. Gates the
  // visibility of the "Major Match" sort chip so it doesn't appear empty.
  readonly hasMajorPreference?: boolean;
  // Keyboard nav: index in the FLAT (cross-group) sorted list to highlight.
  // -1 means no highlight. Cards are tagged with a data attribute so the
  // hook in the page can find/scroll them.
  readonly focusedFlatIndex?: number;
  // Called by the page so the keyboard hook can keep its sorted-flat-list
  // length in sync. Receives the same flat sorted list that drives the UI.
  readonly onSortedChange?: (sorted: readonly ClassifiedCollege[]) => void;
}

const SORT_OPTIONS: readonly { key: SortKey; label: string }[] = [
  { key: "chance",         label: "Chance" },
  { key: "acceptanceRate", label: "Acceptance Rate" },
  { key: "majorMatch",     label: "Major Match" },
];

const GROUPS: { key: Classification; label: string; color: string }[] = [
  { key: "safety",       label: "Safety",            color: "text-tier-safety-fg" },
  { key: "likely",       label: "Likely",            color: "text-tier-likely-fg" },
  { key: "target",       label: "Target",            color: "text-tier-target-fg" },
  { key: "reach",        label: "Reach",             color: "text-tier-reach-fg" },
  { key: "unlikely",     label: "Unlikely",          color: "text-tier-unlikely-fg" },
  // 6th tier: when the model has no GPA + no test signal it returns
  // "insufficient" rather than guessing a tier (Finding 4.9). No color
  // coding — the card itself surfaces the prompt to complete the profile.
  { key: "insufficient", label: "Insufficient Data", color: "text-text-secondary" },
];

export const CollegeResults: React.FC<CollegeResultsProps> = ({
  results,
  sortedBy,
  pinnedCount = 0,
  isPinned,
  onTogglePin,
  onShowGuide,
  hasMajorPreference = false,
  focusedFlatIndex = -1,
  onSortedChange,
}) => {
  const [sort, setSort] = useState<SortKey>("chance");

  // Memoize derived arrays — without this, every render produces a new
  // `visualOrder` reference, which invalidates the useEffect deps below
  // and triggers setKeyboardSlice → parent re-render → child re-render →
  // infinite loop ("Maximum update depth exceeded"). `results` is already
  // sorted by chance midpoint in useCollegeFilter, so when sort === "chance"
  // we can pass it through unchanged.
  const sorted = useMemo(
    () => (sort === "chance" ? results : sortedBy(sort)),
    [sort, results, sortedBy],
  );

  // Build grouped + visual-order flat list unconditionally so the hook call
  // below stays above any early return (rules-of-hooks). An empty results
  // array produces empty grouped / visualOrder, which is harmless.
  const grouped = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: sorted.filter((r) => r.classification === g.key),
      })),
    [sorted],
  );

  // Keyboard nav traversal order MUST match the visual (grouped) display
  // order so ArrowDown walks across tier boundaries the way the user sees
  // them — Safety first, then Likely, Target, Reach, Unlikely. The raw
  // `sorted` array is ordered by acceptance rate, which clusters
  // similar-selectivity schools into the same tier and makes the focus
  // ring appear trapped within whichever tier the user's current index
  // happens to fall into. Flattening `grouped` fixes this.
  const visualOrder = useMemo<readonly ClassifiedCollege[]>(
    () => grouped.flatMap((g) => g.items),
    [grouped],
  );
  const flatIndexByName = useMemo(
    () =>
      new Map<string, number>(
        visualOrder.map((c, i) => [c.college.name, i]),
      ),
    [visualOrder],
  );

  // Push the visual-ordered slice up so the page-level keyboard hook can
  // map an index → ClassifiedCollege (needed for "P" → toggle pin by name)
  // AND can count the right number of focusable cards. Content-compare
  // before notifying: the parent's `searchedSortedBy` callback is recreated
  // on every parent render and ultimately wraps a non-stable `sortedBy`
  // from useCollegeFilter. When sort != "acceptanceRate", that invalidates
  // our memo on every render → new visualOrder ref → effect fires →
  // setKeyboardSlice → parent re-render → loop. Bailing on equal content
  // breaks that cycle without depending on upstream stability.
  const lastSentRef = useRef<readonly ClassifiedCollege[]>([]);
  useEffect(() => {
    const prev = lastSentRef.current;
    if (
      prev.length === visualOrder.length &&
      visualOrder.every((c, i) => c.college.name === prev[i]?.college.name)
    ) {
      return;
    }
    lastSentRef.current = visualOrder;
    onSortedChange?.(visualOrder);
  }, [visualOrder, onSortedChange]);

  if (results.length === 0) {
    return (
      <div className="bg-bg-surface rounded-md p-12 border border-border-hair text-center">
        <p className="text-text-muted text-lg mb-2">No schools match your filters</p>
        <p className="text-text-faint text-sm">Try broadening your criteria — remove a filter or widen the acceptance rate range.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pinned-count CTA bar — directs users to Strategy Engine */}
      {pinnedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center justify-between gap-3 rounded-md bg-accent-soft border border-accent-line px-4 py-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Bookmark className="w-4 h-4 text-accent-text shrink-0" fill="currentColor" />
            <p className="text-sm text-text-primary">
              <span className="font-semibold text-accent-text">{pinnedCount}</span>
              <span className="text-text-secondary"> school{pinnedCount === 1 ? "" : "s"} pinned to your list</span>
            </p>
          </div>
          <Link
            href="/strategy"
            className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft hover:bg-bg-elevated text-accent-text px-3 py-1.5 text-xs font-semibold transition-colors shrink-0"
          >
            View Strategy
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-text-muted">Sort by:</span>
        {SORT_OPTIONS
          // Hide Major Match until the user has picked a major/interest;
          // otherwise the sort has no effect and the chip is misleading.
          .filter((opt) => opt.key !== "majorMatch" || hasMajorPreference)
          .map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`text-xs px-3 py-1 rounded-lg transition-[background-color,color,box-shadow] duration-200 ${
                sort === key
                  ? "bg-accent-soft text-accent-text ring-1 ring-accent-line"
                  : "bg-bg-inset text-text-muted hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        {onShowGuide && (
          <button
            type="button"
            onClick={onShowGuide}
            aria-label="How are admission chances calculated? Open the full legend."
            title="How are admission chances calculated?"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-7 sm:h-7 rounded-lg text-text-muted hover:text-accent-text hover:bg-accent-soft transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Grouped results */}
      {grouped.map((group) => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-[0.08em] ${group.color}`}>
                {group.label}
              </h3>
              <span className="text-xs text-text-faint">({group.items.length})</span>
              <div className="flex-1 h-px bg-bg-inset" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((item, i) => {
                // Flat index is the card's position in the visual-order
                // traversal (grouped, then in-group sort). This is the
                // sequence ArrowDown / ArrowUp walks through — so the
                // focus ring and the keyboard listener agree on what
                // "next card" means across tier boundaries.
                const flatIndex = flatIndexByName.get(item.college.name) ?? -1;
                return (
                  <CollegeCard
                    key={item.college.name}
                    item={item}
                    index={i}
                    isPinned={isPinned?.(item.college.name)}
                    onTogglePin={onTogglePin}
                    flatIndex={flatIndex}
                    focused={focusedFlatIndex === flatIndex}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

