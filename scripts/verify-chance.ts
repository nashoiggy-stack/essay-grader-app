/**
 * verify-chance.ts
 *
 * Quick smoke test for the calibrated chance model. Runs a maxed-profile
 * applicant against the spec's verification list and reports tier + chance.
 *
 *   tsx scripts/verify-chance.ts
 */
import { COLLEGES } from "../src/data/colleges";
import { computeAdmissionChance } from "../src/lib/admissions";
import type { ApplicationPlan } from "../src/lib/college-types";

const MAXED = {
  gpaUW: 4.0,
  gpaW: 4.7,
  sat: 1600,
  act: 36,
  ecBand: "exceptional" as const,
  distinguishedEC: true,
  advancedCoursework: Array.from({ length: 8 }, (_, i) => ({
    type: "AP" as const,
    name: `AP ${i + 1}`,
    score: 5,
  })),
  advancedCourseworkAvailable: "all" as const,
  essayScores: [
    { promptId: "main", combinedScore: 92, vspiceScore: 23, rubricScore: 91, gradedAt: Date.now() },
  ],
};

const STRONG = {
  gpaUW: 3.85,
  gpaW: 4.4,
  sat: 1450,
  act: 33,
  ecBand: "strong" as const,
  distinguishedEC: false,
  advancedCoursework: Array.from({ length: 5 }, (_, i) => ({
    type: "AP" as const,
    name: `AP ${i + 1}`,
    score: i < 2 ? 5 : 4,
  })),
  advancedCourseworkAvailable: "all" as const,
  essayScores: [],
};

const TARGETS: { name: string; plans: ApplicationPlan[] }[] = [
  { name: "Stanford University", plans: ["RD", "REA"] },
  { name: "University of Pennsylvania", plans: ["RD", "ED"] },
  { name: "Harvard University", plans: ["RD", "SCEA"] },
  { name: "Yale University", plans: ["RD", "SCEA"] },
  { name: "Princeton University", plans: ["RD", "SCEA"] },
  { name: "MIT", plans: ["RD", "EA"] },
  { name: "Cornell University", plans: ["RD", "ED"] },
  { name: "Duke University", plans: ["RD", "ED"] },
  { name: "Northwestern University", plans: ["RD", "ED"] },
  { name: "Johns Hopkins University", plans: ["RD", "ED"] },
  { name: "University of Notre Dame", plans: ["RD", "REA"] },
  { name: "University of Florida", plans: ["RD"] },
  { name: "University of Michigan", plans: ["RD"] },
  { name: "Washington University in St. Louis", plans: ["RD", "ED"] },
  { name: "Northeastern University", plans: ["RD"] },
  { name: "Tufts University", plans: ["RD", "ED"] },
  { name: "Case Western Reserve University", plans: ["RD"] },
];

function run(label: string, profile: typeof MAXED | typeof STRONG): void {
  console.log(`\n=== ${label} ===`);
  for (const t of TARGETS) {
    const college = COLLEGES.find((c) => c.name === t.name);
    if (!college) {
      console.log(`  ${t.name}: NOT FOUND`);
      continue;
    }
    for (const plan of t.plans) {
      const r = computeAdmissionChance({
        college,
        gpaUW: profile.gpaUW,
        gpaW: profile.gpaW,
        sat: profile.sat,
        act: profile.act,
        ecBand: profile.ecBand,
        distinguishedEC: profile.distinguishedEC,
        advancedCoursework: profile.advancedCoursework,
        advancedCourseworkAvailable: profile.advancedCourseworkAvailable,
        essayScores: profile.essayScores,
        applicationPlan: plan,
      });
      const tag = college.admissionsTier === "holistic-elite" ? "HE" : "ALG";
      const type = college.admissionsType === "stats-driven" ? "SD" : "HOL";
      console.log(
        `  ${t.name.padEnd(40)} ${plan.padEnd(5)} [${tag}/${type}]  ${r.chance.mid}%  ${r.classification}`,
      );
    }
  }
}

run("MAXED PROFILE", MAXED);
run("STRONG (not maxed) PROFILE", STRONG);

// Spec verification: stats must influence the chance. Compare maxed UW 4.0
// vs reduced UW 3.6 — if outputs identical, the GPA input isn't being read.
const REDUCED_UW: typeof MAXED = { ...MAXED, gpaUW: 3.6, gpaW: 4.2 };
run("REDUCED UW (3.6) — stats should drop band", REDUCED_UW);

// Spec verification: removing distinguished flags should drop EC tier.
const NO_DISTINGUISHED: typeof MAXED = {
  ...MAXED,
  distinguishedEC: false,
  ecBand: "strong",
};
run("NO DISTINGUISHED FLAGS, EC=strong", NO_DISTINGUISHED);

// Debug: print the breakdown for Stanford REA to see what's happening.
const stanford = COLLEGES.find((c) => c.name === "Stanford University")!;
const r = computeAdmissionChance({
  college: stanford,
  gpaUW: MAXED.gpaUW,
  gpaW: MAXED.gpaW,
  sat: MAXED.sat,
  act: MAXED.act,
  ecBand: MAXED.ecBand,
  distinguishedEC: MAXED.distinguishedEC,
  advancedCoursework: MAXED.advancedCoursework,
  advancedCourseworkAvailable: MAXED.advancedCourseworkAvailable,
  essayScores: MAXED.essayScores,
  applicationPlan: "REA",
});
console.log(`\nStanford REA debug:`);
console.log(`  statBand: ${r.statBand}`);
console.log(`  effectiveEcBand: ${r.effectiveEcBand}`);
console.log(`  reason: ${r.reason}`);
console.log(`  breakdown.baseLabel: ${r.breakdown?.baseLabel}`);
console.log(`  breakdown.baseRate: ${r.breakdown?.baseRate}`);
console.log(`  breakdown.steps: ${JSON.stringify(r.breakdown?.steps, null, 2)}`);
console.log(`  chance: ${JSON.stringify(r.chance)}`);

// Insufficient data check
const college = COLLEGES.find((c) => c.name === "Stanford University")!;
const insuff = computeAdmissionChance({
  college,
  gpaUW: null,
  gpaW: null,
  sat: null,
  act: null,
});
console.log(`\nInsufficient (no GPA, no test): classification = ${insuff.classification}`);
