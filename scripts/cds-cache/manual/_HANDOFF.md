# CDS Manual-Entry Handoff

**Branch:** `redesign/linear` (clean, all pushed to origin as of last commit `259ae8b`)
**Working dir:** `/private/tmp/college-prep-list`

---

## Goal

Process CDS files dropped in `scripts/cds-cache/manual/` and merge their data
into `src/data/cds-data.ts` so the chance model uses authoritative published
numbers instead of hand-curated estimates.

The user is filling this folder with PDFs + Excel files + at least one
combined PDF (`CDS.pdf`) holding several schools' CDS extracts.

---

## What's in this folder right now

```bash
ls scripts/cds-cache/manual/
```

Each file is a single school's published Common Data Set, except `CDS.pdf`
which is a Google-Doc export holding multiple schools (the user batches
2-4 schools per export).

Filenames don't always match the codebase's exact school names — match by
checking each file's first page (PDF) or first sheet (XLSX) for the school
name, then map to the corresponding entry in `src/data/colleges.ts`.

---

## Field schema to extract per school

From CDS Sections B (enrollment), C (admissions), D (graduation),
optionally I (faculty), each entry needs these fields. Match the existing
shape in `src/data/cds-data.ts`:

```ts
"<School Name>": {
  cdsYear: "2024-2025",   // or whatever year is on the document
  sourcePdfUrl: "<URL if known, else the file's basename>",
  data: {
    acceptanceRate: <C1: admits / applicants × 100>,
    yield: <C1: enrolled / admits × 100>,
    edAdmitRate: <C7 if school has ED — else omit>,
    eaAdmitRate: <C8 if school has EA — else omit>,
    regularDecisionAdmitRate: <only when reported separately, else omit>,
    sat25: <C9 SAT total 25th>,
    sat75: <C9 SAT total 75th>,
    act25: <C9 ACT composite 25th>,
    act75: <C9 ACT composite 75th>,
    avgGPACDS: <C12 average HS GPA — frequently null, omit if so>,
    top10HSPercent: <C11>,
    pctTopTenClass: <same as top10HSPercent — duplicate convention>,
    studentFacultyRatio: <Section I — single number>,
    fourYearGradRate: <Section D 4-year rate>,
    undergradPopulation: <Section B1 total undergrads>,
    inStatePercent: <Section B>,
    percentInternational: <Section B non-resident alien %>,
    demographics: {
      white, asian, hispanic, black, multiracial, international, other,
    },
    genderBreakdown: { male, female },
  },
},
```

Look at any existing entry in `src/data/cds-data.ts` (e.g. Boston College
at line 23-27) to match the format exactly. Use `Partial<College>` — fields
not reported on the CDS should be omitted entirely (not set to null).

---

## Merge approach

`scripts/cds-sync.ts` exists for URL-based sync, but for manual files just
write a small node script:

1. Read existing `src/data/cds-data.ts`, parse out the `CDS_DATA` object literal.
2. For each new school, build a CDSEntry object.
3. Merge into the existing object (replacing any existing entry by the same
   school name, leaving other 55+ entries alone).
4. Write back the same file with the schema header preserved + entries
   sorted alphabetically by school name.

A reference merge implementation that worked correctly already exists in
the git history (commit `ace13da` — refresh of stale entries). Pattern:

```js
const fs = require("fs");

function loadCdsObject(path) {
  const raw = fs.readFileSync(path, "utf8");
  const m = raw.match(/export const CDS_DATA[^=]*=\s*(\{[\s\S]*\});\s*$/m);
  if (!m) throw new Error("CDS_DATA export not found in " + path);
  return eval("(" + m[1] + ")");
}

const existing = loadCdsObject("src/data/cds-data.ts");
const newEntries = { /* the schools you just extracted */ };
Object.assign(existing, newEntries);

const keys = Object.keys(existing).sort();
let out = `<schema header from current file>`;
for (const k of keys) {
  const e = existing[k];
  out += `  ${JSON.stringify(k)}: {\n`;
  out += `    cdsYear: ${JSON.stringify(e.cdsYear)},\n`;
  out += `    sourcePdfUrl: ${JSON.stringify(e.sourcePdfUrl)},\n`;
  out += `    data: ${JSON.stringify(e.data)},\n`;
  out += `  },\n`;
}
out += `};\n`;
fs.writeFileSync("src/data/cds-data.ts", out);
```

---

## How to extract from each file type

- **PDF**: Read with the Read tool. PDFs are multimodal — actual document
  pages render. For long PDFs (>10 pages) pass `pages: "1-12"` to Read.
- **XLSX**: Use Bash with the project's `xlsx` package, e.g.
  `node -e "const xlsx=require('xlsx'); const w=xlsx.readFile('path.xlsx');
   console.log(JSON.stringify(xlsx.utils.sheet_to_json(w.Sheets[w.SheetNames[0]],
   {defval:null}).slice(0,80)));"`. The Section C admissions sheet is usually
  the most data-dense.
- **CDS.pdf** (combined): each school's CDS is delineated by header pages.
  Find the school-name header on each page, extract the relevant rows,
  treat as if it were N separate single-school PDFs.

---

## Workflow per batch

1. List files in `manual/` not yet in `cds-data.ts`.
2. Pick a batch of 5-10. For each:
   - Read the file. Identify the school + CDS year.
   - Extract the fields in the schema above. Keep notes on what's missing.
3. Run a node merge script that injects the new entries.
4. Run `npx tsc --noEmit` to confirm no schema breakage.
5. `git add src/data/cds-data.ts && git commit -m "feat(cds): add CDS for <schools>"`.
6. Push.
7. Repeat with next batch until `manual/` is empty.

---

## State at handoff

- 13 files + 1 multi-school PDF — all processed (moved to `manual/processed/`).
- `cds-data.ts` now has 69 schools (was 55). 14 added across 3 batches:
  JHU, Drexel, UCR, UMiami, WPI; Rutgers, FIU, Buffalo, FSU, MIT;
  UC Berkeley, UC Merced, NJIT, Yeshiva.
- Build is green at HEAD.
- For the next batch: drop new files into this directory and follow the
  workflow below. The 21 schools added in `259ae8b` still need CDS for
  several of them.

---

## Important contract notes

- `cds-data.ts` field values **override** `colleges.ts` estimates at runtime
  via the layer chain in `src/data/colleges.ts`. So once a school gets a
  CDS entry, the chance model picks it up automatically.
- `acceptanceRate` in CDS data takes precedence over the hand-curated
  number in `colleges.ts`. Common gotcha: ensure CDS year matches what
  the school publishes; use admits ÷ applicants formula explicitly.
- When `edAdmitRate` is set, `getBaseRateForPlan` in `admissions.ts` uses
  it directly for ED/ED2 plans. So setting it accurately matters more
  than RD numbers.

---

## Background on this branch (if context-light)

This is the `redesign/linear` branch — Linear-derived design system.
Recent commits include scrollbar-gutter fix, landing theme-awareness,
school-history blend kill-switch, CDS refresh for Northeastern/Stevens/GWU/
Virginia Tech, addition of 21 top-100 schools missing from the catalog,
and per-plan ED chance cap. See `git log --oneline -20` for the full
arc.

The user's overall goal: get the chance model anchored to authoritative
CDS data for as many of the US-News-top-109 schools as possible, with
accurate ED admit rates so the per-plan cap fix isn't fighting bad data.
