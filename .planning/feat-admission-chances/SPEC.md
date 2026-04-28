# feat/admission-chances — SPEC

Direction-change spec sourced from the user's planning conversation. Every
multiplier in code MUST cite a verifiable source. If a number can't be sourced,
surface as low-confidence rather than guess.

## Workstream order

W1 → W2 → W3 → W4. Don't skip. Don't proceed to the next workstream without
explicit greenlight after reporting back from the prior one.

---

## Workstream 1 — Complete CDS sync

- Identify the schools in `scripts/cds-urls.json` not yet extracted in
  `scripts/cds-cache/extractions/`.
- Run `npm run sync:cds -- --only "..." --force` for the 3 empty extractions
  first (Pepperdine, SMU, UCLA).
- Then `npm run sync:cds` (no flags) for the 50 missing schools.
- Confirm `edAdmitRate`, `eaAdmitRate`, `regularDecisionAdmitRate` are populated
  in `src/data/cds-data.ts` for as many schools as possible.
- After completion: report final coverage numbers and spot-check 3 random
  extractions against source PDFs before W2.
- Commit: `data: complete CDS sync for remaining schools`

### Plus, in W1:
- Apply REA list fixes (see Category 1 of `W0-AUDIT.md`)
- Add `dataYear?: number` field on College and populate from `cdsYear`
  during merge in `src/data/colleges.ts`

---

## Workstream 2 — Hook bump research (sourced from public data only)

Build `src/data/hook-multipliers.ts` with per-school or per-tier values, with
inline citation comments per school.

### Recruited athletes — separate track, NOT a bump
- **Verified:** Harvard SFFA court documents show ~86% admit rate for
  recruited athletes regardless of academic profile (Harvard Crimson, court
  filings).
- **Implementation:**
  - When `profile.recruitedAthlete === true`, do NOT run the normal chance
    model.
  - Output a special result: "Recruited athlete pathway — typical admission
    ~70-85% at top schools, contact coaches for school-specific likelihood.
    This estimate is for non-recruited applicants."
  - Show normal chance below as "if not recruited, your stats-based estimate
    is..." for transparency.

### Legacy — multiplicative, school-specific, deferred
- **Verified:** Harvard SFFA court documents (Class of 2014-2019 data) show
  33.6% legacy admit rate vs ~6% non-legacy = 5.6x boost at Harvard.
- **Post-SFFA context:** Several states (CO, VA, MD, IL) have BANNED legacy
  admissions at public universities. Some schools have publicly stated they
  do NOT consider legacy: MIT, Caltech, UC system, Johns Hopkins, Amherst,
  Tufts. Harvard publicly stated in 2024 they continue to consider legacy.
- **Implementation for Feature 1:**
  - Add `legacyParent: boolean` to UserProfile.
  - Add `legacyConsidered?: boolean` to College (default unset = unknown,
    treat as legacy considered).
  - Set `legacyConsidered: false` explicitly for: MIT, Caltech, all UC
    schools, Johns Hopkins, Amherst, Tufts (verify each from school
    admissions website during W2 research).
  - DEFER the multiplier math to a future feature. Do NOT apply a legacy
    bump in Feature 1's chance calc. Add a TODO with citation pointing to
    SFFA court documents.
  - When implemented later: multiplicative, not additive. Approximate
    Harvard 5x baseline scaled by school's known legacy weight.

### First-gen — research disagrees, deferred
- **Verified:** Studies vary. Some show modest boost at need-conscious
  schools (3–5 percentage point lift). Others show no measurable effect.
  Effect varies dramatically by school. No single citation supports a
  specific multiplier across all schools.
- **Implementation for Feature 1:**
  - Add `firstGen: boolean` to UserProfile.
  - DEFER the math. Do NOT apply a first-gen bump in Feature 1's chance
    calc. Add TODO: "Research disagrees on magnitude. Defer until per-school
    data sourced."

