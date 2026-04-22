# LLM-Driven College Majors Enrichment

**LOCALHOST DEV ONLY.** This pipeline calls the Anthropic API on every
college in the dataset. Do not run from CI, do not run from production,
do not run unattended.

## What it does

The hand-curated `topMajors` and `knownFor` fields in
[`src/data/colleges.ts`](src/data/colleges.ts) and
[`src/data/college-extended.ts`](src/data/college-extended.ts) are
intentionally shallow (typically 3 entries per school). That sparseness
caused the major-fit matcher to misrank schools — most famously
Stanford ranked below UF for Biomedical Engineering because both schools
list a generic "Engineering" parent and the matcher had nothing to
distinguish them on.

The enrichment pipeline asks Sonnet 4.6 to fill that gap once per
school with deeper, normalized data:

- 5–8 `topMajors` from the canonical [`MAJORS`](src/lib/college-types.ts) allowlist
- 3–6 `knownFor` academic descriptors (programs, sub-fields, research areas)
- A 0.0–1.0 confidence score
- A short rationale (`notes`)

Output → [`src/data/college-majors.json`](src/data/college-majors.json).

The runtime matcher reads this file and merges it under "curated wins
on conflict, enriched appends where curated is sparse." Hand-curated
data is never overwritten — the JSON is purely additive.

## Files in this pipeline

| File | What |
|---|---|
| [`scripts/enrich-college-majors.ts`](scripts/enrich-college-majors.ts) | The runner. Resumable, rate-limited, validation-instrumented. |
| [`src/data/college-majors.json`](src/data/college-majors.json) | Generated output. Empty stub committed here; populated version committed by the operator separately. |
| [`src/data/college-majors.dryrun.json`](src/data/college-majors.dryrun.json) | Throwaway dry-run output. Gitignored. |
| [`src/lib/college-majors-enriched.ts`](src/lib/college-majors-enriched.ts) | Runtime accessor. Filters out `needsReview = true` rows. |
| [`src/lib/major-match.ts`](src/lib/major-match.ts) | The merger. Two `bestContainSpecificity` calls per field — curated, then enriched-only. |
| `VALIDATION_REPORT.md` | Generated at end of every run. Categorized list of every flag fired. |
| `VALIDATION_REPORT.dryrun.md` | Same for dry-runs. Gitignored. |

## Prerequisites

- `ANTHROPIC_API_KEY` set in `.env.local` or your shell env.
- A clean git working tree on the branch you want the output committed to. The pipeline commits nothing — that's your job — but a clean tree makes diffs trivial to review.

## How to run

### Step 1 — Dry run (always do this first)

```sh
npm run enrich:colleges -- --dry-run
```

This:
- Processes the first 3 schools only.
- Writes to `src/data/college-majors.dryrun.json` (gitignored — never affects the real cache).
- Writes `VALIDATION_REPORT.dryrun.md` (gitignored).
- Echoes the raw LLM response for each school to stdout so you can sanity-check the JSON shape, the major selections, and the confidence calibration.

Read the raw output. If it looks sensible (right majors, plausible confidence, in-allowlist), proceed to step 2. If it looks off, stop and tell me.

### Step 2 — Full run

```sh
npm run enrich:colleges
```

This:
- Processes every school in [`src/data/colleges.ts`](src/data/colleges.ts) — currently around 430.
- Writes to `src/data/college-majors.json` after every successful row (atomic — a crash never leaves a half-written file).
- Resumable: re-running skips schools already present in the cache. If the script dies at school #200, just re-run and it picks up at #201.
- Rate-limited at 1 request per second (~7 minutes total).
- Writes `VALIDATION_REPORT.md` at the end.

The first 5 schools' raw responses are also echoed to stdout for the same sanity-check reason. After that the per-row output is one summary line per school.

You can `Ctrl-C` at any time. The cache is durable — the next run picks up where you stopped.

### Targeted runs

```sh
# Re-run a specific school (won't help if it's cached — delete its entry first)
npm run enrich:colleges -- --only "Stanford University"

# Re-run a few
npm run enrich:colleges -- --only "MIT,Yale University,Columbia University"

# First N (after dry-run, useful for incremental rollout)
npm run enrich:colleges -- --limit 50
```

## How to review the validation report

Open `VALIDATION_REPORT.md` after the run. The summary table tallies five flag categories:

| Flag | What it means | Action |
|---|---|---|
| **Allowlist drops** | LLM returned a `topMajors` value not in [`MAJORS`](src/lib/college-types.ts). Filtered out before writing the cache. | Spot-check — are there real majors we should add to the allowlist? Or just LLM noise? |
| **Missing-curated warnings** | Hand-curated `topMajors` entries the LLM didn't return. May indicate either a better LLM read on the school OR an "invented profile" failure. | Spot-check the affected school's row in the JSON. If curated is right and LLM is wrong, set `needsReview: true` manually. |
| **Breadth-rank mismatches** | Schools with rank > 100 that returned > 5 `topMajors`. Advisory only — does NOT set `needsReview`. | Skim the list. If a school looks suspicious, manually inspect. |
| **Low-confidence rows** | LLM returned `confidence < 0.7`. Already flagged `needsReview: true` and excluded from runtime scoring. | No action required unless you want to manually clear specific rows after verifying. |
| **Parse failures / Timeouts / Errors** | Network / rate-limit / parse issues. Re-run to retry — these aren't cached. | Re-run `npm run enrich:colleges`. The resumable cache picks them up. |

## How to clear `needsReview` manually

After spot-checking a low-confidence row in `src/data/college-majors.json`:

1. Open the file.
2. Find the school by name.
3. Set `"needsReview": false`.
4. Save + commit.

The runtime will start using that row on the next page load.

## How to re-run the whole thing

The cache is the source of truth for "what's done". To force a full regen:

```sh
rm src/data/college-majors.json
git checkout src/data/college-majors.json   # restore the empty stub
npm run enrich:colleges
```

To force regen of one school:

1. Open `src/data/college-majors.json`.
2. Delete that school's entry from `schools`.
3. Re-run `npm run enrich:colleges` (it'll process only the missing one).

To force regen because the prompt or schema changed:

1. Bump `SCHEMA_VERSION` in [`scripts/enrich-college-majors.ts`](scripts/enrich-college-majors.ts).
2. Old caches will be detected as version-mismatched and rebuilt from scratch.

## What this pipeline deliberately does NOT do

- **Does not modify** [`src/data/colleges.ts`](src/data/colleges.ts) or [`src/data/college-extended.ts`](src/data/college-extended.ts). Hand-curated data stays the source of truth. Enrichment is purely additive via [`src/data/college-majors.json`](src/data/college-majors.json).
- **Does not enrich** `careerPipelines` or `topIndustries`. These are the most hallucination-prone fields. Keep hand-curated.
- **Does not commit** the output JSON or the validation report. The operator commits both manually after spot-checking.
- **Does not retry on timeout.** A 30-second-aborted school is logged + skipped; re-run to pick it up.
- **Does not change the public API** of [`computeMajorFit`](src/lib/major-match.ts), `computeMajorFitScore`, or `getMajorMatch`. Runtime merge is internal.

## Cost

Sonnet 4.6 with prompt caching:
- ~2,000 input tokens of system prompt + allowlist (cached after first call → 90% cost reduction)
- ~150 output tokens per school
- Total for ~430 schools: **~$1.30**

If you re-run because the schema changed (full regen), it's another $1.30. Cheap.
