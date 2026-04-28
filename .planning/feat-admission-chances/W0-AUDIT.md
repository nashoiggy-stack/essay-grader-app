# Workstream 0 — Codebase audit

Pre-build audit of admissions / chance / strategy / compare files.

Findings are grouped by category. Each finding lists file:line, proposed
fix, blocking-or-deferrable, and recommendation. End sections cover the
plan changes for W1–W4 and the open decisions still needed before kickoff.

---

## Category 1 — REA list errors (BLOCKING)

### Finding 1.1 — Caltech incorrectly listed as REA
- **Issue:** `src/data/colleges.ts:175` maps `"Caltech": RD_REA`. Per the
  verified spec, Caltech is not on the REA list.
- **Citation:** Caltech admissions website confirms Restrictive Early Action
  was discontinued; Caltech offers EA only as of the 2024 admission cycle.
- **Proposed fix:** Change `"Caltech": RD_REA` → `"Caltech": RD_EA`.
- **Blocking:** YES — REA list integrity is a Feature 1 input.
- **Recommendation:** Ship now in W1.

### Finding 1.2 — Georgetown incorrectly listed as REA
- **Issue:** `src/data/colleges.ts:180` maps `"Georgetown University": RD_REA`.
  Per the spec, Georgetown is non-restrictive EA only.
- **Citation:** Georgetown admissions website confirms standard Early Action.
- **Proposed fix:** Change `"Georgetown University": RD_REA` →
  `"Georgetown University": RD_EA`.
- **Blocking:** YES.
- **Recommendation:** Ship now in W1.

### Finding 1.3 — REA list otherwise correct
After 1.1 and 1.2 fixes, codebase exactly matches the verified five-school
REA list (Stanford ✓, Harvard SCEA ✓, Yale SCEA ✓, Princeton SCEA ✓, Notre
Dame REA ✓).

---

## Category 2 — fitScore removal scope (BLOCKING for Feature 1)

`fitScore` lives in 44 source-line touchpoints across 9 files.

### Finding 2.1 — Type definition
- **Issue:** `src/lib/college-types.ts:273` — `ClassifiedCollege.fitScore:
  number` is widely consumed.
- **Proposed fix:** Drop the field. Keep `majorFitScore` (it's the major-fit
  signal, not the stat-band one — confirmed by reading
  `src/lib/major-match.ts`).
- **Blocking:** YES.

### Finding 2.2 — `classifyCollege` returns it
- **Issue:** `src/lib/admissions.ts:267-340` `classifyCollege` returns
  `{ classification, reason, fitScore }` and computes fitScore from
  band-bucket math. Feature 1 will replace `classifyCollege`'s output to
  derive `classification` from chance midpoint (not stat-band avg) and
  stop returning fitScore.
- **Proposed fix:** Replace return type with `{ classification, reason,
  chance: ChanceRange, confidence: ConfidenceTier }`. Internally compute
  via the new chance model.
- **Blocking:** YES.

### Finding 2.3 — Display surfaces
| File | Line | What |
|---|---|---|
| `src/components/CollegeCard.tsx` | 131-134 | "FIT 80" 3xl number — replace with chance range |
| `src/components/CollegeResults.tsx` | 35 | Sort chip `{ key: "fit", label: "Fit Score" }` — rename to `{ key: "chance", label: "Chance" }`, default sort |
| `src/app/colleges/page.tsx` | 18-22, 109, 175 | TIERS prose with `fit: "80-95"` — rewrite to chance ranges |
| `src/app/compare/page.tsx` | 409, 574 | Two displays of `f.fitScore` — replace with chance |

- **Blocking:** YES — visual ripple is intentional per decisions but must
  land in W4.

### Finding 2.4 — Sort path
- **Issue:** `src/hooks/useCollegeFilter.ts:381-409` — `sortedBy("fit")`
  exists; default sort is `acceptanceRate`.
- **Proposed fix:** Add `"chance"` key, make it default; remove `"fit"`
  (rename to `"chance"` semantically).
- **Blocking:** YES.

### Finding 2.5 — Strategy engine ranking
- **Issue:** `src/lib/strategy-engine.ts:466` `analyzeEarlyStrategy` sorts
  pinned schools by `b.classified.fitScore - a.classified.fitScore`.
  `src/lib/strategy-engine.ts:622-627` `rankByMajorThenFit` tiebreaks by
  fitScore.
