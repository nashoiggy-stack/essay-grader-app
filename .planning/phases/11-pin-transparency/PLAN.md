# Phase 11 — "See all pins ranked" transparency view

**Goal:** Inline disclosure on the "Recommended for Your Major" card listing every pinned school with classification, fitScore, majorFitScore, and 1-line reason. Read-only, sorted by majorFitScore desc.

## Files

- Modify: `src/app/strategy/page.tsx` — extend `MajorRecommendationsBody` with a button + collapsed list.
- (Strategy engine already exposes `classifyAll` indirectly via `recommendCollegesByMajor`. We'll re-derive the pinned-only list inline using the existing strategy profile.)

## Approach

The page already has `analysis.majorRecommendations` (top picks) but not the full ranked pinned list. Two options:

1. **Read pinned ClassifiedCollege list from strategy profile** — `useStrategy` hook exposes `profile`. `profile.pinnedSchools[i].classified` gives `ClassifiedCollege` already. We don't have `majorFitScore` on those (computed only inside `recommendCollegesByMajor`). So we re-run `computeMajorFit` per pin inline.
2. Add a `rankedPinned` field to `MajorAwareRecommendations`.

Picking option 2 — additive field on `MajorAwareRecommendations`, populated in `recommendCollegesByMajor`.

## Type changes

```ts
// strategy-types.ts
export interface MajorAwareRecommendations {
  // ... existing
  readonly rankedPinned: readonly ClassifiedCollege[];   // ALL pinned, sorted by majorFitScore desc
}
```

`MajorRecommendationsBody` consumes `recs.rankedPinned`.

## UI

- Ghost button under the existing tier rows: "See all pins ranked"
- Click toggles a `<motion.div>` disclosure (height auto + opacity, same easing as existing levers)
- Inside: `<table>`-like list. Each row:
  - Name
  - Classification pill (existing color map)
  - Fit score (mono)
  - Major fit score (mono, only if defined)
  - Reason (matchReason ?? reason, single line truncate)

## Fallback

If `majorFitScore` is undefined on every pinned college (no major / interest set), the button just says "Pinned schools by classification" and sorts by `fitScore` desc. Spec covers this.

## Acceptance

- Button visible on Recommended card.
- Clicking expands the table; clicking again collapses.
- Sort order matches majorFitScore desc.
