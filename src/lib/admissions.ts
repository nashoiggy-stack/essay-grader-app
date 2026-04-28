import type {
  College,
  Classification,
  ChanceBand,
  ChanceRange,
  ConfidenceTier,
  ApplicationPlan,
  ApplicationOption,
} from "./college-types";
import {
  classifyStatBandTier,
  getStatBandMultiplier,
  getEcBandMultiplier,
  essayCommonAppMultiplier,
  essayVspiceMultiplier,
  type StatBand,
} from "@/data/stat-band-multipliers";
import { isYieldProtected } from "@/data/hook-multipliers";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Signal {
  readonly label: string;
  readonly delta: number;
}

export interface AcademicFit {
  readonly signals: Signal[];
  readonly totalDelta: number;
  readonly metrics: number;
}

// ── GPA Comparison ───────────────────────────────────────────────────────────

export function compareGPA(
  userUW: number | null,
  userW: number | null,
  schoolUW: number,
  schoolW: number
): { signals: Signal[]; delta: number; metrics: number } {
  const signals: Signal[] = [];
  let delta = 0;
  let metrics = 0;

  if (userUW !== null) {
    const diff = userUW - schoolUW;
    const normalized = diff / 0.5;
    delta += normalized;
    metrics++;

    if (diff >= 0.15) {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is above this school's average (${schoolUW.toFixed(2)})`, delta: normalized });
    } else if (diff >= -0.1) {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is within this school's typical range`, delta: normalized });
    } else {
      signals.push({ label: `Your UW GPA (${userUW.toFixed(2)}) is below this school's average (${schoolUW.toFixed(2)})`, delta: normalized });
    }
  }

  if (userW !== null) {
    const diff = userW - schoolW;
    const normalized = diff / 0.6;
    delta += normalized;
    metrics++;

    if (diff >= 0.2) {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is above average (${schoolW.toFixed(2)})`, delta: normalized });
    } else if (diff >= -0.15) {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is within range`, delta: normalized });
    } else {
      signals.push({ label: `Your weighted GPA (${userW.toFixed(2)}) is below average (${schoolW.toFixed(2)})`, delta: normalized });
    }
  }

  return { signals, delta, metrics };
}

// ── Test Score Utilities ─────────────────────────────────────────────────────
// UNDO: To revert to the old linear/stacking model, replace this entire
// section (from "Test Score Utilities" to the end of "compareTests") with
// the original compareTests function that processed SAT and ACT independently.

/**
 * Normalize a test score against a school's range with school-specific
 * diminishing returns.
 *
 * Ceiling: 0.4 (= max 4 points on 0-100 scale)
 * Decay speed: based on range width — narrow ranges flatten fast,
 * wide ranges flatten slowly.
 *
 * Below p25: linear negative penalty (clamped at -1.5 = -15 pts)
 * At p25: 0 (neutral)
 * Within range: meaningful positive (higher at wider-range schools)
 * Above p75: diminishing returns (faster at narrow-range schools)
 *
 * UNDO: Replace this function with the 0.15-ceiling version.
 */
function normalizeTestScore(
  score: number,
  p25: number,
  p75: number,
  minSpread: number
): number {
  const range = Math.max(p75 - p25, minSpread * 2);
  const position = (score - p25) / range;

  // Below p25: linear negative (clamped at -1.5)
  if (position <= 0) return Math.max(-1.5, position * 1.2);

  // School-specific decay factor:
  // Narrow range (elite) → high decay → flattens fast
  // Wide range (mid-tier) → low decay → flattens slowly
  //
  // SAT range 100 (1480-1580, Harvard) → decay = 3.0 (very fast)
  // SAT range 200 (1200-1400, mid-tier) → decay = 1.5 (moderate)
  // ACT range 2 (34-36, Harvard) → uses minSpread 3→range 6 → decay = 3.0
  // ACT range 4 (28-32, mid-tier) → decay = 2.25
  //
  // Formula: decay = 1.0 + 200 / range (SAT) or 1.0 + 12 / range (ACT)
  // Simplified: use range directly — smaller range = faster decay
  const decay = 1.0 + 12.0 / range;

  // Exponential saturation: ceiling 0.4 (= 4 pts max)
  // output = 0.4 * (1 - e^(-position * decay))
  return 0.4 * (1 - Math.exp(-position * decay));
}

/** Normalize SAT to a school-relative fit index. */
export function normalizeSatToIndex(sat: number, college: College): number {
  return normalizeTestScore(sat, college.sat25, college.sat75, 60);
}

/** Normalize ACT to a school-relative fit index. */
export function normalizeActToIndex(act: number, college: College): number {
  return normalizeTestScore(act, college.act25, college.act75, 3);
}