### Profile field handling
- For Feature 1: add the three boolean fields (`firstGen`, `legacyParent`,
  `recruitedAthlete`) to profile shape so the data model is ready.
- Defer the `/profile` UI form for these to a future PR.
- Defer the math (except recruited athlete pathway, which gets the special
  handling above).

### Yield-protected schools (verified separately, list here)

Verified yield-protectors (multiple sources: Top Tier Admissions, Admissions
Laboratory, multiple counselor sources). In W2 each must be re-verified per
school:

- Tufts
- Tulane
- WUSTL (Washington University in St. Louis)
- Case Western
- Northeastern
- BU (Boston University)
- George Washington University
- Lehigh
- American
- Clemson
- Auburn

**Implementation:**
- Add `yieldProtected: boolean` to College for these schools.
- When `true`, cap stat-band multiplier at 1.0x for top-quartile applicants
  (do NOT give the 2.5x bump).
- Optionally apply a small reduction (~10-15%) for elite applicants in RD
  without demonstrated interest signals.
- Surface in CollegeCard: small note "May consider demonstrated interest".

### Commit: `data: hook multipliers from public research`

---

## Workstream 3 — Empirical stat-band multipliers

- Source decile-level admit rate data:
  - College Scorecard has SAT/ACT distributions but not admit-rate-by-decile
    directly.
  - Published research from College Board, Hoxby, others.
  - Common Data Set Section C9/C10 has admit rate by GPA band for some schools.
- Build a calibration table mapping (stat percentile within school's admit
  pool) to (admit rate multiplier vs. base rate).
- Replace the rule-of-thumb 2.5/1.0/0.4/0.15 with empirical values, varying
  by school selectivity tier where data supports it.
- Where empirical data isn't available, note it and use a conservative
  fallback.
- Commit: `data: empirical stat-band multipliers`

---

## Workstream 4 — Build Feature 1 with grounded data

### Five-tier classification
- Output: `unlikely | reach | target | likely | safety`
- Derived from chance midpoint (NOT from stat-band fitScore math).
- **Sub-10% schools cap at "reach"** — agreed.
- Schools 10–15% admit rate (not yield-protected ones, others like USC, NYU):
  leave at natural classification, but flag in elite-profile rule for "reach,
  leaning target".
- Hard cliff at the 10% boundary (recommended over smoothing — see W0 audit
  Finding F).

### Chance midpoint replaces fitScore everywhere
- `classifyCollege` returns `{ classification, reason, chance: ChanceRange,
  confidence: ConfidenceTier }`. Stops returning `fitScore`.
- `ClassifiedCollege.fitScore` removed (40+ touchpoints — see W0 audit
  Category 2).
- Sort chip on `/colleges`: rename "Sort by: Fit Score" → "Sort by: Chance".
  Make chance the default sort. Drop fitScore-based sort.
- `CollegeCard`: remove "FIT 80" entirely. Replace with chance range.
- `/compare` page: "Fit Score" labels → "Chance" labels.
- Strategy engine + prompt: ranking switches from fitScore to chance ×
  leverage (marginal gain `edChance − rdChance`).
- `compare-engine.ts`: replace fitScore-based ranking with chance midpoint.

**Keep:** `majorFit` and `getMajorMatch` fully untouched. The per-major fit
chip ("Strong in CS +2") stays.

### REA/SCEA list (verified Apr 2026)

The COMPLETE list of US schools that offer REA or SCEA — verified Apr 2026.
Cite source URL and class year of the data inline per school.

| School | Plan | Latest published rate | Source notes |
|---|---|---|---|
| Stanford | REA | ~9% est for Class of 2028 (Stanford no longer publishes) | citation comment noting Stanford no longer publishes |
| Harvard | SCEA | 8.74% for Class of 2028 | Harvard CDS / press release |
| Yale | SCEA | 10.91% for Class of 2030 (10.82% for 2029) — use most recent | Yale admissions website |
| Princeton | SCEA | 13.93% for Class of 2023 (last published, estimates 10–11% for recent classes) | Princeton no longer releases SCEA data; note in citation |
| Notre Dame | REA | 12% for Class of 2030 (13% for 2029) — use most recent | Notre Dame admissions website |

