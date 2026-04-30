/**
 * generate-synthetic-scoir-data.ts
 *
 * Sandbox tool. Builds a fake Scoir-format CSV so we can exercise the
 * school-specific-data import pipeline before a real counselor CSV arrives.
 *
 * IMPORTANT: this is synthetic. The math is explicit and rule-of-thumb where
 * sources don't exist. Each parameter is annotated with reasoning so reviewers
 * can sanity-check.
 *
 * Usage:
 *   tsx scripts/generate-synthetic-scoir-data.ts \
 *     --output /tmp/test-scoir.csv \
 *     --school-profile elite-private \
 *     --num-classes 5 \
 *     --students-per-class 80 \
 *     --seed 42
 */
import { writeFileSync } from "node:fs";
import { COLLEGES } from "../src/data/colleges";
import type { College } from "../src/lib/college-types";

// ── PRNG ─────────────────────────────────────────────────────────────────────
// Mulberry32: tiny, deterministic 32-bit PRNG. Good enough for fixture data;
// not for crypto. Picked over Math.random because we need --seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal sample. Standard textbook pair; we only return one of two.
function normal(rng: () => number, mean: number, sd: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// ── School profile presets ──────────────────────────────────────────────────
// Three archetypes reflecting realistic feeder-school distributions. Numbers
// are rule-of-thumb — we don't have a published source for "what a Stuyvesant
// applicant pool looks like". Reviewers should treat the absolute values as
// loose, the relative ordering between profiles as the design intent.
type SchoolProfile = "elite-private" | "public-magnet" | "suburban-public";

interface ProfileParams {
  // Mean weighted GPA on a 5.0 scale; sd represents within-school spread.
  readonly gpaWMean: number;
  readonly gpaWSd: number;
  // Mean SAT; sd loosely matches within-cohort spread observed in CDS distros.
  readonly satMean: number;
  readonly satSd: number;
  // Multiplier on baseline applicants-per-college (see baselineApplicants below).
  readonly volumeMultiplier: number;
  // Range of how aggressively students apply to reach schools.
  readonly reachAffinity: number; // 0-1; higher = more reach apps per student
}

const PROFILES: Record<SchoolProfile, ProfileParams> = {
  // Elite private (Exeter / Andover archetype): lots of reaches, high GPA
  // ceiling, more applications per student.
  "elite-private": {
    gpaWMean: 4.2,
    gpaWSd: 0.25,
    satMean: 1450,
    satSd: 80,
    volumeMultiplier: 2.0,
    reachAffinity: 0.7,
  },
  // Public magnet (Stuyvesant / TJ archetype): high test ceiling, comparable
  // GPA, slightly fewer apps but still reach-heavy.
  "public-magnet": {
    gpaWMean: 4.1,
    gpaWSd: 0.25,
    satMean: 1480,
    satSd: 70,
    volumeMultiplier: 1.5,
    reachAffinity: 0.6,
  },
  // Suburban public (median competitive HS): broader stat range, more
  // applications to target/safety, fewer ultra-reach.
  "suburban-public": {
    gpaWMean: 3.85,
    gpaWSd: 0.3,
    satMean: 1280,
    satSd: 110,
    volumeMultiplier: 1.0,
    reachAffinity: 0.35,
  },
};

// ── CLI parsing ──────────────────────────────────────────────────────────────
// Hand-rolled to avoid pulling in commander/yargs for a one-shot script.
interface Args {
  output: string;
  schoolProfile: SchoolProfile;
  numClasses: number;
  studentsPerClass: number;
  seed: number;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    output: "/tmp/test-scoir.csv",
    schoolProfile: "elite-private",
    numClasses: 5,
    studentsPerClass: 80,
    seed: 42,
  };
  for (let i = 0; i < argv.length; i += 2) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (val === undefined) break;
    switch (flag) {
      case "--output":
        args.output = val;
        break;
      case "--school-profile":
        if (val !== "elite-private" && val !== "public-magnet" && val !== "suburban-public") {
          throw new Error(`Unknown profile: ${val}`);
        }
        args.schoolProfile = val;
        break;
      case "--num-classes":
        args.numClasses = parseInt(val, 10);
        break;
      case "--students-per-class":
        args.studentsPerClass = parseInt(val, 10);
        break;
      case "--seed":
        args.seed = parseInt(val, 10);
        break;
      default:
        throw new Error(`Unknown flag: ${flag}`);
    }
  }
  return args;
}