/**
 * Official ACT-to-SAT concordance table (College Board / ACT joint study).
 * Maps ACT composite → equivalent SAT total.
 * Used to compare SAT and ACT on a common scale before picking the better one.
 * Scores 35-36 and 1530-1600 are intentionally close — they're near-identical.
 */
const ACT_TO_SAT: Record<number, number> = {
  36: 1590, 35: 1560, 34: 1530, 33: 1500, 32: 1470, 31: 1440,
  30: 1410, 29: 1380, 28: 1350, 27: 1320, 26: 1290, 25: 1260,
  24: 1230, 23: 1200, 22: 1170, 21: 1140, 20: 1110, 19: 1080,
  18: 1050, 17: 1020, 16: 990, 15: 960, 14: 930, 13: 900, 12: 870,
};

/** Convert ACT to equivalent SAT using concordance table. */
export function actToSatEquivalent(act: number): number {
  const clamped = Math.round(Math.max(12, Math.min(36, act)));
  return ACT_TO_SAT[clamped] ?? 1050;
}

/**
 * Pick the best single test signal. If both SAT and ACT are provided,
 * convert ACT to SAT-equivalent using the official concordance table,
 * then use whichever represents the higher score on that common scale.
 * A 35 ACT (≈1560 SAT) and a 1550 SAT are nearly identical — the 35 ACT wins
 * marginally, and adding the 1550 SAT does NOT boost anything.
 */
export function getBestTestSignal(
  sat: number | null,
  act: number | null,
  college: College
): { type: "sat" | "act" | null; score: number | null; normalized: number } {
  if (college.testPolicy === "blind") return { type: null, score: null, normalized: 0 };

  if (sat !== null && act !== null) {
    // Compare on SAT scale using concordance
    const actAsSat = actToSatEquivalent(act);
    if (actAsSat >= sat) {
      // ACT is equal or stronger — use ACT
      return { type: "act", score: act, normalized: normalizeActToIndex(act, college) };
    }
    // SAT is stronger — use SAT
    return { type: "sat", score: sat, normalized: normalizeSatToIndex(sat, college) };
  }

  if (sat !== null) return { type: "sat", score: sat, normalized: normalizeSatToIndex(sat, college) };
  if (act !== null) return { type: "act", score: act, normalized: normalizeActToIndex(act, college) };
  return { type: null, score: null, normalized: 0 };
}

// ── Test Score Comparison (uses best single test) ───────────────────────────

export function compareTests(
  sat: number | null,
  act: number | null,
  college: College
): { signals: Signal[]; delta: number; metrics: number } {
  const best = getBestTestSignal(sat, act, college);

  if (best.type === null || best.score === null) {
    return { signals: [], delta: 0, metrics: 0 };
  }

  const signals: Signal[] = [];
  const normalized = best.normalized;

  if (best.type === "sat") {
    const bothNote = act !== null ? " (used over ACT as stronger score)" : "";
    if (best.score >= college.sat75 + 10) {
      signals.push({ label: `Your SAT (${best.score}) is well above the 75th percentile (${college.sat75})${bothNote}`, delta: normalized });
    } else if (best.score >= college.sat25) {
      signals.push({ label: `Your SAT (${best.score}) is within the school's range (${college.sat25}-${college.sat75})${bothNote}`, delta: normalized });
    } else {
      signals.push({ label: `Your SAT (${best.score}) is below the 25th percentile (${college.sat25})${bothNote}`, delta: normalized });
    }
  } else {
    const bothNote = sat !== null ? " (used over SAT as stronger score)" : "";
    if (best.score >= college.act75 + 1) {
      signals.push({ label: `Your ACT (${best.score}) is above the 75th percentile (${college.act75})${bothNote}`, delta: normalized });
    } else if (best.score >= college.act25) {
      signals.push({ label: `Your ACT (${best.score}) is within range (${college.act25}-${college.act75})${bothNote}`, delta: normalized });
    } else {
      signals.push({ label: `Your ACT (${best.score}) is below the 25th percentile (${college.act25})${bothNote}`, delta: normalized });
    }
  }

  // Always exactly 1 metric for tests (never 2)
  return { signals, delta: normalized, metrics: 1 };
}

// ── Selectivity ──────────────────────────────────────────────────────────────

/**
 * @deprecated Legacy fitScore-era heuristic kept for `useChanceCalculator`
 * (the legacy /chances page). The new chance model in computeAdmissionChance
 * uses base acceptanceRate directly with a stat-band multiplier — no separate
 * "selectivity penalty" layer. Remove together with /chances rewrite in
 * Feature 3.
 */
