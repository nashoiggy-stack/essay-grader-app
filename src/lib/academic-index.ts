/**
 * academic-index.ts
 *
 * Computes the modernized Academic Index (AI) for chance-model stat
 * classification. Replaces school-relative GPA-percentile + test-percentile
 * banding with an empirically grounded score that maps to Arcidiacono SFFA
 * Harvard 2019 decile admit-rate data.
 *
 * ── Formula (post-SAT-II discontinuation 2021) ─────────────────────────────
 *   weightedGPAComponent = (weightedGPA / 5.0) × 80
 *   testComponent        = ((SAT - 400) / 1200) × 80
 *                          OR ((convertedACT - 400) / 1200) × 80 for ACT input
 *   AI = (weightedGPAComponent × 1.5) + (testComponent × 1.5)
 *
 *   Range: 60-240 (typical applicant). Equal weighting between GPA and test.
 *   Source: Top Tier Admissions modernized AI calculator. Originally from
 *   Hernandez, "A is for Admission" (1997) — Ivy League formula.
 *
 * ── ACT to SAT conversion ──────────────────────────────────────────────────
 *   Uses the College Board / ACT joint concordance table. When both SAT and
 *   ACT are submitted, the higher SAT-equivalent drives testComponent — same
 *   "best single test" rule the prior chance model used.
 *
 * ── Tier cutoffs (anchored to Arcidiacono Harvard SFFA 2019) ───────────────
 *   Top decile non-ALDC admit rate at Harvard 15.3% / baseline 4.0% = 3.83x.
 *   Top quartile average 2.7x. Source:
 *   http://humcap.uchicago.edu/RePEc/hka/wpaper/Arcidiacono_Kinsler_Ransom_2019_recruit-to-reject.pdf
 *
 *     AI ≥ 230 → top-quartile  (top decile;            Tier 1 3.0×, Tier 2 1.5×)
 *     AI 220-229 → above-median (deciles 8-9;           Tier 1 1.7×, Tier 2 1.2×)
 *     AI 210-219 → mid-range    (deciles 6-7;           Tier 1 1.0×, Tier 2 1.0×)
 *     AI 200-209 → below-median (deciles 4-5;           Tier 1 0.5×, Tier 2 0.7×)
 *     AI < 200   → below-p25    (deciles 1-3;           Tier 1 0.2×, Tier 2 0.5×)
 *
 * ── Test-optional handling ─────────────────────────────────────────────────
 *   When no SAT or ACT is provided, AI uses the GPA component only and
 *   re-weights it 3.0× (instead of the usual 1.5× + 1.5×) to keep the 60-240
 *   typical range. The chance model surfaces a "low confidence" flag and
 *   widens the Tier 2 uncertainty range from ±20% to ±30% in this mode.
 *
 *   The reverse case (test only, no weighted GPA) follows the same 3.0×
 *   re-weighting on the test component. Practical only when an applicant
 *   submits scores but skipped GPA entry.
 */
import type { StatBand } from "@/data/stat-band-multipliers";

// ── ACT to SAT concordance ───────────────────────────────────────────────────

const ACT_TO_SAT: Record<number, number> = {
  36: 1590, 35: 1560, 34: 1530, 33: 1500, 32: 1470, 31: 1440,
  30: 1410, 29: 1380, 28: 1350, 27: 1320, 26: 1290, 25: 1260,
  24: 1230, 23: 1200, 22: 1170, 21: 1140, 20: 1110, 19: 1080,
  18: 1050, 17: 1020, 16: 990, 15: 960, 14: 930, 13: 900, 12: 870,
};

export function actToSatEquivalent(act: number): number {
  const clamped = Math.round(Math.max(12, Math.min(36, act)));
  return ACT_TO_SAT[clamped] ?? 1050;
}

// ── Academic Index value ─────────────────────────────────────────────────────

export interface AcademicIndex {
  /** AI value, typical 60-240. */
  readonly value: number;
  /** GPA component pre-weighting (0-80). */
  readonly weightedGpaComponent: number;
  /** Test component pre-weighting (0-80). */
  readonly testComponent: number;
  /** SAT-scale equivalent of the test used (max(SAT, actToSat(ACT))) or null. */
  readonly testEquivalentSat: number | null;
  /** True when AI was computed using GPA only (no test scores). */
  readonly gpaOnlyMode: boolean;
  /** True when AI was computed using test only (no GPA). Edge case. */
  readonly testOnlyMode: boolean;
}

