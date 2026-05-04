"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ExternalLink } from "lucide-react";
import {
  APPLICATION_PLAN_LABELS,
  type ApplicationPlan,
  type Classification,
} from "@/lib/college-types";
import type {
  EarlyRecommendation,
  StrategyPinnedSchool,
  StrategyResult,
} from "@/lib/strategy-types";
import type { DeadlineEntry } from "@/lib/deadlines";

const TIER_CLASS: Record<Classification, { chip: string; bar: string }> = {
  safety: {
    chip: "bg-tier-safety-soft text-tier-safety-fg",
    bar: "bg-tier-safety-fg",
  },
  likely: {
    chip: "bg-tier-likely-soft text-tier-likely-fg",
    bar: "bg-tier-likely-fg",
  },
  target: {
    chip: "bg-tier-target-soft text-tier-target-fg",
    bar: "bg-tier-target-fg",
  },
  reach: {
    chip: "bg-tier-reach-soft text-tier-reach-fg",
    bar: "bg-tier-reach-fg",
  },
  unlikely: {
    chip: "bg-tier-unlikely-soft text-tier-unlikely-fg",
    bar: "bg-tier-unlikely-fg",
  },
  insufficient: {
    chip: "bg-tier-insufficient-soft text-tier-insufficient-fg",
    bar: "bg-tier-insufficient-fg",
  },
};

const PLAN_SHORT: Record<ApplicationPlan, string> = {
  ED: "ED",
  ED2: "ED II",
  REA: "REA",
  SCEA: "SCEA",
  EA: "EA",
  RD: "RD",
  Rolling: "Rolling",
};

// Plans that are binding (ED/ED2). Non-binding early plans don't carry the
// commitment caveat — surface only when binding so the badge stays meaningful.
const BINDING_PLANS = new Set<ApplicationPlan>(["ED", "ED2"]);

interface AtlasRow {
  readonly schoolName: string;
  readonly classification: Classification;
  readonly chanceMid: number | null;
  readonly suggestedPlan: ApplicationPlan;
  readonly alternatives: readonly ApplicationPlan[];
  readonly reasoning: string;
  readonly confidence: EarlyRecommendation["confidence"];
  readonly deadline: DeadlineEntry | null;
}

function formatDeadline(d: DeadlineEntry | null): {
  primary: string;
  secondary: string;
  tone: "urgent" | "soon" | "calm" | "muted";
} {
  if (!d) {
    return { primary: "No plan set", secondary: "", tone: "muted" };
  }
  if (d.isRolling) {
    return { primary: "Rolling", secondary: "Apply early for best odds", tone: "muted" };
  }
  const date = d.date as Date;
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const days = d.daysAway;
  const secondary =
    days < 0
      ? `${Math.abs(days)}d overdue`
      : days === 0
        ? "Today"
        : `in ${days}d`;
  const tone: "urgent" | "soon" | "calm" =
    days <= 7 ? "urgent" : days <= 30 ? "soon" : "calm";
  return { primary: dateStr, secondary, tone };
}

function buildRows(
  earlyStrategy: readonly EarlyRecommendation[],
  pinnedSchools: readonly StrategyPinnedSchool[],
  deadlines: readonly DeadlineEntry[],
): AtlasRow[] {
  const pinByName = new Map(pinnedSchools.map((s) => [s.pin.name, s]));
  const deadlinesByName = new Map<string, DeadlineEntry>();
  for (const e of deadlines) {
    if (!deadlinesByName.has(e.schoolName)) deadlinesByName.set(e.schoolName, e);
  }

  return earlyStrategy.map((r) => {
    const pin = pinByName.get(r.collegeName);
    const classified = pin?.classified ?? null;
    return {
      schoolName: r.collegeName,
      classification: classified?.classification ?? "insufficient",
      chanceMid: classified?.chance.mid ?? null,
      suggestedPlan: r.suggestedPlan,
      alternatives: r.alternatives,
      reasoning: r.reasoning,
      confidence: r.confidence,
      deadline: deadlinesByName.get(r.collegeName) ?? null,
    };
  });
}