export function selectivityPenalty(acceptanceRate: number): { adjustment: number; signal: Signal | null } {
  if (acceptanceRate <= 8) {
    return {
      adjustment: -15,
      signal: { label: `This school is extremely selective (${acceptanceRate}% acceptance rate) — results remain uncertain even for strong applicants`, delta: -1.5 },
    };
  }
  if (acceptanceRate <= 15) {
    return {
      adjustment: -10,
      signal: { label: `Highly selective school (${acceptanceRate}% acceptance rate)`, delta: -1 },
    };
  }
  if (acceptanceRate <= 25) {
    return { adjustment: -5, signal: null };
  }
  if (acceptanceRate >= 65) {
    return {
      adjustment: 8,
      signal: { label: `Higher acceptance rate (${acceptanceRate}%) works in your favor`, delta: 0.5 },
    };
  }
  return { adjustment: 0, signal: null };
}

// ── Major Adjustment ─────────────────────────────────────────────────────────

export function majorAdjustment(
  major: string,
  competitiveMajors: string[]
): { adjustment: number; signal: Signal | null } {
  if (!major || major === "Any") return { adjustment: 0, signal: null };

  const isCompetitive = competitiveMajors.some(
    (m) => m.toLowerCase() === major.toLowerCase()
  );

  if (isCompetitive) {
    return {
      adjustment: -4,
      signal: { label: `${major} is a competitive major at this school — slightly harder to get in`, delta: -0.3 },
    };
  }

  return { adjustment: 0, signal: null };
}

// ── Chance model (Feature 1, W4) ────────────────────────────────────────────
//
// Implements the chance-based classification model described in
// .planning/feat-admission-chances/SPEC.md. Replaces the rule-of-thumb
// fitScore math with:
//
//   1. A base acceptance rate selected by application plan, with school-
//      specific CDS rates preferred and conservative ED/EA fallbacks.
//   2. A stat-band multiplier from src/data/stat-band-multipliers.ts that
//      varies by the school's selectivity tier and where the applicant
//      sits relative to the school's published 25th/75th percentile band.
//   3. EC band and essay multipliers, both flagged rule-of-thumb until
//      empirical sources are available.
//   4. A recruited-athlete pathway that bypasses the stat math entirely.
//   5. Yield protection that caps the top-quartile multiplier at 1.0x for
//      documented yield-protective schools (W2 list).
//   6. A confidence tier driven by stat coverage, profile completeness,
//      and presence of CDS data, with the chance range widened
//      proportionally so the band itself communicates uncertainty.
//
// Hard rules (per SPEC, do not relax in this file):
//   - Sub-10% admit-rate schools cap at "reach" — no safety/likely/target
//     can ever fire there regardless of stats.
//   - GPA + test combine via min(), not average — uneven profiles do not
//     get the high-stat benefit (SPEC Decision 3).
//   - Test-blind schools (UC system) use GPA only.
//   - Test-optional with no test submitted does NOT count as below-p25;
//     the band uses GPA only and confidence drops.

// ── Stat band determination ─────────────────────────────────────────────────

function gpaBand(gpaUW: number | null, schoolUW: number): StatBand | null {
  if (gpaUW === null) return null;
  const diff = gpaUW - schoolUW;
  if (diff > 0.15) return "above-p75";
  if (diff >= -0.10) return "in-range";
  if (diff >= -0.30) return "below-p25";
  return "well-below";
}

function testBand(score: number | null, p25: number, p75: number, isAct: boolean): StatBand | null {
  if (score === null) return null;
  const aboveSlack = isAct ? 1 : 10;
  const belowSlack = isAct ? Math.round((p75 - p25) / 2) : Math.round((p75 - p25) / 2);
  if (score > p75 + aboveSlack) return "above-p75";
  if (score >= p25) return "in-range";
  if (score >= p25 - belowSlack) return "below-p25";
  return "well-below";
}

const BAND_RANK: Record<StatBand, number> = {
  "above-p75": 4,
  "in-range": 3,
  "below-p25": 2,
  "well-below": 1,
};

function minBand(a: StatBand | null, b: StatBand | null): StatBand | null {
  if (a === null) return b;
  if (b === null) return a;
  return BAND_RANK[a] <= BAND_RANK[b] ? a : b;
}

// ── Per-plan rate selection with fallbacks ──────────────────────────────────

interface BaseRateResult {
  rate: number;            // 0-100
  usedFallback: "ed" | "ea" | null;
  planNote: string | null;
}