- **Proposed fix:** Both switch to chance midpoint. For
  `analyzeEarlyStrategy` specifically, Decision #2 says best ED candidate
  = max **leverage** (`edChance − rdChance`), not max fit/chance.
  Refactor accordingly.
- **Blocking:** YES.

### Finding 2.6 — Strategy prompt LLM input
- **Issue:** `src/lib/strategy-prompt.ts:275` — emits `fitScore:
  s.classified.fitScore` to the LLM payload.
- **Proposed fix:** Replace with `{ chanceMidpoint, chanceRange: [low,
  high], confidence }`. Update prose in `src/lib/strategy-prompt.ts:140-
  210` (system prompt) to reason about probability instead of "fit
  score".
- **Blocking:** YES.

### Finding 2.7 — Strategy types `averageFitScore`
- **Issue:** `src/lib/strategy-types.ts:124`,
  `src/lib/strategy-engine.ts:440` — `SchoolListDistribution.averageFitScore`.
- **Proposed fix:** Rename to `averageChance` and compute from chance
  midpoints.
- **Blocking:** YES.

### Finding 2.8 — Compare engine
- **Issue:** `src/lib/compare-engine.ts:25-31, 422-435` — `CollegeFitSummary`
  interface holds `fitScore`, `getCollegeFitSummary` populates it.
- **Proposed fix:** Drop fitScore from the interface. The display in
  `src/app/compare/page.tsx` switches to chance midpoint per Finding 2.3.
- **Blocking:** YES.

---

## Category 3 — Item-by-item responses to original audit asks

### A. `applicationPlanAdjustment` is a fitScore scaler ✓ confirmed
- **Confirmed:** `src/lib/admissions.ts:493-553` operates on `preScore`
  (the running 0-100 score in `useChanceCalculator`, which is fitScore-
  equivalent), not on probability. Boosts (+1 EA, +2 REA, +4 ED) are
  point bumps on a 0-100 fit scale.
- **Consumers:** Only `src/hooks/useChanceCalculator.ts:262`, which is
  the legacy `/chances` page.
- **Per Decision 4:** Leave `useChanceCalculator` and `/chances`
  untouched in Feature 1.
- **Per Decision 6:** Legacy `applicationPlanAdjustment` removed when
  fitScore is removed.
- **Conflict:** These two decisions tug against each other. If we remove
  `applicationPlanAdjustment` in W4, we break `useChanceCalculator`.
- **Resolution (per SPEC):** Defer removal. Mark `// @deprecated` with
  TODO referencing Feature 3 cleanup. Same for `defaultApplicationPlan`
  (also legacy-only consumer).
- **Blocking:** NO — clarification only.
- **Recommendation:** Defer removal. Mark deprecated.

### B. Yield-protected schools
- **Confirmed:** No `yieldProtected` field exists in
  `src/lib/college-types.ts` or anywhere on College.
- **Proposed fix:** Add `readonly yieldProtected?: boolean` to College
  interface. Set `true` for the 11 schools listed in SPEC. The chance
  model caps top-quartile multiplier at 1.0x for these. Card adds a
  small "May consider demonstrated interest" note.
- **Citation source needed:** Verify the 11 in W2 against Top Tier
  Admissions / Admissions Laboratory.
- **Blocking for W4:** YES — need the field + data populated.
- **Recommendation:** Field in W1 (cheap data add), values verified in W2.

### C. UC test-blind handling
- **Mostly correct:** `src/lib/admissions.ts:158` `getBestTestSignal`
  short-circuits `testPolicy === "blind"` and returns `{ type: null,
  normalized: 0 }`. `compareTests` then returns 0 metrics, so
  `classifyCollege`'s avg falls back to GPA-only.
- **Edge case found:** `src/hooks/useChanceCalculator.ts:191-194`
  penalizes when `testPolicy === "required"` and no scores. UCs are
  `"blind"` so this doesn't fire — good.
- **In-state vs OOS gap:** No residency field on profile or College.
  Acceptance rates stored are overall (heavily OOS-weighted for elite
  UCs). NEW finding — needs flagging.
