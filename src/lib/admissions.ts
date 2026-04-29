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
import type { AdvancedCourseworkRow, EssayScoreRecord } from "./profile-types";
import { classifyRigor, rigorSignal, rigorLabel, type RigorTier } from "./rigor";

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
  // Perfect-GPA short-circuit: 4.0 UW is the absolute max on the unweighted
  // scale, so it always counts as above-p75 regardless of school avg. The
  // diff-based band fails for elite schools where avgGPAUW ≥ 3.96 (MIT,
  // Caltech etc.) — a perfect 4.0 reads as only +0.04 above mean and lands
  // in above-median. The short-circuit captures the conceptual intent
  // (a maxed transcript IS top quartile at every school).
  if (gpaUW >= 4.0) return "above-p75";
  // FP tolerance: 4.0 - 3.95 evaluates to 0.04999999999999982 in IEEE 754,
  // which used to flip a perfect-GPA Stanford applicant out of the
  // above-p75 band. Subtract a small epsilon from each comparison.
  const diff = gpaUW - schoolUW;
  const EPS = 1e-9;
  if (diff >= 0.05 - EPS) return "above-p75";       // clearly above mean
  if (diff >= 0.0 - EPS)  return "above-median";    // at or just above mean
  if (diff >= -0.10 - EPS) return "mid-range";      // tight band below mean
  if (diff >= -0.25 - EPS) return "below-median";   // below mean but in range
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
      // split. Prefer eaAdmitRate when present; otherwise fall back.
      // Final calibration: bumped fallback from 1.5x → 2.2x. Empirical REA
      // rates at HYPS land at ~9-12% vs overall 3-5% (2-3x). 1.5x undercounted.
      // Harvard SCEA 2024: 8.7% vs overall 3.6% = 2.4x. Stanford REA ~9% vs
      // 3.8% = 2.4x. Yale SCEA ~11% vs 4.5% = 2.4x. Cluster supports 2.2x.
      if (typeof college.eaAdmitRate === "number") {
        return { rate: college.eaAdmitRate, usedFallback: null, planNote: "REA/SCEA admit rate (school-published)" };
      }
      const rate = Math.min(95, overall * 2.2);
      return { rate, usedFallback: "ea", planNote: "REA estimate based on overall trends (2.2x fallback)" };
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

// Final calibration: rigor signal refines stat-band classification (third
// axis). The standalone apScoreMultiplier is removed — rigor is no longer a
// separate multiplier on chance, per the spec finding that volume + quality
// of advanced coursework is better expressed by adjusting the stat band than
// by a small additive multiplier.

// Migrate legacy apScores[] (type-tagged AP with score). The chance model
// always reads advancedCoursework[]; old data round-trips through this.
function migrateApToCoursework(
  apScores: readonly { score: 1 | 2 | 3 | 4 | 5 }[] | undefined,
): AdvancedCourseworkRow[] {
  if (!apScores) return [];
  return apScores.map((a) => ({ type: "AP", name: "AP exam", score: a.score }));
}

// Essay multiplier from graded scores. Reintroduced in final calibration —
// Feature 1 had removed it because self-reported quality wasn't trustworthy.
// The new tool-graded path passes that bar: combinedScore comes from a
// rubric-validated grader, not the user.
//
// Mark: rule-of-thumb. The 0.9-1.15× range is conservative — essays are real
// signal but bounded by the dampener so they can't override stat-band
// reality. Pending W3 empirical validation against admit-rate deltas.
function essayMultiplier(
  essayScores: readonly EssayScoreRecord[] | undefined,
): { multiplier: number; avgCombined: number | null; count: number } {
  if (!essayScores || essayScores.length === 0) {
    return { multiplier: 1.0, avgCombined: null, count: 0 };
  }
  const avg =
    essayScores.reduce((s, e) => s + e.combinedScore, 0) / essayScores.length;
  let multiplier: number;
  if (avg >= 90) multiplier = 1.15;
  else if (avg >= 75) multiplier = 1.05;
  else if (avg >= 60) multiplier = 1.0;
  else multiplier = 0.9;
  return { multiplier, avgCombined: avg, count: essayScores.length };
}