function getBaseRateForPlan(college: College, plan: ApplicationPlan): BaseRateResult {
  const overall = college.acceptanceRate;
  switch (plan) {
    case "ED":
    case "ED2": {
      if (typeof college.edAdmitRate === "number") {
        return { rate: college.edAdmitRate, usedFallback: null, planNote: "ED admit rate (school-published)" };
      }
      // Fallback: overall × 2.5 per Penn published data (CDS Class of 2028
      // ED 14.22% vs RD 4.05% = 3.5x; Class of 2027 14.85% vs 5.78%; most
      // ED schools cluster 2.5-3x). 2.5x is conservative.
      const rate = Math.min(95, overall * 2.5);
      return { rate, usedFallback: "ed", planNote: "ED estimate based on overall trends, not school-specific" };
    }
    case "REA":
    case "SCEA": {
      // The verified REA list (Stanford, Harvard, Yale, Princeton, Notre Dame)
      // publishes either an REA admit rate explicitly or the early/regular
      // split. Prefer eaAdmitRate when present; otherwise fall back at 1.5x
      // overall (between EA's 1.15x and ED's 2.5x — REA's residual advantage
      // sits between non-binding EA and binding ED).
      if (typeof college.eaAdmitRate === "number") {
        return { rate: college.eaAdmitRate, usedFallback: null, planNote: "REA/SCEA admit rate (school-published)" };
      }
      const rate = Math.min(95, overall * 1.5);
      return { rate, usedFallback: "ea", planNote: "REA estimate based on overall trends" };
    }
    case "EA": {
      if (typeof college.eaAdmitRate === "number") {
        return { rate: college.eaAdmitRate, usedFallback: null, planNote: "EA admit rate (school-published)" };
      }
      // Fallback: overall × 1.15. EA boost varies widely (MIT EA ~1.5x,
      // most schools don't publish split). 1.15x is a conservative midpoint
      // of "small but real bump."
      const rate = Math.min(95, overall * 1.15);
      return { rate, usedFallback: "ea", planNote: "EA estimate based on overall trends, not school-specific" };
    }
    case "RD": {
      if (typeof college.regularDecisionAdmitRate === "number") {
        return { rate: college.regularDecisionAdmitRate, usedFallback: null, planNote: "RD admit rate (school-published)" };
      }
      return { rate: overall, usedFallback: null, planNote: null };
    }
    case "Rolling": {
      return { rate: overall, usedFallback: null, planNote: "Rolling — applying early in cycle helps" };
    }
  }
}

// ── Confidence ──────────────────────────────────────────────────────────────

interface ConfidenceInputs {
  statMetrics: number;     // count of GPA + test metrics provided (0-2)
  hasRigor: boolean;
  hasEcOrEssay: boolean;
  hasCds: boolean;
}

