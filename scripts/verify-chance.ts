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
  // Spec "distinguished maxed profile" uses W=4.79. With AI = (4.79/5×80)×1.5
  // + ((1560-400)/1200×80)×1.5 = 230.96, this lands in the top-quartile tier
  // (≥230 cutoff). At W=4.70 the AI would land at 228.8, dropping to the
  // above-median tier.
  gpaW: 4.79,
  sat: 1560,
  act: 35,
  ecBand: "exceptional" as "limited" | "developing" | "solid" | "strong" | "exceptional",
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
      console.log(
        `  ${t.name.padEnd(40)} ${plan.padEnd(5)} [${tag}]  ${r.chance.mid}%  ${r.classification}`,
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

// Spec verification: AP scores must influence Tier 2. Same maxed profile,
// but ACT 34 (one below typical p75=36). Without the rigor pipeline in
// Tier 2, this drops to 1.8x. With it, rigor='top' bumps the band up.
const MAXED_ACT34: typeof MAXED = { ...MAXED, act: 34 };
run("MAXED PROFILE, ACT 34 — rigor should rescue stat band", MAXED_ACT34);

// Spec verification: low-rigor profile should pull Tier 2 down.
const LOW_RIGOR: typeof MAXED = {
  ...MAXED,
  advancedCoursework: [
    { type: "AP", name: "AP Lit", score: 3 },
    { type: "AP", name: "AP US Hist", score: 3 },
  ],
};
run("MAXED STATS + LOW RIGOR (2 AP threes) — band should drop", LOW_RIGOR);

// Near-perfect GPA at Stanford (avg 3.95). Before the slack fix, 3.97 UW
// landed in above-median; after, it's above-p75.
const NEAR_PERFECT_GPA: typeof MAXED = { ...MAXED, gpaUW: 3.97 };
run("NEAR-PERFECT UW 3.97 — should still hit maxed branch", NEAR_PERFECT_GPA);

// Weighted should rescue when UW is lower. School avg W is 4.50 at HE
// schools. User with UW 3.85 (below median) but W 4.85 (well above 4.50)
// should land above-p75 via the weighted axis taking the higher band.
const HIGH_W_LOW_UW: typeof MAXED = { ...MAXED, gpaUW: 3.85, gpaW: 4.85 };
run("HIGH WEIGHTED 4.85, LOW UW 3.85 — W should rescue band", HIGH_W_LOW_UW);

// Weighted alone (no UW provided) should still classify.
const W_ONLY: typeof MAXED = { ...MAXED, gpaUW: null as unknown as number, gpaW: 4.85 };
run("WEIGHTED-ONLY 4.85 (UW unset) — should still classify", W_ONLY);

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