**That's the complete list. Five schools. DO NOT add any other school.**

Specifically:
- Boston College does NOT offer REA. BC offers ED only. Use ED handling for BC.
- Georgetown offers regular Early Action (non-restrictive), NOT REA. Use EA
  fallback for Georgetown.
- Caltech does NOT offer REA. Caltech offers EA only as of 2024. Use EA
  fallback for Caltech.
- Any other school not in the five above is not REA-eligible. Verify against
  the school's own admissions website if you encounter ambiguity.

### ED fallback (when school offers ED but no published `edAdmitRate`)

- ED admit rate ≈ overall `acceptanceRate` × 2.5
- **Reasoning:** Penn published data shows Class of 2028 ED admit 14.22% vs
  RD 4.05% = 3.5x. Class of 2027 ED 14.85% vs overall 5.78%. Most ED schools
  cluster 2.5–3x. 2.5x is conservative.
- **Citation:** Penn CDS Class of 2028, AdmissionSight UPenn breakdown 2026.
- Mark in code: "Fallback estimate based on Penn published ED-vs-RD data;
  conservative 2.5x. Replace with sourced edAdmitRate when available."
- Surface as **medium-confidence** (not high) when fallback fires.

### EA fallback (when school offers EA but not REA, no published `eaAdmitRate`)

- EA admit rate ≈ overall `acceptanceRate` × 1.15 (very conservative)
- **Caveat:** EA boost varies widely. MIT EA admits ~6% vs overall ~4% = 1.5x.
  Most schools don't publish split EA/RD, so the 1.15x is a best-guess
  midpoint of "a small but real bump."
- Mark in code: "Fallback estimate; EA-specific data is sparse across schools.
  Replace with sourced eaAdmitRate when available."
- Surface as **medium-confidence**.

### Stat-band multipliers — flagged as not-yet-sourced

The 2.5x / 1.0x / 0.4x / 0.15x stat-band multipliers are NOT data-derived.
Ship with explicit code comments:

> "Rule-of-thumb until empirical decile-level admit data is sourced — see
> Workstream 3."

W3 replaces with empirical values from research sources (College Board
admit-rate-by-decile studies, College Scorecard distribution data, published
research from Hoxby, Avery, Arcidiacono).

### GPA + test combine rule

`min(gpaBandMultiplier, testBandMultiplier)` — **NOT average**. Uneven
profiles don't get the high-stat benefit.

### Confidence tier

Three inputs to confidence:
1. Number of stat metrics provided (GPA, test, rigor)
2. Whether profile data is complete enough (essay, EC band)
3. **Presence of any CDS field counts as the third confidence input**

Where data is missing for a school, surface as low-confidence with an
explicit note (e.g. "ED estimate based on overall trends, not school-specific").

### Test-optional / test-blind

- If profile has GPA but no SAT/ACT: stat-band uses only GPA, **widened
  uncertainty band**.
- Does NOT treat missing test as "below 25th percentile."
- Confidence drops to medium.
- Test-blind schools (UC system): use ONLY GPA.

### UC system test-blind handling

- Stat-band calc uses ONLY GPA when `testPolicy === "blind"`.
- Does NOT fall back to a 0 SAT or treat missing test as below 25th percentile.
- In-state vs OOS UC admit rates differ ~3-4x. UC system publishes by-residency
  data. Sourcing in-state rates can be deferred but flag as known data gap.
  For now, surface as **low-confidence** for OOS-California-resident-mismatch
  applicants.

### Program-specific admit rates