const TIER_SORT_ORDER: Record<Classification, number> = {
  reach: 0,
  unlikely: 1,
  target: 2,
  likely: 3,
  safety: 4,
  insufficient: 5,
};

export function StrategyAtlas({
  result,
  earlyStrategy,
  pinnedSchools,
  deadlineEntries,
}: {
  readonly result: StrategyResult;
  readonly earlyStrategy: readonly EarlyRecommendation[];
  readonly pinnedSchools: readonly StrategyPinnedSchool[];
  readonly deadlineEntries: readonly DeadlineEntry[];
}) {
  const [sortMode, setSortMode] = useState<"deadline" | "tier">("deadline");

  const rows = useMemo(
    () => buildRows(earlyStrategy, pinnedSchools, deadlineEntries),
    [earlyStrategy, pinnedSchools, deadlineEntries],
  );

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (sortMode === "tier") {
      copy.sort((a, b) => {
        const ta = TIER_SORT_ORDER[a.classification];
        const tb = TIER_SORT_ORDER[b.classification];
        if (ta !== tb) return ta - tb;
        return (b.chanceMid ?? -1) - (a.chanceMid ?? -1);
      });
    } else {
      copy.sort((a, b) => {
        const ad = a.deadline;
        const bd = b.deadline;
        const aMissing = !ad ? 2 : ad.isRolling ? 1 : 0;
        const bMissing = !bd ? 2 : bd.isRolling ? 1 : 0;
        if (aMissing !== bMissing) return aMissing - bMissing;
        if (aMissing === 0) {
          return (
            (ad!.date as Date).getTime() - (bd!.date as Date).getTime()
          );
        }
        return a.schoolName.localeCompare(b.schoolName);
      });
    }
    return copy;
  }, [rows, sortMode]);

  const planTally = useMemo(() => {
    const tally = new Map<ApplicationPlan, number>();
    for (const r of rows) {
      tally.set(r.suggestedPlan, (tally.get(r.suggestedPlan) ?? 0) + 1);
    }
    const ordered: ApplicationPlan[] = ["ED", "ED2", "REA", "SCEA", "EA", "RD", "Rolling"];
    return ordered
      .filter((p) => (tally.get(p) ?? 0) > 0)
      .map((p) => ({ plan: p, count: tally.get(p) as number }));
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="space-y-3 pt-3">
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Pin schools and the per-school plan will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pt-3">
      {/* Narrative summary from the LLM — kept short, sets context */}
      {result.applicationStrategy.body && (
        <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
          {result.applicationStrategy.body}
        </p>
      )}

      {/* Plan distribution chips */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-hair pb-4">
        {planTally.map(({ plan, count }) => (
          <span
            key={plan}
            className="inline-flex items-baseline gap-1.5 rounded-sm bg-bg-elevated px-2 py-1 text-[11px] tracking-[0.02em] text-text-secondary"
          >
            <span className="font-mono tabular-nums font-semibold text-text-primary">
              {count}
            </span>
            <span>{PLAN_SHORT[plan]}</span>
          </span>
        ))}
        <div className="ml-auto inline-flex items-center gap-0 rounded-sm border border-border-hair p-0.5">
          <SortToggleButton
            active={sortMode === "deadline"}
            onClick={() => setSortMode("deadline")}
            label="Deadline"
          />
          <SortToggleButton
            active={sortMode === "tier"}
            onClick={() => setSortMode("tier")}
            label="Tier"
          />
        </div>
      </div>

      {/* The atlas: one row per school */}
      <ul className="divide-y divide-border-hair border-y border-border-hair">
        {sortedRows.map((row) => (
          <AtlasRowItem key={row.schoolName} row={row} />
        ))}
      </ul>

      {/* Footer hint */}
      <p className="text-[11px] text-text-muted leading-relaxed">
        Plan suggestions reflect each school&apos;s offered application options
        and your fit. Tap a row to read why.
      </p>
    </div>
  );
}

function SortToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-[3px] px-2 py-1 text-[11px] uppercase tracking-[0.08em] font-medium transition-colors ${
        active
          ? "bg-bg-surface text-text-primary"
          : "text-text-muted hover:text-text-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function AtlasRowItem({ row }: { row: AtlasRow }) {
  const [open, setOpen] = useState(false);
  const tier = TIER_CLASS[row.classification];
  const dl = formatDeadline(row.deadline);
  const isBinding = BINDING_PLANS.has(row.suggestedPlan);

  const dlToneClass =
    dl.tone === "urgent"
      ? "text-tier-unlikely-fg"
      : dl.tone === "soon"
        ? "text-tier-reach-fg"
        : dl.tone === "calm"
          ? "text-text-secondary"
          : "text-text-muted";

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-1 sm:px-2 py-3 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,2.4fr)_auto_auto_auto] gap-2 sm:gap-4 items-center text-left group hover:bg-bg-elevated transition-colors"
      >
        {/* Tier color rail — also a non-color signal via the tier glyph below */}
        <span
          className={`hidden sm:inline-block w-0.5 h-8 rounded-full ${tier.bar}`}
          aria-hidden
        />

        {/* School name + tier glyph + chance — main column */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-text-primary truncate">
              {row.schoolName}
            </p>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-semibold ${tier.chip}`}
            >
              {row.classification}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {row.chanceMid != null ? (
              <>
                <span className="font-mono tabular-nums text-text-secondary">
                  {row.chanceMid}%
                </span>
                {" chance"}
              </>
            ) : (
              "Insufficient stats"
            )}
            {row.confidence !== "high" && (
              <>
                {" · "}
                <span className="text-text-faint">
                  {row.confidence} confidence
                </span>
              </>
            )}
          </p>
        </div>

        {/* Suggested plan badge */}
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span
            className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] uppercase tracking-[0.08em] font-semibold ${
              isBinding
                ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                : "bg-bg-elevated text-text-primary"
            }`}
          >
            {PLAN_SHORT[row.suggestedPlan]}
          </span>
          {isBinding && (
            <span className="mt-1 text-[9px] uppercase tracking-[0.08em] text-text-muted">
              Binding
            </span>
          )}
        </div>

        {/* Deadline */}
        <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[88px]">
          <span
            className={`text-[12px] font-mono tabular-nums ${dlToneClass}`}
          >
            {dl.primary}
          </span>
          <span
            className={`text-[10px] uppercase tracking-[0.08em] font-medium ${dlToneClass}`}
          >
            {dl.secondary || "\u00a0"}
          </span>
        </div>

        {/* Mobile-only stack of plan + deadline */}
        <div className="flex sm:hidden flex-col items-end shrink-0">
          <span
            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] font-semibold ${
              isBinding
                ? "bg-[var(--accent-soft)] text-[var(--accent-text)]"
                : "bg-bg-elevated text-text-primary"
            }`}
          >
            {PLAN_SHORT[row.suggestedPlan]}
          </span>
          <span
            className={`mt-0.5 text-[10px] font-mono tabular-nums ${dlToneClass}`}
          >
            {row.deadline?.isRolling
              ? "Rolling"
              : row.deadline
                ? dl.secondary
                : "—"}
          </span>
        </div>

        <ChevronRight
          className={`hidden sm:inline-block w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="px-1 sm:px-2 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
              <div>
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-1">
                  Why this plan
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {row.reasoning}
                </p>

                {row.alternatives.length > 0 && (
                  <p className="mt-3 text-[11px] text-text-muted">
                    Alternatives:{" "}
                    {row.alternatives.map((a, i) => (
                      <React.Fragment key={a}>
                        {i > 0 && " · "}
                        <span className="text-text-secondary">
                          {APPLICATION_PLAN_LABELS[a]}
                        </span>
                      </React.Fragment>
                    ))}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <Link
                  href="/colleges"
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-text)] hover:underline"
                >
                  Open in college list
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
