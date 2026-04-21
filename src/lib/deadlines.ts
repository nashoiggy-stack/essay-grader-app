// Phase 12 — application deadline computation for the strategy page card.
//
// Dates here are intentionally configurable constants — schools differ on
// exact dates (Stanford REA, Georgetown EA, etc.) but for a dev build we
// use a sensible default that matches the most common Common App calendars.
// If we want per-school accuracy later, the College record can grow
// optional applicationDeadlines and this module reads from there first.

import type { ApplicationPlan, PinnedCollege } from "./college-types";

interface MonthDay {
  readonly month: number;  // 1-12
  readonly day: number;    // 1-31
}

export const DEADLINE_DATES: Record<ApplicationPlan, MonthDay | null> = {
  ED: { month: 11, day: 1 },
  EA: { month: 11, day: 1 },
  REA: { month: 11, day: 1 },
  SCEA: { month: 11, day: 1 },
  ED2: { month: 1, day: 1 },
  RD: { month: 1, day: 1 },
  Rolling: null,
};

export interface DeadlineEntry {
  readonly schoolName: string;
  readonly plan: ApplicationPlan;
  readonly date: Date | null;     // null only when isRolling
  readonly daysAway: number;       // 0 for rolling
  readonly isRolling: boolean;
}

// Pick the next occurrence of (month, day) at-or-after `from`. If the date
// has already passed by more than `keepWindowDays`, roll to next year.
function nextOccurrence(md: MonthDay, from: Date, keepWindowDays = 7): Date {
  const year = from.getFullYear();
  let candidate = new Date(year, md.month - 1, md.day, 23, 59, 59, 999);
  const msPerDay = 86_400_000;
  const daysAgo = Math.floor((from.getTime() - candidate.getTime()) / msPerDay);
  if (daysAgo > keepWindowDays) {
    candidate = new Date(year + 1, md.month - 1, md.day, 23, 59, 59, 999);
  }
  return candidate;
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  // End-of-day for `a` (today) so a deadline today = 0 days away.
  return Math.ceil((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Compute upcoming deadlines from pinned schools that have an
 * applicationPlan set. Skips pins without a plan. Past dates more than
 * 7 days behind are dropped.
 */
export function computeDeadlines(
  pinned: readonly PinnedCollege[],
  today: Date,
): readonly DeadlineEntry[] {
  const entries: DeadlineEntry[] = [];
  for (const pin of pinned) {
    if (!pin.applicationPlan) continue;
    const md = DEADLINE_DATES[pin.applicationPlan];
    if (md === null) {
      // Rolling — surface as a non-dated row, sorted to the bottom.
      entries.push({
        schoolName: pin.name,
        plan: pin.applicationPlan,
        date: null,
        daysAway: 0,
        isRolling: true,
      });
      continue;
    }
    const date = nextOccurrence(md, today);
    const daysAway = daysBetween(today, date);
    if (daysAway < -7) continue;  // dropped per spec
    entries.push({
      schoolName: pin.name,
      plan: pin.applicationPlan,
      date,
      daysAway,
      isRolling: false,
    });
  }

  // Sort: dated entries by date ascending, rolling entries last (stable).
  entries.sort((a, b) => {
    if (a.isRolling && !b.isRolling) return 1;
    if (!a.isRolling && b.isRolling) return -1;
    if (a.isRolling && b.isRolling) return 0;
    return (a.date as Date).getTime() - (b.date as Date).getTime();
  });

  return entries;
}
