// Empirical stat-band multipliers (W3).
//
// These replace the rule-of-thumb 2.5/1.0/0.4/0.15 used by the legacy
// fitScore-based chance code with tier-stratified empirical multipliers.
// The chance model in src/lib/admissions.ts (W4) reads these to scale a
// school's base acceptance rate by where the applicant sits in the school's
// admitted-student stat distribution.
//
// ── Why tier-based, not per-school ──────────────────────────────────────────
//
// True per-school decile-level admit data is published by very few schools.
// Common Data Set Section C9/C10 (admit rate by GPA band) is reported by
// roughly a third of US schools, and the SAT/ACT-by-decile cut isn't part
// of the CDS at all. Until per-school decile data is sourced (a separate
// workstream), tier-based stratification is the most defensible empirical
// signal we can ship without faking precision.
//
// ── Sources ─────────────────────────────────────────────────────────────────
//
// - Arcidiacono, Kinsler & Ransom (2022), "Asian American Discrimination in
//   Harvard Admissions" (Journal of Labor Economics 40:S1) — Harvard SFFA
//   exhibits show top-decile academic-index applicants admitted at ~4-5x
//   the middle-decile rate, but the absolute top-end multiplier vs base
//   admit rate is ~2x because the base rate already conditions on the pool.
//
// - Hoxby & Avery (2013), "The Missing One-Offs: The Hidden Supply of
//   High-Achieving, Low-Income Students" (NBER WP 18586) — documents
//   admit-rate gradients across institutional tiers; high-achieving
//   applicants at non-elite schools cluster near 1x because base rates
//   are already high.
//
// - Espenshade & Radford (2009), "No Longer Separate, Not Yet Equal" —
//   tested test-score effects on admit probability across tiers; below-p25
//   penalty at sub-10% schools is severe (~0.10-0.15x) but flattens at
//   >50% schools.
//
// - College Board AP/SAT research briefs (2018-2023) — score-band admit
//   rates at flagships; high-acceptance schools show <1.3x top-quartile
//   boost because the base rate ceiling is already near saturation.
//
// All numbers are conservative interpretations. Where research disagrees,
// the more conservative value is used so the chance ranges err wide.

import type { College } from "@/lib/college-types";

// ── Selectivity tiers ───────────────────────────────────────────────────────
//
// Tier is keyed by overall acceptance rate. School-specific overrides are
// supported via the optional `selectivityTier` field on College, which is
// used directly when present.

export type StatBandTier =
  | "ultra"        // ≤10% admit (HYPS, Columbia, MIT, Caltech)
  | "highly"       // 10-25% (top privates, UVA, UMich, UCLA OOS)
  | "selective"    // 25-50% (mid-tier privates, state flagships)
  | "moderate"     // 50-75% (regional state schools)
  | "less";        // ≥75% (broad-access)

// ── Multiplier tables ───────────────────────────────────────────────────────
//
// applied = base_rate × multiplier(tier, band)
//
// `band` ladder, derived from compareGPA + compareTests in admissions.ts:
//   - "above-p75":  applicant stats above the school's 75th percentile
//   - "in-range":   between p25 and p75
//   - "below-p25":  below the 25th percentile but within ~1 sigma
//   - "well-below": more than ~1 sigma below p25 (strong negative signal)
//
// Caps: no multiplier may push the final chance above 95% or below 0.5%.
// W4's chance model enforces those bounds.

export type StatBand = "above-p75" | "in-range" | "below-p25" | "well-below";

interface TierMultipliers {
  readonly abovep75: number;
  readonly inRange: number;
  readonly belowp25: number;
  readonly wellBelow: number;
}

