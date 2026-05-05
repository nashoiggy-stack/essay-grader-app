"use client";

import React from "react";
import { CalendarClock } from "lucide-react";
import { StrategyCard } from "@/components/StrategyCard";
import { APPLICATION_PLAN_LABELS } from "@/lib/college-types";
import type { DeadlineEntry } from "@/lib/deadlines";

export function DeadlinesCard({
  entries,
  hoisted,
}: {
  readonly entries: readonly DeadlineEntry[];
  readonly hoisted: boolean;
}) {
  const hasAny = entries.length > 0;

  // Headline summarises the nearest non-rolling deadline; falls back to a
  // rolling-only mention or empty-state message.
  const headline = (() => {
    if (!hasAny) return "No deadlines set";
    const dated = entries.filter((e) => !e.isRolling);
    if (dated.length === 0) return `${entries.length} rolling`;
    const nearest = dated[0];
    const days = nearest.daysAway;
    const inText =
      days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`;
    return `${dated.length} upcoming · nearest ${inText}`;
  })();

  const strength = hoisted ? "warning" : "neutral";

  return (
    <StrategyCard
      icon={<CalendarClock className="w-4 h-4" />}
      title="Upcoming Deadlines"
      strength={strength}
      headline={headline}
      defaultExpanded={hoisted}
      emphasize={hoisted}
    >
      <div className="pt-3">
        {!hasAny ? (
          <p className="text-[13px] text-text-secondary leading-relaxed">
            No deadlines in your pinned list. Set application plans on your pinned
            schools to see them here.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e, i) => (
              <DeadlineRow key={`${e.schoolName}-${e.plan}-${i}`} entry={e} />
            ))}
          </ul>
        )}
      </div>
    </StrategyCard>
  );
}

function DeadlineRow({ entry }: { entry: DeadlineEntry }) {
  const colorClass = entry.isRolling
    ? "text-text-muted"
    : entry.daysAway <= 14
      ? "text-tier-unlikely-fg"
      : entry.daysAway <= 30
        ? "text-tier-target-fg"
        : "text-text-secondary";

  return (
    <li className="flex items-baseline justify-between gap-3 rounded-lg bg-bg-surface border border-border-hair px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-text-primary font-semibold truncate">
          {entry.schoolName}
        </p>
        <p className="text-[11px] text-text-muted">
          {APPLICATION_PLAN_LABELS[entry.plan]}
        </p>
      </div>
      {entry.isRolling ? (
        <span className={`text-[11px] ${colorClass} text-right shrink-0`}>
          Rolling — apply early for best odds
        </span>
      ) : (
        <span className="text-right shrink-0">
          <p className={`text-[12px] font-mono tabular-nums ${colorClass}`}>
            {entry.date!.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className={`text-[10px] uppercase tracking-[0.08em] font-semibold ${colorClass}`}>
            {entry.daysAway < 0
              ? `${Math.abs(entry.daysAway)}d overdue`
              : entry.daysAway === 0
                ? "Today"
                : `in ${entry.daysAway}d`}
          </p>
        </span>
      )}
    </li>
  );
}