- **Proposed fix:** For Feature 1, accept the gap. Surface as low-
  confidence for any UC where the user has no California address signal.
  **Defer the in-state/OOS split** — needs a `residency: "ca-resident" |
  "non-resident" | "unknown"` profile field plus per-UC dual rates.
  That's its own feature.
- **Blocking:** NO — known limitation, document it.
- **Recommendation:** Defer in-state/OOS split. W4 surfaces low-confidence
  note.

### D. Program-specific admit rates
- **Confirmed:** No `programs` field exists. The closest is
  `src/data/colleges.ts` `competitiveMajors: string[]` (just a name list)
  which gets a flat -4 fit penalty in `src/lib/admissions.ts:255-260`.
  Not a probability adjuster.
- **Proposed fix:** Add `readonly programs?: readonly { name: string;
  acceptanceRate: number; year?: number }[]` to College. Empty for all
  schools in Feature 1. Surfaces low-confidence note when user's chosen
  major matches a known competitive program at the school. Per-program
  data sourcing is a separate workstream.
- **Blocking:** NO (structural support only, no data populated).
- **Recommendation:** Add field in W4. Defer per-program data.

### E. Test-optional handling
- **Currently correct:** Missing test ≠ below p25 —
  `src/lib/admissions.ts:153` `getBestTestSignal` returns `metrics: 0`
  when no test, so classifier averages over GPA only, not over `[gpa, 0]`.
- **Confidence dropped to medium when test is missing:** Currently
  computed in `src/hooks/useChanceCalculator.ts:280-282` as
  `metrics >= 3 ? high : metrics >= 1 ? medium : low`. With no test,
  metrics is 1 (GPA only) → `medium` ✓.
- **Edge:** New chance model needs to mirror this behavior explicitly.
  Plus the SPEC: when test-policy is "optional" AND no test submitted,
  widen the uncertainty band on the chance range.
- **Blocking:** NO — works in legacy. W4 must preserve this in new model.
- **Recommendation:** Document in W4 implementation.

### F. Five-tier classification cliff
- **Current state:** `src/lib/admissions.ts:315-324` — schools <15%
  acceptance always cap at "target" (Cornell 7%, Vandy 5%, JHU 5% all
  currently cap here). Schools <30% always cap at "likely". This is
  hard cliffs.
- **Spec change:** Sub-10% caps at "reach" (one tier down from current).
  10–15% bracket is "reach, leaning target".
- **Cliff vs smoothed:** Recommend keeping it hard. Smoothing introduces
  another tunable parameter that obscures the rule. Use the chance range
  to express uncertainty (e.g. Cornell shows "8–14% chance, reach")
  instead of inventing an in-between tier.
- **Decision needed:** Confirm hard cliff at 10% boundary.
- **Blocking:** NO — clarification needed.
- **Recommendation:** Hard cliff, document in W4.

### G. Data freshness
- **Already partially exists:** `src/data/cds-data.ts` has `cdsYear:
  string` per school ("2024-2025", "2025-2026"). 33 schools at 2024-
  2025, 19 at 2025-2026. **Stale outliers:** Northeastern 2020-2021,
  UCLA 2019-2020, Stevens 2022-2023, Virginia Tech 2023-2024, Pepperdine
  `<UNKNOWN>`.
- **Not exposed on College:** The merge in `src/data/colleges.ts:284-
  290` doesn't propagate cdsYear to the College surface.
- **Proposed fix:** Add `readonly dataYear?: number` to College.
  Populate during merge by parsing the trailing year from `cds.cdsYear`
  ("2024-2025" → 2025). For non-CDS schools, leave undefined — chance
  model surfaces "data may be stale" when undefined or older than 2
  academic cycles.
- **Blocking:** NO.
- **Recommendation:** Add field in W1 (alongside CDS sync), use in W4.

### H. UI honesty
- **Currently insufficient:** No low-confidence visual differentiation.
  `/colleges` disclaimer is buried inside the "i" expander
  (`src/app/colleges/page.tsx:130`). Yield-protected schools have no
  callout. Fallback estimates not labeled.
- **Proposed for W4:**
  1. Low-confidence rows in CollegeCard: muted color (`text-zinc-500`
     instead of tier color), prominent "Low confidence" label.
  2. Always-visible disclaimer at top of `/colleges` (not behind
     expander).
  3. Yield-protected card note: small "May consider demonstrated
     interest".
  4. ED/EA fallback labels: "ED estimate based on overall trends" badge
     when school's `edAdmitRate` is missing.