Penn M&T, CMU SCS, UMich Ross, UVA McIntire, Berkeley CS/EECS, Cornell
college splits (CALS, Engineering, Hotel), Northwestern McCormick, JHU BME —
all have program-specific admit rates that differ dramatically from
school-overall.

For Feature 1:
- Add structural support: `programs?: { name: string; acceptanceRate: number;
  year?: number }[]` field on College, optional, empty for now.
- When user has selected such a program, surface low-confidence note.
- Don't source per-program data right now — that's a separate workstream.

### Yield protection

For yield-protected schools (see W2 list):
- Cap stat-band multiplier at 1.0x for top-quartile applicants.
- Optionally apply a small reduction (~10–15%) for elite applicants in RD
  without demonstrated interest signals.
- Surface in CollegeCard: small note "May consider demonstrated interest".

### `applicationPlanAdjustment` legacy handling

The function in `src/lib/admissions.ts` is a fitScore scaler, not a
probability scaler. Per Decision 4 (leave `/chances` page untouched in
Feature 1) AND Decision 6 (legacy `applicationPlanAdjustment` removed when
fitScore is removed):

**Resolution:** Defer removal. Mark `// @deprecated` with TODO referencing
Feature 3 cleanup. The legacy `useChanceCalculator` (which feeds `/chances`)
keeps using it.

### `STRATEGY_CACHE_VERSION` bump

Bump from v4 to v5 in `src/lib/strategy-types.ts` so all cached strategies
regenerate with the new chance-based shape and don't crash on stale
`averageFitScore` field.

### Data freshness

- Add `dataYear?: number` to College (W1 already does this).
- For schools sourced from CDS, set `dataYear` from `cdsYear` (parse "2024-
  2025" → 2025).
- Surface "data may be stale" in low-confidence outputs when `dataYear`
  missing or older than 2 academic cycles.

### UI honesty

- Low-confidence outputs need explicit visual differentiation (muted color,
  prominent "low confidence" label).
- Disclaimer at bottom of `/colleges` visible without scrolling.
- Yield-protected schools: small note in card.
- Schools using ED/EA fallback: label "ED estimate based on overall trends,
  not school-specific".

### Branch + commit + deploy

- Branch: `feat/admission-chances`
- Commit incrementally (5–8 commits expected, per W0 audit).
- Push branch (do NOT merge to main).
- Vercel auto-creates preview deployment.
- Report preview URL with build summary.

---

## Confirmed decisions from planning conversation

1. Hook bump fields (`firstGen`, `legacyParent`, `recruitedAthlete`): add to
   profile shape, defer `/profile` UI to a follow-up
2. "Leverage" for best ED candidate = marginal gain (`edChance − rdChance`)
3. GPA + test combine rule: `min` of the two band multipliers, not average
4. Existing `/chances` page: leave `ChanceForm` and `ChanceResultDisplay`
   untouched in Feature 1, deprecation comments only
5. fitScore is removed from codebase entirely
6. Legacy `applicationPlanAdjustment`: defer with `@deprecated` comment, keep
   for `/chances` page; remove in Feature 3 when `/chances` is rewritten

Confirmed:
- Chance midpoint replaces classification tier on `/colleges`; the ripple
  (Cornell, Vanderbilt, JHU flipping toward "reach" for elite profiles) is
  intentional
- Rewrite `/colleges` TIERS prose to chance ranges
- Presence of CDS field counts as third confidence input

---

## Critical constraints

- Do NOT skip workstreams or sourcing
- Do NOT make up numbers if data isn't available — flag as low-confidence
- Do NOT include any school in REA list except the five above (Stanford,
  Harvard, Yale, Princeton, Notre Dame)
- Do NOT use additive point bumps for legacy or first-gen (multiplicative,
  deferred until research sourced)
- Push branch when ready, do NOT merge to main

---

## Feature 2 (cohort simulator)

DO NOT START until Feature 1 is verified working on Vercel preview URL.
