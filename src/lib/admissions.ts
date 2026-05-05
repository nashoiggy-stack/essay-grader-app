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
  type StatBand,
} from "@/data/stat-band-multipliers";
import { isYieldProtected } from "@/data/hook-multipliers";
import { applySchoolHistory, type SchoolBlendResult } from "./school-data";
import type { AdvancedCourseworkRow, EssayScoreRecord } from "./profile-types";
import { classifyRigor, rigorSignal, rigorLabel, type RigorTier } from "./rigor";
import {
  computeAcademicIndex,
  computeWuwRatio,
  statBandFromAi,
  actToSatEquivalent,
  type AcademicIndex,
} from "./academic-index";

// ── Types ────────────────────────────────────────────────────────────────────

export interface Signal {
  readonly label: string;
  readonly delta: number;
}

// ── ACT-SAT concordance (re-export) ─────────────────────────────────────────
// Concordance table now lives in academic-index.ts. Re-exported here for
// backward compat with callers that imported `actToSatEquivalent` from this
// module before the AI refactor.
export { actToSatEquivalent };

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
//   - Stat band derives from the Academic Index (AI), not school-relative
//     percentiles. AI = (weightedGPA/5 × 80) × 1.5 + ((bestTest-400)/1200
//     × 80) × 1.5. Cutoffs anchored to Arcidiacono Harvard SFFA 2019.
//   - Test-blind schools (UC system) use GPA-only AI mode.
//   - Test-optional with no test submitted uses GPA-only AI mode and
//     widens the Tier 2 uncertainty range from ±20% to ±30%.
//
// Refer to src/lib/academic-index.ts for the AI formula and tier cutoffs.

// ── Stat band determination via Academic Index ─────────────────────────────
//
// Replaces the prior school-relative percentile classifier (gpaBand /
// testBand / minBand). The AI uses absolute cutoffs anchored to Arcidiacono
// SFFA Harvard 2019 decile admit-rate data:
//
//   AI ≥ 230 → above-p75    (top decile non-ALDC admit ~15.3%, 3.83× baseline)
//   AI 220-229 → above-median (deciles 8-9)
//   AI 210-219 → mid-range    (deciles 6-7)
//   AI 200-209 → below-median (deciles 4-5)
//   AI < 200   → below-p25    (deciles 1-3)
//
// Citation: http://humcap.uchicago.edu/RePEc/hka/wpaper/Arcidiacono_Kinsler_Ransom_2019_recruit-to-reject.pdf

interface AiBandResult {
  ai: AcademicIndex | null;
  band: StatBand | null;
  testBlind: boolean;
  testOptionalNoScore: boolean;
}

/**
 * Compute the AI and derived StatBand for a chance computation. Handles:
 *   - test-blind schools (force GPA-only AI mode regardless of submitted scores)
 *   - test-optional with no test submitted (GPA-only mode + widened range
 *     downstream)
 *   - missing weighted GPA (fall back to unweighted as a 5.0-scale proxy)
 *   - missing both GPA and test (returns band: null → insufficient data)
 */
function computeAiBand(args: ChanceInputsModel, college: College): AiBandResult {
  const testBlind = college.testPolicy === "blind";
  const testOptionalNoScore =
    college.testPolicy === "optional" && args.sat === null && args.act === null;

  // Effective weighted GPA. App's GPA calculator normalizes to 5.0 scale, so
  // a directly entered W is school-neutral. When only UW is provided we
  // treat it as weighted — matches the spec's "weighted = unweighted, ratio
  // = 1.0" handling for unweighted-only schools.
  const effectiveW =
    args.gpaW != null ? args.gpaW :
    args.gpaUW != null ? args.gpaUW :
    null;

  const sat = testBlind ? null : args.sat;
  const act = testBlind ? null : args.act;

  const ai = computeAcademicIndex(effectiveW, sat, act);
  const band = ai != null ? statBandFromAi(ai.value) : null;
  return { ai, band, testBlind, testOptionalNoScore };
}

// ── Per-plan rate selection with fallbacks ──────────────────────────────────

interface BaseRateResult {
  rate: number;            // 0-100
  usedFallback: "ed" | "ea" | null;
  planNote: string | null;
}

// Residency-aware "overall" rate. Public flagships with strong in-state
// preference (UNC, UVA, all UCs, GT, etc.) publish a misleading overall
// figure because in-state applicants are admitted at multiples higher
// than OOS. The chance model picks the rate that matches the user's
// residency. International applicants face OOS rate (or a blend) at most
// schools — using OOS as the fallback is conservative.
type Residency = "in-state" | "oos" | "international";