// ── App-type assignment ─────────────────────────────────────────────────────
// Each college's actual applicationOptions drive what plans students can
// apply under. We then weight ED/EA/RD per school per spec:
//   ED-offering schools: 30% ED applicants
//   REA/SCEA schools: 20% restrictive-early
//   EA non-restrictive: 50% EA
//   Remainder: RD
// Rule-of-thumb numbers — counselor data will replace these.
function chooseAppType(rng: () => number, college: College): string {
  const opts = college.applicationOptions ?? [];
  const types = new Set(opts.map((o) => o.type));
  const r = rng();

  if (types.has("ED")) {
    if (r < 0.3) return "ED";
    if (types.has("EA") && r < 0.45) return "EA";
    return "RD";
  }
  if (types.has("REA") || types.has("SCEA")) {
    if (r < 0.2) return types.has("REA") ? "REA" : "SCEA";
    return "RD";
  }
  if (types.has("EA")) {
    if (r < 0.5) return "EA";
    return "RD";
  }
  return "RD";
}

// ── Outcome assignment ──────────────────────────────────────────────────────
// Position the applicant relative to school's reported median GPA + SAT,
// then pick an outcome bucket. The percentile bands and outcome odds are
// rule-of-thumb but reflect the directional pattern in published CDS data:
// stronger applicants admit more often, but never deterministically.
type Outcome = "Accepted" | "Denied" | "Waitlisted";

function chooseOutcome(
  rng: () => number,
  college: College,
  satTotal: number,
  gpaW: number,
): Outcome {
  // Rough percentile estimate: where does this stat sit between 25th and 75th?
  // We use SAT primarily because it's normalized; GPA breaks tie at the edges.
  const sat25 = college.sat25 ?? 1300;
  const sat75 = college.sat75 ?? 1500;
  const satPct = (satTotal - sat25) / Math.max(50, sat75 - sat25);
  // GPA on weighted scale; treat 75th percentile as ~avgGPAW + 0.2 by convention.
  const gpaPct = (gpaW - college.avgGPAW) / 0.3;
  const combined = (satPct + gpaPct) / 2;

  // Map combined percentile to outcome odds. ED applicants get a small bump
  // (they self-selected into a binding plan, schools admit at higher rates).
  // For simplicity here we don't differentiate ED — that bump is captured via
  // the per-plan admit rate the model already pulls from CDS.
  let acceptOdds: number;
  let denyOdds: number;
  if (combined > 0.6) {
    // Above ~75th percentile of admitted: 70/20/10
    acceptOdds = 0.7;
    denyOdds = 0.9;
  } else if (combined > -0.3) {
    // Around median: 40/45/15
    acceptOdds = 0.4;
    denyOdds = 0.85;
  } else {
    // Below ~25th percentile: 10/80/10
    acceptOdds = 0.1;
    denyOdds = 0.9;
  }
  const r = rng();
  if (r < acceptOdds) return "Accepted";
  if (r < denyOdds) return "Denied";
  return "Waitlisted";
}

