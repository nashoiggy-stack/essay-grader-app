/**
 * import-school-data.ts
 *
 * Reads a (real or synthetic) Scoir-format CSV of historical applications
 * from one feeder high school, normalizes it, anonymizes it, and aggregates
 * per (collegeSlug, appType). Output is committed JSON consumed by the chance
 * model in src/lib/admissions.ts.
 *
 * Usage:
 *   tsx scripts/import-school-data.ts \
 *     --input /tmp/test-scoir.csv \
 *     --output src/data/school-specific-data.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { COLLEGES } from "../src/data/colleges";

// ── Slug helper ──────────────────────────────────────────────────────────────
// The codebase identifies colleges by `name` (string), not slug. We synthesize
// a slug from the canonical name for the imported JSON keying so that downstream
// consumers don't have to deal with name punctuation/case.
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Alias map ────────────────────────────────────────────────────────────────
// Generated once at import time from the College list + manual overrides. The
// real CSV will have whatever spelling the counselor or Scoir uses; we map all
// known variants to the canonical College.name.
//
// Maintenance: when a new alias is observed in real data and skipped, add it
// here. We persist this map in src/data/college-name-aliases.json so the
// generator and import pipeline share the source of truth.
function buildAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const college of COLLEGES) {
    // Always include the canonical name itself, plus a normalized form.
    map.set(normalize(college.name), college.name);
    // Common stripping: remove "University", "College" suffix.
    const noSuffix = college.name
      .replace(/\s+(University|College)$/, "")
      .trim();
    if (noSuffix !== college.name) {
      map.set(normalize(noSuffix), college.name);
    }
    if (college.aliases) {
      for (const alias of college.aliases) {
        map.set(normalize(alias), college.name);
      }
    }
  }
  // Manual overrides for common Scoir spellings the heuristics miss. This is
  // the table to grow when import skips warn about unknown colleges.
  const manual: Record<string, string> = {
    "penn": "University of Pennsylvania",
    "upenn": "University of Pennsylvania",
    "u of penn": "University of Pennsylvania",
    "u penn": "University of Pennsylvania",
    "ucla": "UCLA",
    "uc berkeley": "UC Berkeley",
    "berkeley": "UC Berkeley",
    "cal": "UC Berkeley",
    "uc san diego": "UC San Diego",
    "ucsd": "UC San Diego",
    "uc davis": "UC Davis",
    "ucd": "UC Davis",
    "uc irvine": "UC Irvine",
    "uci": "UC Irvine",
    "uc santa barbara": "UC Santa Barbara",
    "ucsb": "UC Santa Barbara",
    "wustl": "Washington University in St. Louis",
    "washu": "Washington University in St. Louis",
    "wash u": "Washington University in St. Louis",
    "georgia tech": "Georgia Tech",
    "gt": "Georgia Tech",
    "michigan": "University of Michigan",
    "umich": "University of Michigan",
    "u of m": "University of Michigan",
    "uva": "University of Virginia",
    "u of virginia": "University of Virginia",
    "unc": "UNC Chapel Hill",
    "unc chapel hill": "UNC Chapel Hill",
    "carolina": "UNC Chapel Hill",
    "northwestern": "Northwestern University",
    "nw": "Northwestern University",
    "nyu": "NYU",
    "bu": "Boston University",
    "bc": "Boston College",
    "northeastern": "Northeastern University",
    "neu": "Northeastern University",
    "wisconsin": "University of Wisconsin-Madison",
    "uw madison": "University of Wisconsin-Madison",
    "uw-madison": "University of Wisconsin-Madison",
    "umass amherst": "UMass Amherst",
    "umass": "UMass Amherst",
    "uiuc": "UIUC",
    "illinois": "UIUC",
    "u illinois": "UIUC",
    "purdue": "Purdue University",
    "ut austin": "UT Austin",
    "texas": "UT Austin",
    "rutgers": "Rutgers University",
    "rutgers nb": "Rutgers University",
    "psu": "Penn State",
    "penn state": "Penn State",
    "ohio state": "Ohio State University",
    "osu": "Ohio State University",
    "asu": "Arizona State University",
    "u of arizona": "University of Arizona",
    "arizona": "University of Arizona",
    "u washington": "University of Washington",
    "uw": "University of Washington",
  };
  for (const [k, v] of Object.entries(manual)) {
    map.set(normalize(k), v);
  }
  return map;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

// ── Outcome normalization ────────────────────────────────────────────────────
function normalizeOutcome(raw: string): "Accepted" | "Denied" | "Waitlisted" | null {
  const s = raw.trim().toLowerCase();
  if (["accepted", "admitted", "adm", "admit", "a"].includes(s)) return "Accepted";
  if (["denied", "rejected", "rej", "deny", "d", "r"].includes(s)) return "Denied";
  if (["wl", "waitlist", "waitlisted", "w"].includes(s)) return "Waitlisted";
  return null;
}

// ── App type normalization ───────────────────────────────────────────────────
function normalizeAppType(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (["ED", "ED1", "EARLY DECISION"].includes(s)) return "ED";
  if (["ED2", "ED II", "EARLY DECISION 2"].includes(s)) return "ED2";
  if (["EA", "EARLY ACTION"].includes(s)) return "EA";
  if (["REA", "RESTRICTIVE EARLY ACTION"].includes(s)) return "REA";
  if (["SCEA", "SINGLE-CHOICE EA"].includes(s)) return "SCEA";
  if (["RD", "REGULAR", "REGULAR DECISION"].includes(s)) return "RD";
  if (["ROLLING", "ROL"].includes(s)) return "Rolling";
  return s; // pass-through; unknown types still aggregate, just with their raw label
}

// ── Aggregation ──────────────────────────────────────────────────────────────
interface RawApp {
  collegeName: string;
  collegeSlug: string;
  appType: string;
  outcome: "Accepted" | "Denied" | "Waitlisted";
  gpaWeighted: number | null;
  gpaUnweighted: number | null;
  sat: number | null;
  act: number | null;
  classYear: number;
}

interface AggregateRecord {
  collegeName: string;
  collegeSlug: string;
  appType: string;
  totalApplicants: number;
  totalAdmits: number;
  totalDenied: number;
  totalWaitlisted: number;
  schoolAdmitRate: number;
  admittedAvgGPA: number | null;
  admittedAvgSAT: number | null;
  admittedAvgACT: number | null;
  admittedGPARange: readonly [number, number] | null; // 5th-95th percentile
  admittedSATRange: readonly [number, number] | null;
  admittedStdGPA: number | null;
  admittedStdSAT: number | null;
  rawDataPoints: readonly {
    gpaWeighted: number | null;
    sat: number | null;
    act: number | null;
    outcome: "Accepted" | "Denied" | "Waitlisted";
    classYear: number;
  }[];
  // Confidence label driven purely by sample size — see chance integration
  // for how this surfaces in the breakdown panel.
  sampleSizeLabel: "limited" | "moderate" | "strong";
}

// 5th/95th percentile (linear interpolation). Skips when n<2.
function percentile(values: readonly number[], p: number): number | null {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const variance =
    values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function aggregate(apps: readonly RawApp[]): AggregateRecord[] {
  const byKey = new Map<string, RawApp[]>();
  for (const app of apps) {
    const key = `${app.collegeSlug}::${app.appType}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(app);
  }

  const records: AggregateRecord[] = [];
  for (const [, group] of byKey) {
    const first = group[0]!;
    const admits = group.filter((a) => a.outcome === "Accepted");
    const totalApplicants = group.length;
    const admittedGpas = admits.map((a) => a.gpaWeighted).filter((v): v is number => v != null);
    const admittedSats = admits.map((a) => a.sat).filter((v): v is number => v != null);
    const admittedActs = admits.map((a) => a.act).filter((v): v is number => v != null);

    const sampleSizeLabel: "limited" | "moderate" | "strong" =
      totalApplicants < 10 ? "limited" : totalApplicants < 20 ? "moderate" : "strong";

    // Skip avg/range computation when admit count <2 — too noisy to display.
    const enoughAdmits = admits.length >= 2;
    const gpaRange =
      enoughAdmits && admittedGpas.length >= 2
        ? ([percentile(admittedGpas, 5)!, percentile(admittedGpas, 95)!] as const)
        : null;
    const satRange =
      enoughAdmits && admittedSats.length >= 2
        ? ([percentile(admittedSats, 5)!, percentile(admittedSats, 95)!] as const)
        : null;

    records.push({
      collegeName: first.collegeName,
      collegeSlug: first.collegeSlug,
      appType: first.appType,
      totalApplicants,
      totalAdmits: admits.length,
      totalDenied: group.filter((a) => a.outcome === "Denied").length,
      totalWaitlisted: group.filter((a) => a.outcome === "Waitlisted").length,
      schoolAdmitRate: totalApplicants > 0 ? admits.length / totalApplicants : 0,
      admittedAvgGPA: enoughAdmits ? mean(admittedGpas) : null,
      admittedAvgSAT: enoughAdmits ? mean(admittedSats) : null,
      admittedAvgACT: enoughAdmits ? mean(admittedActs) : null,
      admittedGPARange: gpaRange,
      admittedSATRange: satRange,
      admittedStdGPA: enoughAdmits ? stddev(admittedGpas) : null,
      admittedStdSAT: enoughAdmits ? stddev(admittedSats) : null,
      rawDataPoints: group.map((a) => ({
        gpaWeighted: a.gpaWeighted,
        sat: a.sat,
        act: a.act,
        outcome: a.outcome,
        classYear: a.classYear,
      })),
      sampleSizeLabel,
    });
  }
  return records;
}

// ── Output shape ─────────────────────────────────────────────────────────────
// Indexed by collegeSlug → appType → record. Picked over flat array because
// the chance model does point-lookups by (slug, plan).
type OutputJson = Record<string, Record<string, AggregateRecord>>;

// ── Main ─────────────────────────────────────────────────────────────────────
interface CliArgs {
  input: string;
  output: string;
}

function parseCli(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    input: "/tmp/test-scoir.csv",
    output: "src/data/school-specific-data.json",
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (val === undefined) break;
    if (flag === "--input") args.input = val;
    else if (flag === "--output") args.output = val;
    else throw new Error(`Unknown flag: ${flag}`);
  }
  return args;
}

interface RawCsvRow {
  StudentID?: string;
  ClassYear?: string;
  GPAWeighted?: string;
  GPAUnweighted?: string;
  SATTotal?: string;
  ACTComposite?: string;
  CollegeName?: string;
  ApplicationType?: string;
  Outcome?: string;
}

function num(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : null;
}

function int(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
}

function main(): void {
  const cli = parseCli(process.argv.slice(2));
  const csv = readFileSync(cli.input, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as RawCsvRow[];
  const aliasMap = buildAliasMap();

  const skipped = { unknownCollege: 0, unknownOutcome: 0, missingFields: 0 };
  const skippedNames = new Set<string>();

  const apps: RawApp[] = [];
  for (const row of rows) {
    if (!row.CollegeName || !row.Outcome || !row.ApplicationType) {
      skipped.missingFields++;
      continue;
    }
    const canonical = aliasMap.get(normalize(row.CollegeName));
    if (!canonical) {
      skipped.unknownCollege++;
      skippedNames.add(row.CollegeName);
      continue;
    }
    const outcome = normalizeOutcome(row.Outcome);
    if (!outcome) {
      skipped.unknownOutcome++;
      continue;
    }
    apps.push({
      collegeName: canonical,
      collegeSlug: toSlug(canonical),
      appType: normalizeAppType(row.ApplicationType),
      outcome,
      gpaWeighted: num(row.GPAWeighted),
      gpaUnweighted: num(row.GPAUnweighted),
      sat: int(row.SATTotal),
      act: int(row.ACTComposite),
      classYear: int(row.ClassYear) ?? 0,
    });
  }

  const records = aggregate(apps);
  const out: OutputJson = {};
  for (const r of records) {
    if (!out[r.collegeSlug]) out[r.collegeSlug] = {};
    out[r.collegeSlug]![r.appType] = r;
  }

  writeFileSync(cli.output, JSON.stringify(out, null, 2) + "\n");
  // eslint-disable-next-line no-console
  console.log(
    `Imported ${apps.length} apps → ${records.length} aggregates ` +
      `(skipped: ${skipped.unknownCollege} unknown college, ${skipped.unknownOutcome} unknown outcome, ` +
      `${skipped.missingFields} missing fields).`,
  );
  if (skippedNames.size > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `Unknown college names (add to alias map): ${Array.from(skippedNames).slice(0, 20).join(", ")}` +
        (skippedNames.size > 20 ? ` (and ${skippedNames.size - 20} more)` : ""),
    );
  }
}

main();