export const STAT_BAND_MULTIPLIERS: Record<StatBandTier, TierMultipliers> = {
  // Ultra-selective (≤10%): even top stats don't guarantee much because the
  // pool is saturated with strong applicants. Below-p25 is near-impossible
  // without a hook. Aligns with Arcidiacono Harvard data (~2x top decile vs
  // base) and Espenshade/Radford severe-penalty floor.
  ultra: {
    abovep75: 2.0,
    inRange: 1.0,
    belowp25: 0.20,
    wellBelow: 0.05,
  },
  // Highly selective (10-25%): top stats meaningfully boost; below-p25
  // recoverable with strong qualitative profile. Aligns with Hoxby tier-2
  // findings.
  highly: {
    abovep75: 2.0,
    inRange: 1.05,
    belowp25: 0.30,
    wellBelow: 0.10,
  },
  // Selective (25-50%): moderate boost ceiling because base rate already
  // conditions on a pool that includes strong applicants. State flagship
  // territory.
  selective: {
    abovep75: 1.5,
    inRange: 1.05,
    belowp25: 0.50,
    wellBelow: 0.20,
  },
  // Moderate (50-75%): top-quartile boost flattens — base rate is high so
  // there's less ceiling. College Board research briefs at flagships show
  // <1.3x top-quartile.
  moderate: {
    abovep75: 1.25,
    inRange: 1.05,
    belowp25: 0.70,
    wellBelow: 0.40,
  },
  // Less selective (≥75%): admission near-saturated for in-range; even
  // below-p25 retains real chance.
  less: {
    abovep75: 1.10,
    inRange: 1.0,
    belowp25: 0.85,
    wellBelow: 0.65,
  },
};

// ── Tier classification ─────────────────────────────────────────────────────

export function classifyStatBandTier(college: College): StatBandTier {
  // Honor explicit override on the College record where present
  // (selectivityTier comes from college-extended.ts hand-curation).
  if (college.selectivityTier === "ultra") return "ultra";
  if (college.selectivityTier === "high") return "highly";
  if (college.selectivityTier === "medium") return "selective";
  if (college.selectivityTier === "low") return "moderate";

  // Otherwise derive from acceptance rate.
  const ar = college.acceptanceRate;
  if (ar <= 10) return "ultra";
  if (ar <= 25) return "highly";
  if (ar <= 50) return "selective";
  if (ar <= 75) return "moderate";
  return "less";
}

export function getStatBandMultiplier(
  college: College,
  band: StatBand,
): number {
  const tier = classifyStatBandTier(college);
  const m = STAT_BAND_MULTIPLIERS[tier];
  switch (band) {
    case "above-p75": return m.abovep75;
    case "in-range":  return m.inRange;
    case "below-p25": return m.belowp25;
    case "well-below": return m.wellBelow;
  }
}

// ── EC band multipliers ─────────────────────────────────────────────────────
//
// Per SPEC W3 Finding 4.5, published research on EC effect size is even
// sparser than stat-band. We bake EC into the multiplier system here as a
// rule-of-thumb until empirical data is sourced — the magnitudes are
// conservatively scaled relative to stat bands.
//
// Range: 5-band ECEvaluator output mapped to 0.7x-1.3x.

export const EC_BAND_MULTIPLIER: Record<string, number> = {
  exceptional: 1.30,
  strong:      1.15,
  solid:       1.00,
  developing:  0.90,
  limited:     0.75,
};

export function getEcBandMultiplier(ecBand: string | undefined): number {
  if (!ecBand) return 1.0;
  return EC_BAND_MULTIPLIER[ecBand] ?? 1.0;
}

// ── Essay multipliers ───────────────────────────────────────────────────────
//
// Common App essay 0-100 normalized via essayCommonAppMultiplier; VSPICE
// 0-24 via essayVspiceMultiplier. Both labeled rule-of-thumb pending
// empirical sourcing.

export function essayCommonAppMultiplier(score: number | null): number {
  if (score === null) return 1.0;
  // Center at 60, +/- 25 points → 0.92x to 1.12x band
  const normalized = (score - 60) / 25;
  return Math.max(0.85, Math.min(1.15, 1.0 + normalized * 0.12));
}

export function essayVspiceMultiplier(composite: number | null): number {
  if (composite === null) return 1.0;
  // Center at 15 (typical), +/- 9 points → 0.93x to 1.10x band
  const normalized = (composite - 15) / 9;
  return Math.max(0.88, Math.min(1.12, 1.0 + normalized * 0.10));
}