// ── Volume per college ──────────────────────────────────────────────────────
// We need to decide how many students from this HS apply to each college.
// Drivers:
//   - College popularity (low acceptance rate = more selective = more apps
//     because feeder schools target prestige)
//   - Profile volumeMultiplier (elite HS sends more apps overall)
//   - Reach affinity (elite HS sends more reach apps; suburban sends fewer)
function applicantsForCollege(
  rng: () => number,
  college: College,
  studentsThisClass: number,
  profile: ProfileParams,
): number {
  const ar = college.acceptanceRate;
  // Baseline app-rate from this HS to this school. ~5-15% of the senior class
  // applies to a top-20 school; ~1-3% to a less-prestigious one. Rule-of-thumb.
  let baseRate: number;
  if (ar < 10) baseRate = 0.12;
  else if (ar < 25) baseRate = 0.08;
  else if (ar < 50) baseRate = 0.04;
  else baseRate = 0.015;

  // Reach affinity scales prestige skew.
  if (ar < 15) baseRate *= 0.5 + profile.reachAffinity;

  const expected = studentsThisClass * baseRate * profile.volumeMultiplier;
  // Poisson-ish variance via gaussian approximation. Floor at 0.
  const sample = Math.max(0, Math.round(normal(rng, expected, Math.sqrt(expected))));
  return sample;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const profile = PROFILES[args.schoolProfile];
  const rng = mulberry32(args.seed);
  const currentYear = new Date().getFullYear();

  const rows: string[] = [];
  rows.push(
    [
      "StudentID",
      "ClassYear",
      "GPAWeighted",
      "GPAUnweighted",
      "SATTotal",
      "ACTComposite",
      "CollegeName",
      "ApplicationType",
      "Outcome",
    ].join(","),
  );

  let studentCounter = 1;
  const totalsByCollege = new Map<string, number>();

  for (let c = 0; c < args.numClasses; c++) {
    const classYear = currentYear - c;
    // Generate the cohort's stats once per class; one student can apply to
    // many schools, so we model students explicitly then sample per (student,
    // college) the same student's stats.
    const students: { id: string; gpaW: number; gpaUw: number; sat: number; act: number }[] = [];
    for (let s = 0; s < args.studentsPerClass; s++) {
      const gpaW = clamp(normal(rng, profile.gpaWMean, profile.gpaWSd), 3.0, 5.0);
      // UW GPA: roughly W minus ~0.4 of weighting bonus; clamp to 4.0.
      const gpaUw = clamp(gpaW - 0.4, 2.5, 4.0);
      const sat = Math.round(clamp(normal(rng, profile.satMean, profile.satSd), 1100, 1600));
      // ACT loosely mapped from SAT (concordance table approximation).
      const act = Math.round(clamp((sat - 600) / 30, 18, 36));
      students.push({
        id: `ANON_${String(studentCounter).padStart(5, "0")}`,
        gpaW: Number(gpaW.toFixed(2)),
        gpaUw: Number(gpaUw.toFixed(2)),
        sat,
        act,
      });
      studentCounter++;
    }

    for (const college of COLLEGES) {
      const n = applicantsForCollege(rng, college, args.studentsPerClass, profile);
      if (n === 0) continue;
      // Sample n distinct students for this college.
      const indices = new Set<number>();
      let safety = 0;
      while (indices.size < Math.min(n, students.length) && safety < n * 10) {
        indices.add(Math.floor(rng() * students.length));
        safety++;
      }
      for (const idx of indices) {
        const stu = students[idx]!;
        const appType = chooseAppType(rng, college);
        const outcome = chooseOutcome(rng, college, stu.sat, stu.gpaW);
        rows.push(
          [
            stu.id,
            classYear,
            stu.gpaW,
            stu.gpaUw,
            stu.sat,
            stu.act,
            // Embed the canonical name verbatim. Real Scoir CSVs will have
            // varied spellings — that's what the alias map in the import step
            // exists to handle.
            quote(college.name),
            appType,
            outcome,
          ].join(","),
        );
        totalsByCollege.set(college.name, (totalsByCollege.get(college.name) ?? 0) + 1);
      }
    }
  }

  writeFileSync(args.output, rows.join("\n") + "\n");
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${rows.length - 1} synthetic applications to ${args.output} ` +
      `across ${totalsByCollege.size} colleges (profile=${args.schoolProfile}, seed=${args.seed}).`,
  );
}

function quote(s: string): string {
  // Standard CSV escaping for embedded commas / quotes.
  if (s.includes(",") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

main();
