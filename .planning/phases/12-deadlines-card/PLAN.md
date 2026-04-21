# Phase 12 — Application timeline / deadline card

**Goal:** New strategy card "Upcoming Deadlines" computed from pinned schools' applicationOptions.

## Files

- Create: `src/lib/deadlines.ts`
- Modify: `src/app/strategy/page.tsx` — render the new card; conditionally hoist above "Recommended for Your Major" if any deadline ≤7 days.

## deadlines.ts

```ts
import type { ApplicationPlan, PinnedCollege } from "./college-types";

export const DEADLINE_DATES: Record<ApplicationPlan, { month: number; day: number } | null> = {
  ED:      { month: 11, day: 1 },
  EA:      { month: 11, day: 1 },
  REA:     { month: 11, day: 1 },
  SCEA:    { month: 11, day: 1 },
  ED2:     { month: 1,  day: 1 },
  RD:      { month: 1,  day: 1 },
  Rolling: null,
};

export interface DeadlineEntry {
  readonly schoolName: string;
  readonly plan: ApplicationPlan;
  readonly date: Date;
  readonly daysAway: number;   // negative not returned (filtered)
  readonly isRolling: boolean;
}

export function computeDeadlines(
  pinned: readonly PinnedCollege[],
  today: Date,
): readonly DeadlineEntry[] {
  // For each pin with applicationPlan set: compute next occurrence of (month/day)
  // If date is in the past by more than 7 days, skip. Sort ascending.
  // Rolling: include with isRolling = true, no date math; sort to bottom.
}
```

Date selection: pick the next occurrence — if `today` is past Nov 1 of this year, use Nov 1 of next year. Same for Jan 1 (always next Jan 1 from today).

## Card render

- Title: "Upcoming Deadlines"
- Headline: count of upcoming + nearest in days
- Body: list rows. Each row:
  - school name
  - plan label
  - "Mon DD, YYYY" + "in N days"
  - urgency color: ≤14 days = red-400, ≤30 = amber-400, else zinc-400
  - Rolling rows: "Rolling — apply early for best odds"
- Empty state: muted "No deadlines in your pinned list. Set application plans on your pinned schools to see them here."

## Hoisting

Compute `urgentSoon = entries.some(e => !e.isRolling && e.daysAway <= 7)`. If true: render this card before "Recommended for Your Major" in the strategy page card stack. Otherwise: render in natural slot (after Gaps, before Recommended).

## Acceptance

- Pin with ED at a school → card shows Nov 1 deadline + days-away.
- Empty pinned plans → empty-state message renders.
- Setting "today" within 7 days of a deadline (manual test) hoists the card to the top.