/**
 * Compute the Academic Index. Returns null only when neither weightedGPA nor
 * any test score is provided — chance model's insufficient-data path catches
 * this.
 *
 * weightedGPA is clamped to 0-5.0 defensively (validation also blocks >5.0
 * at the form layer). testEquivalentSat is clamped to 0-1600 internally via
 * the component math (negative values produce 0).
 */
export function computeAcademicIndex(
  weightedGpa: number | null,
  sat: number | null,
  act: number | null,
): AcademicIndex | null {
  const cappedW =
    weightedGpa != null && Number.isFinite(weightedGpa)
      ? Math.max(0, Math.min(5.0, weightedGpa))
      : null;
  const wComponent = cappedW != null ? (cappedW / 5.0) * 80 : null;

  // Pick the better single test signal on the SAT scale.
  let testEquiv: number | null = null;
  if (sat != null && act != null) {
    testEquiv = Math.max(sat, actToSatEquivalent(act));
  } else if (sat != null) {
    testEquiv = sat;
  } else if (act != null) {
    testEquiv = actToSatEquivalent(act);
  }
  const tComponent =
    testEquiv != null
      ? Math.max(0, Math.min(80, ((testEquiv - 400) / 1200) * 80))
      : null;

  if (wComponent == null && tComponent == null) return null;

  // Test-optional: GPA only, 3.0× weighting to keep range 60-240.
  if (tComponent == null && wComponent != null) {
    return {
      value: wComponent * 3.0,
      weightedGpaComponent: wComponent,
      testComponent: 0,
      testEquivalentSat: null,
      gpaOnlyMode: true,
      testOnlyMode: false,
    };
  }
  // GPA missing but test present (rare; caller usually validates GPA): 3.0×
  // weighting on test alone.
  if (wComponent == null && tComponent != null) {
    return {
      value: tComponent * 3.0,
      weightedGpaComponent: 0,
      testComponent: tComponent,
      testEquivalentSat: testEquiv,
      gpaOnlyMode: false,
      testOnlyMode: true,
    };
  }
  return {
    value: (wComponent as number) * 1.5 + (tComponent as number) * 1.5,
    weightedGpaComponent: wComponent as number,
    testComponent: tComponent as number,
    testEquivalentSat: testEquiv,
    gpaOnlyMode: false,
    testOnlyMode: false,
  };
}

// ── AI to stat band mapping ──────────────────────────────────────────────────

/**
 * Map AI value to the chance model's existing StatBand axis. Cutoffs
 * anchored to Arcidiacono Harvard non-ALDC decile admit-rate data.
 *
 *   AI ≥ 230 → above-p75    (top decile)
 *   AI 220-229 → above-median (deciles 8-9)
 *   AI 210-219 → mid-range    (deciles 6-7)
 *   AI 200-209 → below-median (deciles 4-5)
 *   AI < 200   → below-p25    (deciles 1-3)
 */
export function statBandFromAi(ai: number): StatBand {
  if (ai >= 230) return "above-p75";
  if (ai >= 220) return "above-median";
  if (ai >= 210) return "mid-range";
  if (ai >= 200) return "below-median";
  return "below-p25";
}

// ── W/UW ratio for rigor classifier ──────────────────────────────────────────

/**
 * Weighted-to-unweighted GPA ratio. Feeds the rigor signal classifier
 * alongside AP/IB scores: when ratio is high, the student has been
 * accumulating weighting bonuses through advanced coursework — corroborates
 * the rigor signal even when AP scores aren't reported yet.
 *
 * Returns null when only one of the two GPAs is provided. Ratio of 1.0 means
 * the school doesn't weight (no rigor contribution from this axis).
 */
export type WuwSignal = "strong" | "solid" | "moderate" | "minimal" | null;

export function computeWuwRatio(
  weightedGpa: number | null,
  unweightedGpa: number | null,
): { ratio: number; signal: WuwSignal } | null {
  if (
    weightedGpa == null ||
    unweightedGpa == null ||
    !Number.isFinite(weightedGpa) ||
    !Number.isFinite(unweightedGpa) ||
    unweightedGpa <= 0
  ) {
    return null;
  }
  const ratio = weightedGpa / unweightedGpa;
  let signal: WuwSignal;
  if (ratio >= 1.20) signal = "strong";
  else if (ratio >= 1.10) signal = "solid";
  else if (ratio >= 1.05) signal = "moderate";
  else if (ratio >= 1.0) signal = "minimal";
  else signal = null; // weighted < unweighted is invalid input
  return { ratio, signal };
}
