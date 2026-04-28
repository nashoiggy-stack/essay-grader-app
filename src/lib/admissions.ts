import type {
  College,
  Classification,
  ChanceRange,
  ConfidenceTier,
  ApplicationPlan,
  ApplicationOption,
} from "./college-types";
import {
  getStatBandMultiplier,
  getEcBandMultiplier,
  applyCombinedDampener,
  getChanceCap,
  STAT_BAND_RANK,
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

// Five-band stat classification (final calibration spec).
//   above-p75 / above-median / mid-range / below-median / below-p25
//
// Calibrated so the spec's elite profile (4.0 UW, 35 ACT, 1540 SAT) buckets
// as above-p75 on every selective school's published distribution. GPA uses
// absolute deltas because schools publish a mean only; tests scale slack
// by the published 25-75 range so narrow ACT bands don't over-bucket.

function gpaBand(gpaUW: number | null, schoolUW: number): StatBand | null {
  if (gpaUW === null) return null;
  const diff = gpaUW - schoolUW;
  if (diff >= 0.05) return "above-p75";       // clearly above mean
  if (diff >= 0.0) return "above-median";     // at or just above mean
  if (diff >= -0.10) return "mid-range";      // tight band below mean
  if (diff >= -0.25) return "below-median";   // below mean but in range
  return "below-p25";
}

function testBand(score: number | null, p25: number, p75: number, isAct: boolean): StatBand | null {
  if (score === null) return null;
  const range = Math.max(p75 - p25, 1);
  const median = (p25 + p75) / 2;
  // Small floor on the upper-quartile slack so 1540 SAT at 1500-1560 reads
  // as above-p75 (top end of typical admit). ACT slack is 0 — narrow ranges
  // (e.g. 33-35) need exact matches.
  const upperSlack = isAct ? 0 : Math.min(25, Math.round(range * 0.4));
  const innerSlack = isAct ? 1 : Math.round(range * 0.4);
  if (score >= p75 - upperSlack) return "above-p75";
  if (score >= median) return "above-median";
  if (score >= median - innerSlack) return "mid-range";
  if (score >= p25 - innerSlack) return "below-median";
  return "below-p25";
}

function minBand(a: StatBand | null, b: StatBand | null): StatBand | null {
  if (a === null) return b;
  if (b === null) return a;
  return STAT_BAND_RANK[a] <= STAT_BAND_RANK[b] ? a : b;
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

// ── AP score multiplier ─────────────────────────────────────────────────────
//
// AP scores are corroborating evidence for stat band, not a primary signal.
// Capped contribution: ~1.05x ceiling for 8+ exams averaging 4.5+. Lower
// counts and lower averages scale down proportionally. Reasonable signal
// because empirical research (College Board AP/SAT briefs) shows AP success
// correlates with admission probability at selective schools, but the
// effect is small once GPA + test scores are controlled for — which the
// stat-band multiplier already captures.

function apScoreMultiplier(
  apScores: readonly { score: 1 | 2 | 3 | 4 | 5 }[] | undefined,
): number {
  if (!apScores || apScores.length === 0) return 1.0;
  const avg = apScores.reduce((s, a) => s + a.score, 0) / apScores.length;
  // Quality factor: 5.0 average → 1.0; 3.0 average → 0; below 3.0 → small drag.
  const quality = Math.max(-0.4, Math.min(1.0, (avg - 3.0) / 2.0));
  // Volume factor: 0 exams → 0; 8+ exams → 1.0.
  const volume = Math.min(1.0, apScores.length / 8);
  // Combined contribution caps at +5% (1.05x) and floors at -2% (0.98x).
  return 1.0 + quality * volume * 0.05;
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
  // True when any UserProfile distinguished-EC flag fires (first-author
  // publication, national competition placement, founder with users, RSI/
  // TASP-tier selective program admit). Forces effective EC band to
  // "exceptional" regardless of profile.ecBand.
  distinguishedEC?: boolean;
  // Essay scores are display-only in the new chance model — no multiplier.
  // Kept on the input shape so legacy callers still typecheck; ignored by
  // the math.
  essayCA?: number | null;
  essayV?: number | null;
  // AP scores feed a small academic-support multiplier. 8+ exams averaging
  // 4.5+ get the full ~1.05x boost; lower averages or fewer exams scale down
  // proportionally. Capped at 1.05x because APs are corroborating evidence
  // for stat band, not a primary signal.
  apScores?: readonly { score: 1 | 2 | 3 | 4 | 5 }[];
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

  // 7. Stat multiplier from the empirical band table (final calibration).
  let multiplier = getStatBandMultiplier(combinedBand);

  // 8. Yield protection cap.
  const yp = applyYieldProtection(college, combinedBand, multiplier, plan);
  multiplier = yp.multiplier;

  // 9. EC multiplier (with distinguished-EC override boost to "exceptional").
  // Essay does NOT contribute a multiplier per final spec — it surfaces only
  // as advisory text in CollegeCard. essayScoreAdjustment in this file remains
  // @deprecated for the legacy /chances pipeline.
  const effectiveEcBand = args.distinguishedEC === true ? "exceptional" : args.ecBand?.toLowerCase();
  const ecMult = getEcBandMultiplier(effectiveEcBand);

  // 10. Combined dampener: stat × EC > 4.0 dampened. AP corroborates after.
  const rawCombined = multiplier * ecMult;
  const dampened = applyCombinedDampener(rawCombined);
  const apMult = apScoreMultiplier(args.apScores);

  // 11. Compute midpoint, then apply the final selectivity cap.
  let rawMid = baseResult.rate * dampened * apMult;
  const cap = getChanceCap(college.acceptanceRate);
  const isEdLikePlan = plan === "ED" || plan === "ED2" || plan === "REA" || plan === "SCEA";
  const capValue = isEdLikePlan ? cap.ed : cap.rd;
  if (rawMid > capValue) rawMid = capValue;
  const mid = clamp(rawMid, 0.5, 95);

  // 12. Confidence + band width.
  const statMetrics = (gBand ? 1 : 0) + (tBand ? 1 : 0);
  const confidence = computeConfidence({
    statMetrics,
    hasRigor: !!args.rigor,
    hasEcOrEssay: !!args.ecBand || args.essayCA != null || args.essayV != null || args.distinguishedEC === true,
    hasCds: typeof college.dataYear === "number" || typeof college.edAdmitRate === "number" || typeof college.regularDecisionAdmitRate === "number",
  });
  const widthBand = bandWidthForConfidence(confidence, testOptionalNoScore);
  const chance: ChanceRange = {
    low: Math.round(clamp(mid * widthBand.lo, 0.5, 95)),
    mid: Math.round(mid),
    high: Math.round(clamp(mid * widthBand.hi, 0.5, 95)),
  };

  // 13. Classification from chance midpoint (final calibration thresholds).
  //   safety  ≥ 70%
  //   likely  40-69%   (locked out for sub-15% schools by the cap above)
  //   target  20-39%
  //   reach    5-19%
  //   unlikely <5%
  let classification = chanceMidpointToClassification(chance.mid);

  // 14. Hard cliff at 10% admit: sub-10% schools cap at "reach" floor and
  // ceiling. Variance dominates at that selectivity, "unlikely" is misleading,
  // and the caps already prevent anything above target there.
  if (college.acceptanceRate < 10 && classification !== "insufficient") {
    classification = "reach";
  }

  // 15. Elite-profile floor: never produces "unlikely". Elite =
  //   GPA UW ≥ 3.95 AND (SAT ≥ 1540 OR ACT ≥ 35) AND ≥ 6 APs.
  if (classification === "unlikely" && isEliteProfile(args)) {
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
  // Final calibration thresholds (consolidates spec).
  if (mid >= 70) return "safety";
  if (mid >= 40) return "likely";
  if (mid >= 20) return "target";
  if (mid >= 5)  return "reach";
  return "unlikely";
}

// Elite profile: GPA UW ≥ 3.95 AND (SAT ≥ 1540 OR ACT ≥ 35) AND ≥ 6 APs.
// When met, classification floors at "reach" — even data-driven sub-5%
// chances become "reach" rather than "unlikely". Hooks the safety net for
// ultra-selective schools where elite stats are real but variance is huge.
function isEliteProfile(args: ChanceInputsModel): boolean {
  if ((args.gpaUW ?? 0) < 3.95) return false;
  const satOk = (args.sat ?? 0) >= 1540;
  const actOk = (args.act ?? 0) >= 35;
  if (!satOk && !actOk) return false;
  const apCount = args.apScores?.length ?? 0;
  return apCount >= 6;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function gpaPhrase(userUW: number, schoolUW: number, band: StatBand): string {
  const u = userUW.toFixed(2);
  const s = schoolUW.toFixed(2);
  switch (band) {
    case "above-p75":    return `Your UW GPA (${u}) is above this school's typical range (avg ${s})`;
    case "above-median": return `Your UW GPA (${u}) is above this school's average (${s}) but within range`;
    case "mid-range":    return `Your UW GPA (${u}) is right around this school's average (${s})`;
    case "below-median": return `Your UW GPA (${u}) is below this school's average (${s}) but still within range`;
    case "below-p25":    return `Your UW GPA (${u}) is below this school's 25th percentile (avg ${s})`;
  }
}

function testPhrase(sat: number | null, act: number | null, college: College, band: StatBand): string {
  if (sat === null && act === null) return "";
  const useAct = act !== null && (sat === null || actToSatEquivalent(act) >= sat);
  const score = useAct ? act : sat;
  const which = useAct ? "ACT" : "SAT";
  const p25 = useAct ? college.act25 : college.sat25;
  const p75 = useAct ? college.act75 : college.sat75;
  const tail = useAct
    ? (sat !== null ? " (used over SAT as stronger score)" : "")
    : (act !== null ? " (used over ACT as stronger score)" : "");
  switch (band) {
    case "above-p75":    return `Your ${which} (${score}) is above the 75th percentile (${p75})${tail}`;
    case "above-median": return `Your ${which} (${score}) is above the median for this school${tail}`;
    case "mid-range":    return `Your ${which} (${score}) is around the median (${p25}-${p75})${tail}`;
    case "below-median": return `Your ${which} (${score}) is below the median but in range (${p25}-${p75})${tail}`;
    case "below-p25":    return `Your ${which} (${score}) is below the 25th percentile (${p25})${tail}`;
  }
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
    distinguishedEC?: boolean;
    rigor?: "low" | "medium" | "high";
    apScores?: readonly { score: 1 | 2 | 3 | 4 | 5 }[];
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
    distinguishedEC: options?.distinguishedEC,
    rigor: options?.rigor,
    apScores: options?.apScores,
    recruitedAthlete: options?.recruitedAthlete,
    applicationPlan: options?.applicationPlan,
  });
}

// ── Application options helper ──────────────────────────────────────────────
//
// Used by /chances ChanceForm and the strategy engine to enumerate which
// plans a school offers. The chance model itself takes applicationPlan as
// an input rather than computing a default.

const DEFAULT_APPLICATION_OPTIONS: readonly ApplicationOption[] = [{ type: "RD" }];

export function getApplicationOptions(college: College): readonly ApplicationOption[] {
  if (college.applicationOptions && college.applicationOptions.length > 0) {
    return college.applicationOptions;
  }
  return DEFAULT_APPLICATION_OPTIONS;
}