function effectiveAcceptanceRate(
  college: College,
  residency: Residency = "oos",
): number {
  if (residency === "in-state" && typeof college.inStateAcceptanceRate === "number") {
    return college.inStateAcceptanceRate;
  }
  if (typeof college.oosAcceptanceRate === "number") {
    return college.oosAcceptanceRate;
  }
  return college.acceptanceRate;
}

function getBaseRateForPlan(
  college: College,
  plan: ApplicationPlan,
  residency: Residency = "oos",
): BaseRateResult {
  const overall = effectiveAcceptanceRate(college, residency);
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

// ── Soft cap ────────────────────────────────────────────────────────────────
// When the multiplier stack pushes pre-cap chance above the bracket ceiling,
// hard-clipping to the cap throws away the rank ordering between strong
// profiles. The soft cap pins below the bracket value but lets a tapered
// excess through above it, so two applicants who pre-cap at 33% vs 65%
// don't both display the same number. 0.20 chosen empirically: 0.25 starts
// inflating sub-5% schools back into the over-stated zone; 0.15 barely
// differentiates above the cap. With 0.20 a Georgetown 65% pre-cap profile
// lands at ~35% (vs 28% hard cap), preserving ~6 points of rank info.
const SOFT_CAP_TAPER = 0.20;

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

  // Stat band derived from Academic Index (AI). See computeAiBand for
  // test-blind / test-optional handling.
  const aiResult = computeAiBand(args, college);
  const { ai, band: combinedBandRaw, testBlind, testOptionalNoScore } = aiResult;

  // W/UW ratio feeds rigor classifier as a corroborating signal alongside
  // AP/IB scores. ratio ≥1.20 = strong rigor signal contribution.
  const wuwInfo = computeWuwRatio(args.gpaW, args.gpaUW);
  const wuwSignal = wuwInfo?.signal ?? null;

  // Rigor signal as third axis, mirroring Tier 1. Without this, AP/IB
  // scores were entirely ignored at holistic-elite schools — 8 APs all 5s
  // read identical to 2 APs both 3s. Migrate legacy apScores into the
  // advancedCoursework array when no new array is provided.
  const coursework =
    args.advancedCoursework && args.advancedCoursework.length > 0
      ? args.advancedCoursework
      : migrateApToCoursework(args.apScores);
  const rigorTier: RigorTier = classifyRigor(
    coursework,
    args.advancedCourseworkAvailable,
    wuwSignal,
  );
  const rSignal = rigorSignal(rigorTier);
  const combinedBand = consensusBand(combinedBandRaw, rSignal);

  if (combinedBand === null) {
    return insufficientDataResult(college);
  }

  // Headline admit rate — same precedence cascade as algorithmic Tier 1.
  const baseResult = getBaseRateForPlan(college, plan);
  const headlineRate = baseResult.rate;

  // Multiplicative stack — separate stat / EC / essay multipliers so the
  // breakdown panel can show what each input contributed instead of one
  // opaque "fit" number. Calibrated so the maxed combination produces the
  // same ~3.0× total as the prior fit-ladder approach.
  //
  // The 4 distinguished EC auto-flags promote effectiveEcBand to 'exceptional'
  // when any is true.
  const effectiveEcBand =
    args.distinguishedEC === true ? "exceptional" : args.ecBand?.toLowerCase();
  const essayInfo = essayMultiplier(args.essayScores);

  // Tier 2 stat multipliers are COMPRESSED relative to Tier 1: at top schools,
  // stats stop predicting outcomes past the academic threshold (Caltech rejects
  // 1600 SATs every cycle). Above-p75 still gets a real boost; below-threshold
  // drags chance down.
  // Mark: rule-of-thumb. Calibrated against Arcidiacono Harvard top-decile
  // 15.3% / baseline 4.0% = 3.83× — combined with 1.7× exceptional EC and
  // 1.15× 90+ essay, 1.5× stat lands at 2.93× total ≈ 3.0× target.
  // AI refinement (per spec): above-median 1.0→1.2 and below-p25 0.4→0.5 to
  // reflect that even at Tier 2 schools, stats just above the median still
  // matter slightly more than stats at the median itself, and below-p25
  // applicants aren't quite as penalized as the prior calibration assumed.
  const TIER2_STAT_MULT: Record<StatBand, number> = {
    "above-p75":    1.5,
    "above-median": 1.2,
    "mid-range":    1.0,
    "below-median": 0.7,
    "below-p25":    0.5,
  };
  const statMult = TIER2_STAT_MULT[combinedBand];
  const ecMult = getEcBandMultiplier(effectiveEcBand);
  const essayMult = essayInfo.multiplier;

  // Compute, cap, classify.
  // Flat 35% cap across all plans (RD, ED, REA, SCEA, EA). Top schools never
  // reach 'likely' tier (40%+) for any unhooked applicant regardless of when
  // they apply. Binding-ED leverage is already captured in the per-plan
  // headline admit rate (Penn ED 14.22% > Penn RD 4.05%); differentiating
  // the cap by plan would double-count the early-round advantage.
  const isEdLikePlan =
    plan === "ED" || plan === "ED2" || plan === "REA" || plan === "SCEA";
  const cap = 35;
  const totalMult = statMult * ecMult * essayMult;
  let mid = headlineRate * totalMult;
  const capApplied = mid > cap;
  // Soft cap (taper 0.20) preserves rank-ordering above the ceiling so two
  // strong holistic-elite profiles (e.g. one pre-cap 50%, one pre-cap 80%)
  // don't both display the same number. See SOFT_CAP_TAPER comment above.
  if (capApplied) mid = cap + (mid - cap) * SOFT_CAP_TAPER;
  mid = clamp(mid, 0.5, 95);

  // Default Tier 2 range = ±20%. Widen to ±30% when test-optional with no
  // test submitted: AI is computed in GPA-only mode and the uncertainty is
  // genuinely higher.
  const rangeFactor = testOptionalNoScore ? 0.3 : 0.2;
  const chance: ChanceRange = {
    low: Math.round(clamp(mid * (1 - rangeFactor), 0.5, 95)),
    mid: Math.round(mid),
    high: Math.round(clamp(mid * (1 + rangeFactor), 0.5, 95)),
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
  // institutional uncertainty. Drops to low when test-optional GPA-only.
  const confidence: ConfidenceTier = testOptionalNoScore ? "low" : "medium";

  // Reason prose.
  const reasonParts: string[] = [];
  if (ai != null) reasonParts.push(aiPhrase(ai, combinedBand));
  if (testBlind) reasonParts.push("Test-blind admissions — score not considered, AI uses GPA only");
  if (testOptionalNoScore) reasonParts.push("Test-optional with no score submitted — AI uses GPA only, range widened");
  if (rigorTier !== "none") reasonParts.push(`Rigor: ${rigorLabel(rigorTier)}`);
  reasonParts.push(
    "Top schools have institutional uncertainty even for maxed profiles. " +
      "This estimate reflects unhooked applicant reality.",
  );
  const reason = reasonParts.join(". ") + ".";

  // Multi-step breakdown — separate stat / EC / essay rows so users can see
  // what each input contributed. Mirrors the Tier 1 layout, with Tier 2 stat
  // multipliers that reflect "stats stop predicting past the academic bar".
  const steps: BreakdownStep[] = [];
  let running = headlineRate;

  // Stats step (rigor surfaced in note when the consensus rule fired).
  running = clamp(running * statMult, 0.5, 95);
  const noteParts: string[] = [];
  if (rigorTier !== "none") noteParts.push(`Rigor: ${rigorLabel(rigorTier)}`);
  if (testOptionalNoScore) noteParts.push("AI computed using GPA only (no test submitted) — uncertainty range widened");
  noteParts.push(
    "Tier 2 stat multipliers anchored to Arcidiacono SFFA Harvard 2019 decile data. " +
    "Friedman et al. NBER 2025 shows test scores predict outcomes ~4× stronger than GPA at Ivy-Plus colleges with continuous gradient (not a step function past threshold).",
  );
  steps.push({
    label: ai != null
      ? `Stats (${prettyBand(combinedBand)}, AI ${Math.round(ai.value)})`
      : `Stats (${prettyBand(combinedBand)})`,
    multiplier: statMult,
    runningChance: round1(running),
    note: noteParts.join(" "),
  });

  // EC step.
  running = clamp(running * ecMult, 0.5, 95);
  steps.push({
    label: `ECs (${effectiveEcBand ? prettyEc(effectiveEcBand) : "default"})`,
    multiplier: ecMult,
    runningChance: round1(running),
  });

  // Essay step (advisory when no graded essay).
  if (essayInfo.count === 0) {
    steps.push({
      label: "Essays (not measured)",
      multiplier: 1.0,
      runningChance: round1(running),
      note: "Essay quality not measured. Grade your essays through the essay tool for a fuller estimate.",
    });
  } else {
    running = clamp(running * essayMult, 0.5, 95);
    const avg = essayInfo.avgCombined ?? 0;
    steps.push({
      label: `Essays (combined ${avg.toFixed(0)}, ${essayInfo.count} graded)`,
      multiplier: essayMult,
      runningChance: round1(running),
    });
  }

  // Cap step (only when fired).
  if (capApplied) {
    steps.push({
      label: `Selectivity cap (holistic-elite, ${plan})`,
      multiplier: cap / running,
      runningChance: cap,
      note: `Capped at ${cap}% — top schools never reach 'likely' tier for unhooked applicants.`,
    });
  }

  const breakdown: ChanceBreakdown = {
    baseRate: headlineRate,
    baseLabel: baseResult.planNote ?? `Headline admit rate (${headlineRate}%)`,
    steps,
    cap: { value: cap, applied: capApplied, bracket: `${plan}, holistic-elite` },
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
  // Residency relative to the school. Defaults to "oos" inside the model
  // when undefined. Drives selection of inStateAcceptanceRate vs
  // oosAcceptanceRate when those fields are populated on the school.
  residency?: "in-state" | "oos" | "international";
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
  // Set when the chance model used a residency-specific admit rate
  // instead of the school's published overall (in-state-heavy publics).
  readonly residencyUsed?: {
    readonly residency: Residency;
    readonly rate: number;
    readonly overall: number;
  };
  // School-specific history blend (sandbox feature). Present when the
  // imported feeder-school data has a record for this college+plan; the
  // blend may or may not have shifted the chance — see schoolBlend.applied.
  readonly schoolBlend?: SchoolBlendResult;
}

export function computeAdmissionChance(args: ChanceInputsModel): ChanceResultModel {
  const college = args.college;
  const plan: ApplicationPlan = args.applicationPlan ?? "RD";
  const residency: Residency = args.residency ?? "oos";

  // 0. Two-tier routing. Holistic-elite schools use a different math entirely.
  if (college.admissionsTier === "holistic-elite") {
    return computeHolisticEliteChance(args, plan);
  }

  // 1. Recruited-athlete pathway routing dropped per final calibration. The
  //    schema field on UserProfile remains; the special-case math is shelved
  //    until coach-contact data can ground the multipliers.

  // 2. Stat band derived from Academic Index (AI). Handles test-blind /
  //    test-optional / GPA-only scenarios in one place.
  const aiResult = computeAiBand(args, college);
  const { ai, band: combinedBandRaw, testBlind, testOptionalNoScore } = aiResult;

  // 3. W/UW ratio feeds rigor classifier as a corroborating signal alongside
  //    AP/IB scores. ratio ≥1.20 = strong rigor signal contribution.
  const wuwInfo = computeWuwRatio(args.gpaW, args.gpaUW);
  const wuwSignal = wuwInfo?.signal ?? null;

  // 4. Final calibration: rigor signal as third axis (consensus rule
  //    refines AI tier). Migrate legacy apScores into advancedCoursework if
  //    no new array provided.
  const coursework =
    args.advancedCoursework && args.advancedCoursework.length > 0
      ? args.advancedCoursework
      : migrateApToCoursework(args.apScores);
  const rigorTier: RigorTier = classifyRigor(
    coursework,
    args.advancedCourseworkAvailable,
    wuwSignal,
  );
  const rSignal = rigorSignal(rigorTier);
  const combinedBand = consensusBand(combinedBandRaw, rSignal);

  // 5. Insufficient-data guard: no GPA AND no test (or test-blind with no
  //    GPA) means we can't ground a stat-band.
  if (combinedBand === null) {
    return insufficientDataResult(college);
  }

  // 6. Per-plan base rate with fallbacks.
  const baseResult = getBaseRateForPlan(college, plan, residency);

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
  //     All schools share the holistic cap table now.
  let rawMid = baseResult.rate * dampened;
  const isEdLikePlan = plan === "ED" || plan === "ED2" || plan === "REA" || plan === "SCEA";
  // Anchor the cap bracket to the ACTUAL admit rate for the chosen plan,
  // not to the overall (RD-derived) acceptance rate. Otherwise schools
  // with a much friendlier ED pool than their RD pool get pinned to an
  // unfairly low cap. Concrete case: Northeastern overall 7%, ED ~43% —
  // the old code looked up by 7% and capped ED at 30%, even though the
  // school admits 43% of ED applicants at baseline. With this fix the ED
  // cap for Northeastern lands at 70% (the 25-50% bracket), so a strong
  // ED applicant can plausibly land in the 50-70% range. RD lookup is
  // unchanged because the overall rate IS the RD anchor.
  const capLookupRate = isEdLikePlan ? baseResult.rate : effectiveAcceptanceRate(college, residency);
  const cap = getChanceCap(capLookupRate);
  const capValue = isEdLikePlan ? cap.ed : cap.rd;
  // Soft cap: hard clip below the cap, gentle compression above. Preserves
  // rank-ordering between strong profiles at sub-15% schools so two
  // applicants who project 33% vs 65% pre-cap don't both display the same
  // number. Taper 0.20 keeps the empirical ceiling close to the bracket
  // value while letting an extra ~6 points of differentiation through.
  const capApplied = rawMid > capValue;
  if (capApplied) rawMid = capValue + (rawMid - capValue) * SOFT_CAP_TAPER;
  const nationalMid = clamp(rawMid, 0.5, 95);

  // 11b. School-specific history blend. Sandbox feature: when imported feeder
  // school CSV has a record for this college+plan AND the sample is large
  // enough (>=5 apps), blend toward the school's observed admit rate. The
  // blend never replaces the national model — it's weighted at min(0.5,
  // n/30). See src/lib/school-data.ts for math + anchors.
  const schoolBlend = applySchoolHistory(nationalMid, college, plan, {
    gpaWeighted: args.gpaW ?? null,
    sat: args.sat ?? null,
  });
  const mid = schoolBlend.applied ? schoolBlend.mid : nationalMid;

  // 12. Confidence + band width. Stat metrics: weighted GPA + best test
  //     score (each 1 if present). AI tracks both internally so we mirror
  //     that count for the legacy confidence rule.
  const hasGpa = args.gpaW != null || args.gpaUW != null;
  const hasTest = !testBlind && (args.sat != null || args.act != null);
  const statMetrics = (hasGpa ? 1 : 0) + (hasTest ? 1 : 0);
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
  if (effectiveAcceptanceRate(college, residency) < 10 && classification !== "insufficient") {
    classification = "reach";
  }

  // 15. Elite-profile floor: never produces "unlikely". Elite =
  //   GPA UW ≥ 3.95 AND (SAT ≥ 1540 OR ACT ≥ 35) AND rigor in {top, high}.
  //   When advancedCourseworkAvailable === 'none', rigor requirement waived.
  if (classification === "unlikely" && isEliteProfile(args, rigorTier)) {
    classification = "reach";
  }

  // 14. Reason prose: surface AI tier + plan note + rigor deterministically.
  const reasonParts: string[] = [];
  if (ai != null) reasonParts.push(aiPhrase(ai, combinedBand));
  if (testOptionalNoScore) reasonParts.push("Test-optional with no score submitted — AI uses GPA only, range widened");
  if (testBlind) reasonParts.push("Test-blind admissions — score not considered, AI uses GPA only");
  if (rigorTier !== "none") reasonParts.push(`Rigor: ${rigorLabel(rigorTier)}`);
  if (baseResult.planNote) reasonParts.push(baseResult.planNote);
  if (schoolBlend.callout) reasonParts.push(schoolBlend.callout);
  const effectiveAr = effectiveAcceptanceRate(college, residency);
  const residencyUsed: { residency: Residency; rate: number; overall: number } | null =
    effectiveAr !== college.acceptanceRate
      ? { residency, rate: effectiveAr, overall: college.acceptanceRate }
      : null;
  if (residencyUsed) {
    const label =
      residencyUsed.residency === "in-state"
        ? `Using in-state rate ${residencyUsed.rate}% (overall ${residencyUsed.overall}%)`
        : residencyUsed.residency === "international"
          ? `Using international rate ${residencyUsed.rate}% (overall ${residencyUsed.overall}%)`
          : `Using OOS rate ${residencyUsed.rate}% (overall ${residencyUsed.overall}% reflects in-state preference)`;
    reasonParts.push(label);
  }
  const reason = reasonParts.length > 0 ? reasonParts.join(". ") + "." : `Based on ${effectiveAr}% acceptance rate.`;

  // Build the multiplier-stack trace. Steps show running chance after each
  // layer so the UI can render an accumulating display.
  const breakdown = buildBreakdown({
    baseRate: baseResult.rate,
    baseLabel:
      baseResult.planNote ??
      (residencyUsed
        ? `${residencyUsed.residency === "in-state" ? "In-state" : residencyUsed.residency === "international" ? "International" : "OOS"} acceptance rate (${residencyUsed.rate}% — overall ${residencyUsed.overall}%)`
        : `Overall acceptance rate (${effectiveAr}%)`),
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
    ai,
    testOptionalNoScore,
    capValue,
    capApplied,
    capBracket: capBracketLabel(effectiveAr, isEdLikePlan),
    finalChance: chance.mid,
    schoolBlend,
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
    schoolBlend,
    residencyUsed: residencyUsed ?? undefined,
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
  ai: AcademicIndex | null;
  testOptionalNoScore: boolean;
  capValue: number;
  capApplied: boolean;
  capBracket: string;
  finalChance: number;
  schoolBlend: SchoolBlendResult;
}

function buildBreakdown(a: BuildBreakdownArgs): ChanceBreakdown {
  const steps: BreakdownStep[] = [];
  let running = a.baseRate;

  // Stats step (rigor folded into the band, surfaced in note when not 'none')
  const noteFragments: string[] = [];
  if (a.yieldProtected && a.rawStatMultiplier !== a.statMultiplier) {
    noteFragments.push(
      `Yield-protected: capped from ${a.rawStatMultiplier.toFixed(2)}× to ${a.statMultiplier.toFixed(2)}×`,
    );
  }
  if (a.rigorTier !== "none") {
    noteFragments.push(`Rigor: ${rigorLabel(a.rigorTier)}`);
  }
  if (a.testOptionalNoScore) {
    noteFragments.push("AI computed using GPA only (no test submitted)");
  }
  noteFragments.push(
    "Multipliers anchored to Arcidiacono SFFA Harvard 2019. Top decile non-ALDC admit rate 15.3% / baseline 4.0% = 3.83×.",
  );
  const yieldNote = noteFragments.join(" ");
  running = clamp(running * a.statMultiplier, 0.5, 95);
  steps.push({
    label: a.ai != null
      ? `Stats (${prettyBand(a.statBand)}, AI ${Math.round(a.ai.value)})`
      : `Stats (${prettyBand(a.statBand)})`,
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
    running = a.capValue;
    steps.push({
      label: `Selectivity cap (${a.capBracket})`,
      multiplier: a.capValue / running,
      runningChance: a.capValue,
      note: `Capped at ${a.capValue}% — bracket reflects institutional uncertainty.`,
    });
  }

  // School-history blend step (only when applied; the blend result already
  // baked the new midpoint, so this step exists for trace transparency).
  if (a.schoolBlend.applied && a.schoolBlend.record) {
    const r = a.schoolBlend.record;
    const blendMult = running > 0 ? a.schoolBlend.mid / running : 1;
    running = a.schoolBlend.mid;
    const sample = `${r.totalAdmits}/${r.totalApplicants} admitted`;
    const weightPct = Math.round(a.schoolBlend.schoolWeight * 100);
    steps.push({
      label: `Your school's history (${sample})`,
      multiplier: blendMult,
      runningChance: round1(running),
      note:
        `Blended at ${weightPct}% weight from your high school's record at this college. ` +
        `Sample size: ${r.sampleSizeLabel}.`,
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

// Phrase the user's stat band using the Academic Index. AI is school-neutral
// (anchored to Arcidiacono Harvard 2019 deciles), so we describe the
// applicant's tier rather than their position relative to a specific
// school's distribution.
function aiPhrase(ai: AcademicIndex, band: StatBand): string {
  const v = Math.round(ai.value);
  const mode = ai.gpaOnlyMode ? " (GPA-only mode — no test submitted)"
    : ai.testOnlyMode ? " (test-only mode — no GPA on file)"
    : "";
  switch (band) {
    case "above-p75":    return `Your Academic Index of ${v} is in the top decile (≥230) per Arcidiacono Harvard 2019${mode}`;
    case "above-median": return `Your Academic Index of ${v} sits above the median (220-229, deciles 8-9)${mode}`;
    case "mid-range":    return `Your Academic Index of ${v} is in the mid-range (210-219, deciles 6-7)${mode}`;
    case "below-median": return `Your Academic Index of ${v} is below the median (200-209, deciles 4-5)${mode}`;
    case "below-p25":    return `Your Academic Index of ${v} is below the 25th percentile (<200, deciles 1-3)${mode}`;
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