// Stat-band consensus rule. Three axes: GPA percentile + test percentile +
// rigor signal. Consensus of any two determines band; when all three
// disagree, take the median. Implemented as a small lookup against rigor
// signal coarseness (strong/moderate/weak/null).
//
// Mark: rule-of-thumb. The "consensus of two" rule is the only sensible
// extension we found — alternatives over-weighted rigor (which can be
// inflated by easy classes) or under-weighted it (missing the genuine signal
// when GPA is curve-inflated).
function consensusBand(
  combinedStat: StatBand | null,
  rigor: ReturnType<typeof rigorSignal>,
): StatBand | null {
  if (combinedStat === null) return null;
  if (rigor === null) return combinedStat;
  // GPA + test combined band already used min() so it represents the lower of
  // the two. Now refine with rigor:
  // - combined top + rigor weak → drop one band (GPA may be inflated).
  // - combined mid + rigor strong → bump up half a band (rigor confirms).
  // - combined low + rigor strong → bump up one band (rigor compensates).
  if (combinedStat === "above-p75" && rigor === "weak") return "above-median";
  if (combinedStat === "below-p25" && rigor === "strong") return "below-median";
  if (combinedStat === "below-median" && rigor === "strong") return "mid-range";
  if (combinedStat === "mid-range" && rigor === "strong") return "above-median";
  return combinedStat;
}