function computeConfidence(i: ConfidenceInputs): ConfidenceTier {
  let score = 0;
  if (i.statMetrics >= 2) score += 2;
  else if (i.statMetrics === 1) score += 1;
  if (i.hasRigor) score += 1;
  if (i.hasEcOrEssay) score += 1;
  if (i.hasCds) score += 1;
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function bandWidthForConfidence(c: ConfidenceTier, testOptionalWiden: boolean): { lo: number; hi: number } {
  // Multiplicative band around midpoint. Below 1.0 = lo factor, above = hi.
  if (c === "high") return testOptionalWiden ? { lo: 0.78, hi: 1.22 } : { lo: 0.85, hi: 1.15 };
  if (c === "medium") return testOptionalWiden ? { lo: 0.62, hi: 1.42 } : { lo: 0.70, hi: 1.30 };
  return testOptionalWiden ? { lo: 0.45, hi: 1.65 } : { lo: 0.55, hi: 1.50 };
}

// ── Data freshness ──────────────────────────────────────────────────────────

const STALE_YEAR_THRESHOLD = 2;
const CURRENT_ACADEMIC_YEAR = 2026;

function isStale(dataYear: number | undefined): boolean {
  if (typeof dataYear !== "number") return true;
  return CURRENT_ACADEMIC_YEAR - dataYear > STALE_YEAR_THRESHOLD;
}

// ── Recruited athlete pathway ───────────────────────────────────────────────
//
// Per SPEC and Harvard SFFA exhibits, recruited athletes are admitted at
// roughly 70-85% across top schools regardless of academic profile. We
// surface this as a special pathway that does NOT run through the normal
// stat-band math.

function recruitedAthletePathwayResult(
  college: College,
): {
  classification: Classification;
  reason: string;
  chance: ChanceRange;
  confidence: ConfidenceTier;
  recruitedAthletePathway: true;
} {
  // Use 70-85% from RECRUITED_ATHLETE_BAND (data file).
  const chance: ChanceRange = { low: 70, mid: 78, high: 85 };
  // Sub-10% schools at the low end of the band cap at "likely" rather than
  // safety because even recruited athletes face uncertainty at HYPS.
  const classification: Classification = college.acceptanceRate <= 5 ? "likely" : "safety";
  return {
    classification,
    reason:
      "Recruited athlete pathway — typical admission ~70-85% at top schools regardless of " +
      "academic profile. Contact coaches for school-specific likelihood. Estimate below " +
      "the pathway is for non-recruited applicants.",
    chance,
    confidence: "high",
    recruitedAthletePathway: true,
  };
}

// ── Yield protection adjustment ─────────────────────────────────────────────

function applyYieldProtection(
  college: College,
  band: StatBand | null,
  baseMultiplier: number,
  plan: ApplicationPlan,
): { multiplier: number; note: boolean } {
  const yieldFlag = college.yieldProtected === true || isYieldProtected(college.name);
  if (!yieldFlag) return { multiplier: baseMultiplier, note: false };
  // Yield protection only affects RD top-quartile applicants per SPEC.
  if (plan !== "RD") return { multiplier: baseMultiplier, note: true };
  if (band !== "above-p75") return { multiplier: baseMultiplier, note: true };
  // Cap top-quartile multiplier at 1.0x; apply ~12% reduction to reflect
  // waitlist risk for elite RD applicants without demonstrated interest.
  const capped = Math.min(baseMultiplier, 1.0) * 0.88;
  return { multiplier: capped, note: true };
}

// ── Insufficient-data path ──────────────────────────────────────────────────

function insufficientDataResult(college: College): {
  classification: Classification;
  reason: string;
  chance: ChanceRange;
  confidence: ConfidenceTier;
} {
  const ar = college.acceptanceRate;
  return {
    classification: "insufficient",
    reason: "Insufficient data — complete your profile to see a chance estimate for this school.",
    chance: { low: Math.max(0.5, ar * 0.5), mid: ar, high: Math.min(95, ar * 1.5) },
    confidence: "low",
  };
}

// ── Main chance computation ─────────────────────────────────────────────────

export interface ChanceInputsModel {
  college: College;
  gpaUW: number | null;
  gpaW: number | null;
  sat: number | null;
  act: number | null;
  rigor?: "low" | "medium" | "high";
  ecBand?: string;
  essayCA?: number | null;
  essayV?: number | null;
  recruitedAthlete?: boolean;
  applicationPlan?: ApplicationPlan;
}

export interface ChanceResultModel {
  readonly classification: Classification;
  readonly reason: string;
  readonly chance: ChanceRange;
  readonly confidence: ConfidenceTier;
  readonly yieldProtectedNote?: boolean;
  readonly usedFallback?: "ed" | "ea" | null;
  readonly stale?: boolean;
  readonly recruitedAthletePathway?: boolean;
}

export function computeAdmissionChance(args: ChanceInputsModel): ChanceResultModel {
  const college = args.college;
  const plan: ApplicationPlan = args.applicationPlan ?? "RD";

  // 1. Recruited athlete pathway short-circuit.
  if (args.recruitedAthlete === true) {
    return recruitedAthletePathwayResult(college);
  }

  // 2. Determine which stats we have. Test-blind schools and test-optional
  //    with no test submitted both fall back to GPA-only with widened band.
  const testBlind = college.testPolicy === "blind";
  const testOptionalNoScore =
    college.testPolicy === "optional" && args.sat === null && args.act === null;

  // 3. Compute stat bands. Test-blind drops the test signal entirely.
  const gBand = gpaBand(args.gpaUW, college.avgGPAUW);
  const tBand = testBlind ? null : pickTestBand(args.sat, args.act, college);

  // 4. Combine via min() per SPEC Decision 3 — uneven profiles don't get
  //    the high-stat benefit.
  const combinedBand = minBand(gBand, tBand);

  // 5. Insufficient-data guard: no GPA AND no test (or test-blind with no
  //    GPA) means we can't ground a stat-band.
  if (combinedBand === null) {
    return insufficientDataResult(college);
  }

  // 6. Per-plan base rate with fallbacks.
  const baseResult = getBaseRateForPlan(college, plan);

  // 7. Stat multiplier from the empirical tier table.
  let multiplier = getStatBandMultiplier(college, combinedBand);

  // 8. Yield protection cap.
  const yp = applyYieldProtection(college, combinedBand, multiplier, plan);
  multiplier = yp.multiplier;

  // 9. EC + essay multipliers.
  const ecMult = getEcBandMultiplier(args.ecBand?.toLowerCase());
  const essayCaMult = essayCommonAppMultiplier(args.essayCA ?? null);
  const essayVMult = essayVspiceMultiplier(args.essayV ?? null);

  // 10. Compute midpoint.
  const rawMid = baseResult.rate * multiplier * ecMult * essayCaMult * essayVMult;
  const mid = clamp(rawMid, 0.5, 95);

  // 11. Confidence + band width.
  const statMetrics = (gBand ? 1 : 0) + (tBand ? 1 : 0);
  const confidence = computeConfidence({
    statMetrics,
    hasRigor: !!args.rigor,
    hasEcOrEssay: !!args.ecBand || args.essayCA != null || args.essayV != null,
    hasCds: typeof college.dataYear === "number" || typeof college.edAdmitRate === "number" || typeof college.regularDecisionAdmitRate === "number",
  });
  const widthBand = bandWidthForConfidence(confidence, testOptionalNoScore);
  const chance: ChanceRange = {
    low: Math.round(clamp(mid * widthBand.lo, 0.5, 95)),
    mid: Math.round(mid),
    high: Math.round(clamp(mid * widthBand.hi, 0.5, 95)),
  };

  // 12. Classification from chance midpoint.
  let classification = chanceMidpointToClassification(chance.mid);

  // 13. Hard cliff at 10% admit (SPEC: sub-10% schools cap at "reach").
  if (college.acceptanceRate < 10 && classification !== "unlikely" && classification !== "reach") {
    classification = "reach";
  }

  // 14. Reason prose: surface signal labels deterministically.
  const reasonParts: string[] = [];
  if (gBand) reasonParts.push(gpaPhrase(args.gpaUW!, college.avgGPAUW, gBand));
  if (tBand && !testBlind) reasonParts.push(testPhrase(args.sat, args.act, college, tBand));
  if (testOptionalNoScore) reasonParts.push("Test-optional with no score submitted — band widened, test signal not used");
  if (testBlind) reasonParts.push("Test-blind admissions — score not considered, GPA only");
  if (baseResult.planNote) reasonParts.push(baseResult.planNote);
  const reason = reasonParts.length > 0 ? reasonParts.join(". ") + "." : `Based on ${college.acceptanceRate}% overall acceptance rate.`;

  const result: ChanceResultModel = {
    classification,
    reason,
    chance,
    confidence,
    yieldProtectedNote: yp.note ? true : undefined,
    usedFallback: baseResult.usedFallback,
    stale: isStale(college.dataYear) ? true : undefined,
  };
  return result;
}

function pickTestBand(sat: number | null, act: number | null, college: College): StatBand | null {
  // Use the better signal on the SAT scale (concordance).
  if (sat === null && act === null) return null;
  if (sat !== null && act !== null) {
    const actAsSat = actToSatEquivalent(act);
    return actAsSat >= sat
      ? testBand(act, college.act25, college.act75, true)
      : testBand(sat, college.sat25, college.sat75, false);
  }
  if (sat !== null) return testBand(sat, college.sat25, college.sat75, false);
  return testBand(act, college.act25, college.act75, true);
}

function chanceMidpointToClassification(mid: number): Classification {
  if (mid >= 75) return "safety";
  if (mid >= 50) return "likely";
  if (mid >= 25) return "target";
  if (mid >= 10) return "reach";
  return "unlikely";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function gpaPhrase(userUW: number, schoolUW: number, band: StatBand): string {
  switch (band) {
    case "above-p75": return `Your UW GPA (${userUW.toFixed(2)}) is above this school's average (${schoolUW.toFixed(2)})`;
    case "in-range":  return `Your UW GPA (${userUW.toFixed(2)}) is within this school's typical range`;
    case "below-p25": return `Your UW GPA (${userUW.toFixed(2)}) is below this school's average (${schoolUW.toFixed(2)})`;
    case "well-below": return `Your UW GPA (${userUW.toFixed(2)}) is well below this school's average (${schoolUW.toFixed(2)})`;
  }
}

function testPhrase(sat: number | null, act: number | null, college: College, band: StatBand): string {
  if (sat === null && act === null) return "";
  const useAct = act !== null && (sat === null || actToSatEquivalent(act) >= sat);
  if (useAct) {
    const tail = sat !== null ? " (used over SAT as stronger score)" : "";
    if (band === "above-p75") return `Your ACT (${act}) is above the 75th percentile (${college.act75})${tail}`;
    if (band === "in-range")  return `Your ACT (${act}) is within range (${college.act25}-${college.act75})${tail}`;
    return `Your ACT (${act}) is below the 25th percentile (${college.act25})${tail}`;
  }
  const tail = act !== null ? " (used over ACT as stronger score)" : "";
  if (band === "above-p75") return `Your SAT (${sat}) is above the 75th percentile (${college.sat75})${tail}`;
  if (band === "in-range")  return `Your SAT (${sat}) is within range (${college.sat25}-${college.sat75})${tail}`;
  return `Your SAT (${sat}) is below the 25th percentile (${college.sat25})${tail}`;
}

// ── Classification (for College List Builder) ────────────────────────────────
//
// Wrapper around computeAdmissionChance preserved for backwards compatibility
// with existing call sites (compare-engine.ts, useCollegeFilter.ts,
// strategy-engine.ts, strategy-profile.ts, dashboard atlas).

export function classifyCollege(
  college: College,
  gpaUW: number | null,
  gpaW: number | null,
  sat: number | null,
  act: number | null,
  essayCA: number | null = null,
  essayV: number | null = null,
  options?: {
    ecBand?: string;
    rigor?: "low" | "medium" | "high";
    recruitedAthlete?: boolean;
    applicationPlan?: ApplicationPlan;
  },
): {
  classification: Classification;
  reason: string;
  chance: ChanceRange;
  confidence: ConfidenceTier;
  yieldProtectedNote?: boolean;
  usedFallback?: "ed" | "ea" | null;
  stale?: boolean;
  recruitedAthletePathway?: boolean;
} {
  return computeAdmissionChance({
    college,
    gpaUW,
    gpaW,
    sat,
    act,
    essayCA,
    essayV,
    ecBand: options?.ecBand,
    rigor: options?.rigor,
    recruitedAthlete: options?.recruitedAthlete,
    applicationPlan: options?.applicationPlan,
  });
}

// ── Chance Band ──────────────────────────────────────────────────────────────

export const BAND_LABELS: Record<ChanceBand, string> = {
  "very-low": "Very Low",
  low: "Low",
  possible: "Possible",
  competitive: "Competitive",
  strong: "Strong",
};

export function scoreToBand(score: number): ChanceBand {
  if (score >= 75) return "strong";
  if (score >= 60) return "competitive";
  if (score >= 40) return "possible";
  if (score >= 20) return "low";
  return "very-low";
}

// ── Essay Score Adjustment ───────────────────────────────────────────────────

export function essayScoreAdjustment(
  commonAppScore: number | null, // 0-100
  vspiceComposite: number | null // 0-24
): { adjustment: number; signals: Signal[] } {
  const signals: Signal[] = [];
  let adjustment = 0;

  if (commonAppScore === null && vspiceComposite === null) {
    return { adjustment: 0, signals: [] };
  }

  // Common App score (0-100) — normalize to a -8 to +8 range
  if (commonAppScore !== null) {
    const normalized = (commonAppScore - 60) / 40; // 60 is "average", maps to 0
    const boost = Math.max(-6, Math.min(6, normalized * 8));
    adjustment += boost;

    if (commonAppScore >= 80) {
      signals.push({ label: `Strong Common App essay score (${commonAppScore}/100) — this strengthens your application`, delta: boost });
    } else if (commonAppScore >= 65) {
      signals.push({ label: `Solid Common App essay score (${commonAppScore}/100)`, delta: boost });
    } else {
      signals.push({ label: `Common App essay score (${commonAppScore}/100) has room for improvement`, delta: boost });
    }
  }

  // VSPICE composite (0-24 scale: 6 dimensions × 4 pts + bonuses - pitfalls)
  // Average is ~15 (6 × 2.5). Normalize to a -5 to +5 range.
  if (vspiceComposite !== null) {
    const normalized = (vspiceComposite - 15) / 9; // 15 is ~average, 24 is max
    const boost = Math.max(-4, Math.min(4, normalized * 5));
    adjustment += boost;

    if (vspiceComposite >= 19) {
      signals.push({ label: `Strong VSPICE score (${vspiceComposite}/24) — shows depth of character`, delta: boost });
    } else if (vspiceComposite >= 14) {
      signals.push({ label: `Solid VSPICE score (${vspiceComposite}/24)`, delta: boost });
    } else {
      signals.push({ label: `VSPICE score (${vspiceComposite}/24) could be strengthened`, delta: boost });
    }
  }

  return { adjustment: Math.round(adjustment), signals };
}

// ── UNDO [application-plan] ─────────────────────────────────────────────────
// Everything below this marker (getApplicationOptions, applicationPlanAdjustment)
// is part of the application-plan feature. To revert, delete this block
// entirely. Nothing above depends on these symbols.
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_APPLICATION_OPTIONS: readonly ApplicationOption[] = [{ type: "RD" }];

/**
 * Normalize a college's application options. Colleges without the field fall
 * back to RD-only so callers never have to null-check, and UI always has
 * something to render.
 */
export function getApplicationOptions(college: College): readonly ApplicationOption[] {
  if (college.applicationOptions && college.applicationOptions.length > 0) {
    return college.applicationOptions;
  }
  return DEFAULT_APPLICATION_OPTIONS;
}

/**
 * @deprecated Used only by useChanceCalculator (legacy /chances page).
 * The new chance model picks plans via the user-supplied applicationPlan
 * input directly. Remove with /chances rewrite in Feature 3.
 */
export function defaultApplicationPlan(college: College): ApplicationPlan {
  const opts = getApplicationOptions(college);
  const rd = opts.find((o) => o.type === "RD");
  return rd ? rd.type : opts[0].type;
}

/**
 * Fixed, hand-tuned per-plan boost table.
 *
 * IMPORTANT: These numbers are NOT derived from ED vs RD acceptance rate
 * differences. Early-round acceptance rates are misleading because the early
 * pool is loaded with athletes, legacies, recruited applicants, and
 * institutional priorities. Scaling a boost off that ratio would pretend the
 * model captures hooks it doesn't actually see.
 *
 * Instead, these values reflect the *residual* early advantage for otherwise
 * identical applicants, as reported in admissions research. They are:
 *
 *   - Small enough that no single plan can shift a profile more than one band
 *   - Strictly ordered: RD < EA < REA/SCEA < ED/ED2
 *   - Capped further at elite schools (acceptance rate ≤ 10%) because the
 *     plan advantage is demonstrably smaller the more selective the school
 *
 * Do NOT rescale these based on published ED acceptance rates.
 */
const PLAN_BOOST_NON_ELITE: Record<ApplicationPlan, number> = {
  RD: 0,
  Rolling: 0,
  EA: 1,
  REA: 2,
  SCEA: 2,
  ED: 4,
  ED2: 4,
};

const PLAN_BOOST_ELITE: Record<ApplicationPlan, number> = {
  RD: 0,
  Rolling: 0,
  EA: 1,
  REA: 2,
  SCEA: 2,
  ED: 3,
  ED2: 3,
};

const ELITE_THRESHOLD = 10; // acceptance rate <= this counts as elite
const WEAK_PROFILE_FLOOR = 30; // below this, no plan boost applies
const MAX_PLAN_BOOST = 5; // absolute cap (bands are 15-20 pts wide)

/**
 * @deprecated Legacy fitScore-era plan-boost heuristic used only by
 * useChanceCalculator (the legacy /chances page). The new chance model
 * picks per-plan base rates directly via getBaseRateForPlan inside
 * computeAdmissionChance and does not stack a separate plan boost on top.
 * Remove with /chances rewrite in Feature 3.
 *
 * Guardrails enforced here (all necessary — do not remove any individually):
 *
 *   1. Lookup-table boosts are strictly ordered EA ≤ REA/SCEA ≤ ED.
 *   2. Elite schools (≤10% acceptance) use a tighter table that caps ED at +3.
 *   3. Weak pre-plan profiles (<30) receive no boost. ED does not rescue
 *      unqualified applicants — binding commitment is not a bypass.
 *   4. Absolute cap of +5 on any boost. Bands are 15-20 points wide, so a 5
 *      point boost can shift at most one band.
 */
export function applicationPlanAdjustment(
  plan: ApplicationPlan,
  acceptanceRate: number,
  preScore: number,
  collegeName: string,
): { adjustment: number; signal: Signal | null } {
  // RD and Rolling never contribute a numeric boost.
  if (plan === "RD" || plan === "Rolling") {
    if (plan === "Rolling") {
      return {
        adjustment: 0,
        signal: {
          label: `Rolling admissions at ${collegeName} — applying early in the cycle maximizes your timing advantage`,
          delta: 0,
        },
      };
    }
    return { adjustment: 0, signal: null };
  }

  const isElite = acceptanceRate <= ELITE_THRESHOLD;
  const table = isElite ? PLAN_BOOST_ELITE : PLAN_BOOST_NON_ELITE;
  let boost = table[plan];

  // Guardrail 3: weak profile floor.
  if (preScore < WEAK_PROFILE_FLOOR) {
    boost = 0;
  }

  // Guardrail 4: absolute cap.
  boost = Math.min(MAX_PLAN_BOOST, Math.max(0, boost));

  if (boost === 0) {
    return { adjustment: 0, signal: null };
  }

  const label = buildApplicationPlanLabel(plan, isElite, collegeName);
  return { adjustment: boost, signal: { label, delta: boost / 10 } };
}

function buildApplicationPlanLabel(
  plan: ApplicationPlan,
  isElite: boolean,
  collegeName: string,
): string {
  const eliteNote = isElite
    ? ` At ${collegeName}, application plan only modestly affects outcomes.`
    : "";
  switch (plan) {
    case "EA":
      return `Early Action may provide a slight timing advantage.${eliteNote}`;
    case "REA":
    case "SCEA":
      return `Restrictive Early Action may provide a modest early-application advantage.${eliteNote}`;
    case "ED":
    case "ED2":
      return `Binding Early Decision may provide a stronger advantage due to your commitment to attend.${eliteNote}`;
    default:
      return "";
  }
}

// end UNDO [application-plan]