- **Blocking:** YES for W4 design. NO for W0/W1.
- **Recommendation:** W4 implementation.

---

## Category 4 — Other findings

### Finding 4.1 — Hook profile fields don't exist
- **Issue:** No `firstGen`, `legacyParent`, `recruitedAthlete` on profile.
  Confirmed via grep.
- **Proposed fix:** Add `firstGen?: boolean`, `legacyParent?: boolean`,
  `recruitedAthlete?: boolean` to UserProfile in
  `src/lib/profile-types.ts`. Defer the `/profile` UI (per Decision 1).
- **Blocking for W4 math:** YES — math reads them. Defer UI.
- **Recommendation:** Add in W4 (W2 sources the values).

### Finding 4.2 — `legacyConsidered` College field needed
- **Issue:** No way to flag MIT, Caltech, UCs, JHU, Amherst, Tufts as
  "do not consider legacy". Need this to gate the legacy multiplier.
- **Proposed fix:** Add `readonly legacyConsidered?: boolean` to College.
  Treat undefined as `true` (consider). Set explicitly `false` for: MIT,
  Caltech, all UCs, Johns Hopkins, Amherst, Tufts (verify each in W2).
- **Blocking:** YES if legacy bump ships. Per SPEC, **legacy bump is
  deferred to a future feature** with TODO. So the field is structural-
  only in W4.
- **Recommendation:** Add field in W4. Populate values in W2.

### Finding 4.3 — `scoreToBand` thresholds are fitScore-based
- **Issue:** `src/lib/admissions.ts:352-358` — bands based on 0-100
  fitScore (75 = strong, 60 = competitive, etc.). After fitScore
  removal, need band thresholds based on actual probability (e.g. ≥75%
  chance = "strong").
- **Proposed fix:** Rewrite `scoreToBand(chancePct: number): ChanceBand`
  for new chance model. Old function kept temporarily for legacy
  `useChanceCalculator`.
- **Blocking:** YES for W4.

### Finding 4.4 — `selectivityPenalty` arbitrary point bumps
- **Issue:** `src/lib/admissions.ts:218-241` — fixed point bumps (-15,
  -10, -5, +8) on 0-100 scale. Used by `useChanceCalculator` only. Once
  fitScore-as-chance is gone, this is legacy-only.
- **Proposed fix:** Leave with `// @deprecated` comment. New chance
  model uses base `acceptanceRate` directly (no penalty layer —
  acceptance rate IS the base).
- **Blocking:** NO.

### Finding 4.5 — `EC_BAND_ADJUSTMENT` rule-of-thumb
- **Issue:** `src/hooks/useChanceCalculator.ts:236-242` — fixed +10/+6/
  +2/-3/-6 point bumps for EC bands. Same rule-of-thumb concern as the
  stat-band multipliers.
- **Proposed fix:** For new chance model in W4, bake EC band into the
  multiplier system, label as "rule-of-thumb until W3 sources empirical
  EC effects." Note: published research on EC effect size is even
  sparser than stat-band data — may stay rule-of-thumb permanently.
- **Blocking:** NO. Flag in W4.

### Finding 4.6 — `essayScoreAdjustment` rule-of-thumb
- **Issue:** `src/lib/admissions.ts:362-405` — point bumps based on
  essay scores. Applied to fitScore in `classifyCollege` AND directly to
  score in `useChanceCalculator`. Rule-of-thumb.
- **Proposed fix:** For new model, fold essay into the multiplier
  system. Same "rule-of-thumb" treatment.
- **Blocking:** NO.

### Finding 4.7 — Strategy share view + cached strategy results
- **Issue:** Strategy results may be cached in localStorage with
  `fitScore` field on pinned schools (legacy snapshots). Removing the
  field breaks display of old shares.
- **Confirmed:** `src/components/StrategyShareView.tsx` doesn't
  reference `fitScore` directly. `src/lib/strategy-share-types.ts`
  doesn't either.
- **Risk:** The cached `StrategyAnalysis` JSON in localStorage may
  include `averageFitScore` from older runs. Schema version bump in
  `src/lib/strategy-types.ts STRATEGY_CACHE_VERSION` should force
  regeneration.