// ── Tier 2: holistic-elite computation ─────────────────────────────────────
//
// For ~20 top schools (all Ivies, Stanford, MIT, Caltech, Duke, Northwestern,
// JHU, UChicago, Notre Dame, Vanderbilt, Rice, Williams, Amherst, Pomona,
// Swarthmore), the algorithmic multiplier model overstates chances for maxed
// profiles because past the academic threshold, stats stop being predictive.
// Caltech rejects 1600 SATs every cycle; that's a real signal, not noise.
//
// Math:
//   final = headlineAdmitRate × fitMultiplier
//   range = ±20% of midpoint
//   cap = 30% RD / 40% ED — Tier 2 schools never reach "likely"
//
// fitMultiplier ladder (rule-of-thumb, pending W3):
//   below threshold        — 0.4×   (below-p25 stat band)
//   threshold, weak EC     — 0.7×   (below-median stat + ≤ developing EC)
//   threshold, avg EC      — 1.0×   (mid-range stat + solid EC)
//   above threshold + strong EC                               — 1.4×
//   above threshold + exceptional EC + 75+ essay              — 1.8×
//   maxed (top-quartile + exceptional + 90+ essay)            — 2.3×
//   distinguished maxed (any distinguished flag, plus maxed)  — 2.5×
function computeHolisticEliteChance(
  args: ChanceInputsModel,
  plan: ApplicationPlan,
): ChanceResultModel {
  const college = args.college;

  // Recruited-athlete pathway routing dropped per final calibration. The
  // schema field on UserProfile remains for future re-enabling. Recruited
  // applicants currently fall through to the regular Tier 2 math; coach
  // contact remains the authoritative signal.

  const testBlind = college.testPolicy === "blind";
  const gBand = gpaBand(args.gpaUW, college.avgGPAUW);
  const tBand = testBlind ? null : pickTestBand(args.sat, args.act, college);
  const combinedBand = minBand(gBand, tBand);
  if (combinedBand === null) {
    return insufficientDataResult(college);
  }

  // Headline admit rate — same precedence cascade as algorithmic Tier 1.
  const baseResult = getBaseRateForPlan(college, plan);
  const headlineRate = baseResult.rate;

  // Fit ladder.
  // The four distinguished EC auto-flag fields (firstAuthorPublication,
  // nationalCompetitionPlacement, founderWithUsers, selectiveProgram) are
  // signals to the EC tier classifier — when any is true, treat the band
  // as 'exceptional' regardless of the user-set ecBand. They are NOT a
  // separate multiplier branch (the previous distinguished-maxed 3.5x tier
  // was removed because it duplicated EC-tier judgment).
  const effectiveEcBand =
    args.distinguishedEC === true ? "exceptional" : args.ecBand?.toLowerCase();
  const essayInfo = essayMultiplier(args.essayScores);
  const essayAvg = essayInfo.avgCombined ?? 0;

  const aboveThreshold =
    combinedBand !== "below-p25" && combinedBand !== "below-median";
  const maxedStat = combinedBand === "above-p75";
  const ecExceptional = effectiveEcBand === "exceptional";
  const ecStrong = effectiveEcBand === "strong" || effectiveEcBand === "exceptional";
  const essayHigh = essayAvg >= 90;
  const essayDecent = essayAvg >= 75;

  let fitMult: number;
  let fitLabel: string;
  if (combinedBand === "below-p25") {
    fitMult = 0.4;
    fitLabel = "below academic threshold";
  } else if (!aboveThreshold) {
    if (effectiveEcBand === undefined || effectiveEcBand === "limited" || effectiveEcBand === "developing") {
      fitMult = 0.7;
      fitLabel = "at threshold, weak EC/essay";
    } else {
      fitMult = 1.0;
      fitLabel = "at threshold, average EC/essay";
    }
  } else if (maxedStat && ecExceptional && essayHigh) {
    // Single maxed multiplier 3.0× for top-quartile stats + exceptional ECs
    // + 90+ essay. The previous distinguished-maxed (3.5×) tier was removed
    // because it duplicated EC-tier judgment that the classifier already
    // makes via the 4 auto-flag fields.
    // Citation: Arcidiacono Harvard top-decile non-ALDC admit rate 15.3% /
    // baseline 4.0% = 3.83×. 3.0× is the conservative-side of the empirical
    // range for unhooked top-decile applicants.
    fitMult = 3.0;
    fitLabel = "maxed profile";
  } else if (ecExceptional && essayDecent) {
    fitMult = 1.8;
    fitLabel = "above threshold, exceptional EC + essay";
  } else if (ecStrong) {
    fitMult = 1.4;
    fitLabel = "above threshold, strong EC/essay";
  } else {
    fitMult = 1.0;
    fitLabel = "above threshold, average EC/essay";
  }

  // Compute, cap, classify.
  // Flat 35% cap across all plans (RD, ED, REA, SCEA, EA). Top schools never
  // reach 'likely' tier (40%+) for any unhooked applicant regardless of when
  // they apply. Binding-ED leverage is already captured in the per-plan
  // headline admit rate (Penn ED 14.22% > Penn RD 4.05%); differentiating
  // the cap by plan would double-count the early-round advantage.
  const isEdLikePlan =
    plan === "ED" || plan === "ED2" || plan === "REA" || plan === "SCEA";
  const cap = 35;
  let mid = headlineRate * fitMult;
  if (mid > cap) mid = cap;
  mid = clamp(mid, 0.5, 95);

  const chance: ChanceRange = {
    low: Math.round(clamp(mid * 0.8, 0.5, 95)),
    mid: Math.round(mid),
    high: Math.round(clamp(mid * 1.2, 0.5, 95)),
  };

  let classification = chanceMidpointToClassification(chance.mid);
  // Hard 10% cliff floor still applies.
  if (college.acceptanceRate < 10 && classification === "unlikely") {
    classification = "reach";
  }
  // Tier 2 schools never read as "likely" — cap defends, but be explicit.
  if (classification === "likely" || classification === "safety") {
    classification = "target";
  }

  // Confidence: holistic-elite is medium by default — caps reflect real
  // institutional uncertainty.
  const confidence: ConfidenceTier = "medium";

  // Reason prose.
  const reasonParts: string[] = [];
  if (gBand) reasonParts.push(gpaPhrase(args.gpaUW!, college.avgGPAUW, gBand));
  if (tBand && !testBlind) reasonParts.push(testPhrase(args.sat, args.act, college, tBand));
  reasonParts.push(`Holistic-elite: ${fitLabel}`);
  reasonParts.push(
    "Top schools have institutional uncertainty even for maxed profiles. " +
      "This estimate reflects unhooked applicant reality.",
  );
  const reason = reasonParts.join(". ") + ".";

  // Build a minimal breakdown — fit factors as one line, no stack.
  const breakdown: ChanceBreakdown = {
    baseRate: headlineRate,
    baseLabel: baseResult.planNote ?? `Headline admit rate (${headlineRate}%)`,
    steps: [
      {
        label: `Fit (${fitLabel})`,
        multiplier: fitMult,
        runningChance: round1(clamp(headlineRate * fitMult, 0.5, 95)),
        note: "Holistic-elite model. Stats clear the academic bar; chance reflects baseline rate with fit adjustments.",
      },
    ],
    cap: { value: cap, applied: headlineRate * fitMult > cap, bracket: `${plan}, holistic-elite` },
    finalChance: chance.mid,
  };

  return {
    classification,
    reason,
    chance,
    confidence,
    breakdown,
    statBand: combinedBand,
    effectiveEcBand,
    stale: isStale(college.dataYear) ? true : undefined,
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
  // @deprecated kept for backward compat with strategy-engine and other
  // legacy callers. The new model derives rigor from advancedCoursework.
  // When advancedCoursework is present, rigor is ignored.
  rigor?: "low" | "medium" | "high";
  ecBand?: string;
  // True when any UserProfile distinguished-EC flag fires (first-author
  // publication, national competition placement, founder with users, RSI/
  // TASP-tier selective program admit). Forces effective EC band to
  // "exceptional" regardless of profile.ecBand.
  distinguishedEC?: boolean;
  // @deprecated self-reported essay numbers. Self-reporting is intentionally
  // not trusted — use essayScores[] from the grading tool instead. Kept on
  // the input shape so legacy callers still typecheck; ignored by the math.
  essayCA?: number | null;
  essayV?: number | null;
  // Graded essay records from the essay tool. The chance model averages
  // combinedScore across entries and applies a multiplier (0.9× to 1.15×).
  // Empty array → 1.0× and "Essay quality not measured" advisory.
  essayScores?: readonly EssayScoreRecord[];
  // Per-row advanced coursework (AP / IB-HL / IB-SL). The model derives a
  // 6-tier rigor classification from this array via classifyRigor() in
  // src/lib/rigor.ts. When present, replaces the legacy rigor field.
  advancedCoursework?: readonly AdvancedCourseworkRow[];
  // 'none' explicitly waives the rigor requirement (no penalty, no boost).
  // 'limited' acknowledges fewer offerings — same math but breakdown panel
  // surfaces the constraint. Default 'all' = full menu.
  advancedCourseworkAvailable?: "all" | "limited" | "none";
  // @deprecated kept for migrate-on-read. Old apScores entries fold into
  // advancedCoursework with type='AP'.
  apScores?: readonly { score: 1 | 2 | 3 | 4 | 5 }[];
  recruitedAthlete?: boolean;
  applicationPlan?: ApplicationPlan;
}

// Multiplier-stack trace returned alongside the chance result so the UI can
// render an expandable "See the breakdown" panel showing how each layer
// shifted the running chance.
export interface BreakdownStep {
  readonly label: string;          // e.g. "Stats (above-p75)"
  readonly multiplier: number;     // 3.0
  readonly runningChance: number;  // chance after this multiplier (clamped 0.5-95)
  readonly note?: string;          // optional clarifying note (e.g. "Yield-protected: capped at 1.0×")
}

export interface ChanceBreakdown {
  readonly baseRate: number;
  readonly baseLabel: string;            // "Penn ED admit rate (school-published)"
  readonly steps: readonly BreakdownStep[];
  readonly cap: { value: number; applied: boolean; bracket: string };
  readonly finalChance: number;
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
  readonly breakdown?: ChanceBreakdown;
  readonly statBand?: StatBand;          // exposed for what-if scenarios
  readonly effectiveEcBand?: string;     // exposed for what-if scenarios
}

export function computeAdmissionChance(args: ChanceInputsModel): ChanceResultModel {
  const college = args.college;
  const plan: ApplicationPlan = args.applicationPlan ?? "RD";

  // 0. Two-tier routing. Holistic-elite schools use a different math entirely.
  if (college.admissionsTier === "holistic-elite") {
    return computeHolisticEliteChance(args, plan);
  }

  // 1. Recruited-athlete pathway routing dropped per final calibration. The
  //    schema field on UserProfile remains; the special-case math is shelved
  //    until coach-contact data can ground the multipliers.

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
  const combinedBandRaw = minBand(gBand, tBand);

  // 4b. Final calibration: rigor signal as third axis. Migrate legacy
  // apScores into the advancedCoursework array if no new array provided.
  const coursework =
    args.advancedCoursework && args.advancedCoursework.length > 0
      ? args.advancedCoursework
      : migrateApToCoursework(args.apScores);
  const rigorTier: RigorTier = classifyRigor(coursework, args.advancedCourseworkAvailable);
  const rSignal = rigorSignal(rigorTier);
  const combinedBand = consensusBand(combinedBandRaw, rSignal);

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
  const effectiveEcBand = args.distinguishedEC === true ? "exceptional" : args.ecBand?.toLowerCase();
  const ecMult = getEcBandMultiplier(effectiveEcBand);

  // 10. Essay multiplier from graded scores (final calibration). When the
  //     essay tool hasn't been used, multiplier = 1.0 and breakdown surfaces
  //     the advisory.
  const essayInfo = essayMultiplier(args.essayScores);
  const essayMult = essayInfo.multiplier;

  // 10b. Combined dampener: stat × EC × essay > 4.0 dampened.
  const rawCombined = multiplier * ecMult * essayMult;
  const dampened = applyCombinedDampener(rawCombined);

  // 11. Compute midpoint, then apply the final selectivity cap.
  //     admissionsType differentiates 15-25% holistic vs stats-driven.
  let rawMid = baseResult.rate * dampened;
  const admType = college.admissionsType ?? "holistic";
  const cap = getChanceCap(college.acceptanceRate, admType);
  const isEdLikePlan = plan === "ED" || plan === "ED2" || plan === "REA" || plan === "SCEA";
  const capValue = isEdLikePlan ? cap.ed : cap.rd;
  if (rawMid > capValue) rawMid = capValue;
  const mid = clamp(rawMid, 0.5, 95);

  // 12. Confidence + band width.
  const statMetrics = (gBand ? 1 : 0) + (tBand ? 1 : 0);
  const confidence = computeConfidence({
    statMetrics,
    hasRigor: rigorTier !== "none",
    hasEcOrEssay: !!args.ecBand || essayInfo.count > 0 || args.distinguishedEC === true,
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
  //   GPA UW ≥ 3.95 AND (SAT ≥ 1540 OR ACT ≥ 35) AND rigor in {top, high}.
  //   When advancedCourseworkAvailable === 'none', rigor requirement waived.
  if (classification === "unlikely" && isEliteProfile(args, rigorTier)) {
    classification = "reach";
  }

  // 14. Reason prose: surface signal labels deterministically.
  const reasonParts: string[] = [];
  if (gBand) reasonParts.push(gpaPhrase(args.gpaUW!, college.avgGPAUW, gBand));
  if (tBand && !testBlind) reasonParts.push(testPhrase(args.sat, args.act, college, tBand));
  if (testOptionalNoScore) reasonParts.push("Test-optional with no score submitted — band widened, test signal not used");
  if (testBlind) reasonParts.push("Test-blind admissions — score not considered, GPA only");
  if (rigorTier !== "none") reasonParts.push(`Rigor: ${rigorLabel(rigorTier)}`);
  if (baseResult.planNote) reasonParts.push(baseResult.planNote);
  const reason = reasonParts.length > 0 ? reasonParts.join(". ") + "." : `Based on ${college.acceptanceRate}% overall acceptance rate.`;

  // Build the multiplier-stack trace. Steps show running chance after each
  // layer so the UI can render an accumulating display.
  const breakdown = buildBreakdown({
    baseRate: baseResult.rate,
    baseLabel: baseResult.planNote ?? `Overall acceptance rate (${college.acceptanceRate}%)`,
    statBand: combinedBand,
    statMultiplier: multiplier,
    yieldProtected: yp.note,
    rawStatMultiplier: getStatBandMultiplier(combinedBand),
    ecBand: effectiveEcBand,
    ecMultiplier: ecMult,
    rawCombined,
    dampened,
    essayInfo,
    rigorTier,
    capValue,
    capApplied: baseResult.rate * dampened > capValue,
    capBracket: capBracketLabel(college.acceptanceRate, isEdLikePlan),
    finalChance: chance.mid,
  });

  const result: ChanceResultModel = {
    classification,
    reason,
    chance,
    confidence,
    yieldProtectedNote: yp.note ? true : undefined,
    usedFallback: baseResult.usedFallback,
    stale: isStale(college.dataYear) ? true : undefined,
    breakdown,
    statBand: combinedBand,
    effectiveEcBand,
  };
  return result;
}

interface BuildBreakdownArgs {
  baseRate: number;
  baseLabel: string;
  statBand: StatBand;
  statMultiplier: number;       // post-yield-protection
  rawStatMultiplier: number;    // pre-yield-protection (for display when capped)
  yieldProtected: boolean;
  ecBand: string | undefined;
  ecMultiplier: number;
  rawCombined: number;            // stat × ec × essay before dampener
  dampened: number;               // post-dampener
  essayInfo: { multiplier: number; avgCombined: number | null; count: number };
  rigorTier: RigorTier;
  capValue: number;
  capApplied: boolean;
  capBracket: string;
  finalChance: number;
}

function buildBreakdown(a: BuildBreakdownArgs): ChanceBreakdown {
  const steps: BreakdownStep[] = [];
  let running = a.baseRate;

  // Stats step (rigor folded into the band, surfaced in note when not 'none')
  const yieldNote = a.yieldProtected && a.rawStatMultiplier !== a.statMultiplier
    ? `Yield-protected: capped from ${a.rawStatMultiplier.toFixed(2)}× to ${a.statMultiplier.toFixed(2)}×`
    : a.rigorTier !== "none"
      ? `Rigor: ${rigorLabel(a.rigorTier)}`
      : undefined;
  running = clamp(running * a.statMultiplier, 0.5, 95);
  steps.push({
    label: `Stats (${prettyBand(a.statBand)})`,
    multiplier: a.statMultiplier,
    runningChance: round1(running),
    note: yieldNote,
  });

  // EC step
  running = clamp(running * a.ecMultiplier, 0.5, 95);
  steps.push({
    label: `ECs (${a.ecBand ? prettyEc(a.ecBand) : "default"})`,
    multiplier: a.ecMultiplier,
    runningChance: round1(running),
  });

  // Essay step. When the user has graded essays, show V-SPICE + Rubric in
  // the note so the breakdown panel makes the connection between essay
  // feedback and chance impact explicit. When no essays graded, show the
  // 1.0× neutral with the advisory.
  const essay = a.essayInfo;
  if (essay.count === 0) {
    steps.push({
      label: "Essays (not measured)",
      multiplier: 1.0,
      runningChance: round1(running),
      note: "Essay quality not measured. Grade your essays through the essay tool for a fuller estimate.",
    });
  } else {
    running = clamp(running * essay.multiplier, 0.5, 95);
    const avg = essay.avgCombined ?? 0;
    steps.push({
      label: `Essays (combined ${avg.toFixed(0)}, ${essay.count} graded)`,
      multiplier: essay.multiplier,
      runningChance: round1(running),
    });
  }

  // Combined dampener (only show when it fired)
  if (a.dampened !== a.rawCombined) {
    const dampenerRatio = a.dampened / a.rawCombined;
    // Replay from base using the dampened combined multiplier.
    running = clamp(a.baseRate * a.dampened, 0.5, 95);
    steps.push({
      label: "Combined dampener",
      multiplier: dampenerRatio,
      runningChance: round1(running),
      note: `Stats × ECs × Essay = ${a.rawCombined.toFixed(2)}× exceeded 4.0× cap; dampened to ${a.dampened.toFixed(2)}×.`,
    });
  }

  // Cap step (only when it fired)
  if (a.capApplied) {
    steps.push({
      label: `Selectivity cap (${a.capBracket})`,
      multiplier: a.capValue / running,
      runningChance: a.capValue,
      note: `Capped at ${a.capValue}% — bracket reflects institutional uncertainty.`,
    });
  }

  return {
    baseRate: a.baseRate,
    baseLabel: a.baseLabel,
    steps,
    cap: { value: a.capValue, applied: a.capApplied, bracket: a.capBracket },
    finalChance: a.finalChance,
  };
}

function prettyBand(band: StatBand): string {
  return {
    "above-p75": "above 75th percentile",
    "above-median": "above median",
    "mid-range": "around median",
    "below-median": "below median",
    "below-p25": "below 25th percentile",
  }[band];
}

function prettyEc(ecBand: string): string {
  const norm = ecBand.toLowerCase();
  return {
    limited: "limited",
    developing: "developing",
    solid: "solid",
    strong: "strong",
    exceptional: "exceptional",
  }[norm] ?? norm;
}

function capBracketLabel(ar: number, edLike: boolean): string {
  const round = edLike ? "ED" : "RD";
  if (ar < 5)  return `${round}, <5% bracket`;
  if (ar < 15) return `${round}, 5-15% bracket`;
  if (ar < 25) return `${round}, 15-25% bracket`;
  if (ar < 50) return `${round}, 25-50% bracket`;
  return `${round}, ≥50% bracket`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// What-if scenarios — recompute chance with one input shifted. Returns at
// most three scenarios (EC-down, stats-down, plan-flip). UI renders below
// the breakdown stack.
export interface WhatIfScenario {
  readonly label: string;
  readonly chance: number;
  readonly classification: Classification;
}

const EC_LADDER: readonly string[] = ["limited", "developing", "solid", "strong", "exceptional"];
const STAT_LADDER: readonly StatBand[] = ["below-p25", "below-median", "mid-range", "above-median", "above-p75"];

export function computeWhatIfs(args: ChanceInputsModel, current: ChanceResultModel): readonly WhatIfScenario[] {
  if (current.classification === "insufficient" || current.recruitedAthletePathway) return [];
  const scenarios: WhatIfScenario[] = [];

  // EC one tier down
  const currentEc = current.effectiveEcBand ?? args.ecBand?.toLowerCase();
  if (currentEc) {
    const idx = EC_LADDER.indexOf(currentEc);
    if (idx > 0) {
      const downEc = EC_LADDER[idx - 1];
      const r = computeAdmissionChance({
        ...args,
        ecBand: downEc,
        distinguishedEC: false, // override the auto-boost so we genuinely model the lower tier
      });
      scenarios.push({
        label: `If your ECs were '${downEc}' instead of '${currentEc}'`,
        chance: r.chance.mid,
        classification: r.classification,
      });
    }
  }

  // Stats one tier down — reduce GPA / test slightly to drop one band. Easier:
  // re-classify by simulating a band override via input adjustment.
  const currentStatBand = current.statBand;
  if (currentStatBand) {
    const idx = STAT_LADDER.indexOf(currentStatBand);
    if (idx > 0) {
      const downBand = STAT_LADDER[idx - 1];
      // Build a synthetic input that lands in the lower band: nudge GPA down
      // by 0.15 and test by ~10% of the school's range.
      const college = args.college;
      const adjustedGpa = args.gpaUW != null ? Math.max(2.0, args.gpaUW - 0.20) : null;
      const testRange = college.sat75 - college.sat25;
      const adjustedSat = args.sat != null ? Math.max(800, args.sat - Math.max(60, testRange)) : null;
      const adjustedAct = args.act != null ? Math.max(15, args.act - 3) : null;
      const r = computeAdmissionChance({
        ...args,
        gpaUW: adjustedGpa,
        sat: adjustedSat,
        act: adjustedAct,
      });
      scenarios.push({
        label: `If your stats were '${prettyBand(downBand)}' instead`,
        chance: r.chance.mid,
        classification: r.classification,
      });
    }
  }

  // Plan flip — only when school offers both rounds.
  const plan = args.applicationPlan ?? "RD";
  const opts = getApplicationOptions(args.college).map((o) => o.type);
  const isEd = plan === "ED" || plan === "ED2";
  const isRd = plan === "RD";
  if (isRd && opts.some((p) => p === "ED" || p === "ED2")) {
    const targetPlan: ApplicationPlan = opts.includes("ED") ? "ED" : "ED2";
    const r = computeAdmissionChance({ ...args, applicationPlan: targetPlan });
    scenarios.push({
      label: `If you applied ${targetPlan}`,
      chance: r.chance.mid,
      classification: r.classification,
    });
  } else if (isEd && opts.includes("RD")) {
    const r = computeAdmissionChance({ ...args, applicationPlan: "RD" });
    scenarios.push({
      label: "If you applied RD",
      chance: r.chance.mid,
      classification: r.classification,
    });
  }

  return scenarios;
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

// Elite profile: GPA UW ≥ 3.95 AND (SAT ≥ 1540 OR ACT ≥ 35) AND rigor in
// {top, high}. When advancedCourseworkAvailable === 'none' the rigor
// requirement is waived — UW + test alone qualify. Final calibration uses
// the rigor classifier, not raw AP count.
function isEliteProfile(args: ChanceInputsModel, rigor: RigorTier): boolean {
  if ((args.gpaUW ?? 0) < 3.95) return false;
  const satOk = (args.sat ?? 0) >= 1540;
  const actOk = (args.act ?? 0) >= 35;
  if (!satOk && !actOk) return false;
  if (args.advancedCourseworkAvailable === "none") return true;
  return rigor === "top" || rigor === "high";
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
    advancedCoursework?: readonly AdvancedCourseworkRow[];
    advancedCourseworkAvailable?: "all" | "limited" | "none";
    essayScores?: readonly EssayScoreRecord[];
    recruitedAthlete?: boolean;
    applicationPlan?: ApplicationPlan;
  },
): ChanceResultModel {
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
    advancedCoursework: options?.advancedCoursework,
    advancedCourseworkAvailable: options?.advancedCourseworkAvailable,
    essayScores: options?.essayScores,
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
