# Phase 10 — Ranked missing-data banner

**Goal:** Replace plain `missingData: string[]` (kept for back-compat) with a ranked structured list rendered in the existing banner.

## Files

- Modify: `src/lib/strategy-types.ts` — add `MissingDataItem` and `missingDataRanked` field on `StrategyAnalysis` (additive; keep existing field).
- Modify: `src/lib/strategy-engine.ts` — emit ranked list inside `runStrategyAnalysis`. Keep `missingData` string array intact.
- Modify: `src/app/strategy/page.tsx` — `MissingDataBanner` now consumes `missingDataRanked`.

## New type

```ts
export interface MissingDataItem {
  readonly key: "gpa" | "tests" | "ec" | "essay" | "pinnedSchools";
  readonly label: string;
  readonly impact: "high" | "medium" | "low";
  readonly unlockDescription: string;
  readonly ctaHref: string;
}
```

## Impact mapping (deterministic)

| key | impact | label | ctaHref |
|-----|--------|-------|---------|
| pinnedSchools | high | Pin colleges | /colleges |
| ec | high | Run EC Evaluator | /extracurriculars |
| gpa | medium | Calculate GPA | /gpa |
| tests | medium | Add SAT/ACT | /profile |
| essay | low | Grade essay | /essay |

## Sort

`high` → `medium` → `low`, stable within tier.

## Banner UI

- Keep outer `rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-4 mb-4` shell + heading "Missing data will weaken this analysis".
- Replace the joined-string body with a list of rows: label (bold) + unlockDescription (muted) + Link CTA (right-aligned).
- Tiny impact dot color: high = red-400, medium = amber-400, low = zinc-500.

## Acceptance

- Missing 2+ items shows ranked, with high before medium before low.
- Each row links to the right surface.
- Existing string array still populated for any other consumer.