- **Proposed fix:** Bump `STRATEGY_CACHE_VERSION` from v4 to v5 in W4
  so all cached strategies regenerate with the new chance-based shape.
- **Blocking:** YES for W4 (otherwise users see crashes on stale cache).

### Finding 4.8 — Compare-engine `FIT_LABELS` prose
- **Issue:** `src/lib/compare-engine.ts:401-409` — "Solid Fit",
  "Target", "Reach", "Long Shot" prose tied to classification.
- **Proposed fix:** Keep labels (they correspond to classification, not
  fitScore). Display switches to chance midpoint per Finding 2.3.
- **Blocking:** NO.

### Finding 4.9 — Default classification when zero metrics
- **Issue:** `src/lib/admissions.ts:327-333` — when user has no GPA + no
  test, classifies purely by `acceptanceRate` (Harvard 3% → "reach",
  Iowa 80% → "safety").
- **Proposed fix:** New chance model in W4: when user has no metrics,
  return chance = (`acceptanceRate` ± wide band) with confidence =
  "low". Don't promise a tier classification when we have no data —
  output "Insufficient data" tier.
- **Blocking:** NO.
- **Recommendation:** New tier label in W4.

### Finding 4.10 — `competitiveMajors[]` is mostly empty
- **Spot check:** All Ivies have `competitiveMajors: []`
  (`src/data/colleges.ts:9-13`). The -4 fit penalty fires on zero
  schools currently.
- **Implication:** The current major-aware penalty is unused in
  practice. The new program-specific admit rates (Item D) is the right
  replacement.
- **Blocking:** NO.

---

## Category 5 — CDS sync impact

The pre-sync audit:
- **53 schools need extraction** (50 missing + 3 empty re-runs:
  pepperdine_university, southern_methodist_university, ucla)
- `eaAdmitRate` 0/57 populated (CDS Section C21 doesn't reliably split
  EA — structural gap)
- `edAdmitRate` 25/57 populated
- `regularDecisionAdmitRate` 6/57 populated
- 5 schools with stale or unknown CDS year (Northeastern, UCLA, Stevens,
  Virginia Tech, Pepperdine)

No new findings here from the deeper audit — the sync work plan is
unchanged.

---

## Plan changes for W1–W4

| Workstream | Plan changes from original |
|---|---|
| **W1** | Add: REA list fixes (Findings 1.1, 1.2). Add: `dataYear?: number` field on College + populate from cdsYear during merge. Run sync (3 force + 50 missing) as planned. |
| **W2** | Add: verify the 11 yield-protected schools against multiple sources. Add: verify the legacy-blind schools list (MIT, Caltech, UCs, JHU, Amherst, Tufts). Hook research as planned (recruited-athlete pathway = special handling, legacy = deferred, first-gen = deferred). |
| **W3** | Empirical stat-band multipliers as planned. **No change.** |
| **W4** | Big addition: full fitScore removal from 9 files (Findings 2.1–2.8). Plus: hook profile fields, College fields (yieldProtected, legacyConsidered, programs, dataYear), STRATEGY_CACHE_VERSION bump, low-confidence UI treatment, leverage-based ED ranking, scoreToBand rewrite for chance %. **Implementation surface much bigger than originally scoped — should be 5–8 commits, not 1.** |

---

## Decisions needed before W1 sync run kicks off

1. **`applicationPlanAdjustment` fate** (Finding A): defer-with-deprecation
   OR delete-and-touch-`/chances` now? Recommendation: defer with
   deprecation comment.
2. **Five-tier cliff at 10%** (Finding F): hard cliff or smoothed?
   Recommendation: hard cliff.
3. **In-state/OOS UC handling** (Finding C): defer to a separate feature,
   OR ship a residency profile field now? Recommendation: defer.
4. **Greenlight to apply REA fixes (Findings 1.1, 1.2)** before kicking
   off sync? They're independent of the sync run — could land first as a
   one-line commit on a `data:` branch.
5. **Greenlight to kick off the sync run** (~$1–3 in Anthropic, ~20 min
   wall clock)?

After greenlight on #1–#5, execute W1 and report back with sync results +
spot-checks before W2.
