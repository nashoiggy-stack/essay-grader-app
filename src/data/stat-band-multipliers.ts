// Stat-band and EC multipliers for the chance model (W3 + final calibration).
//
// Rule-of-thumb. W3 will replace with empirical decile-level data from
// Hoxby/Avery/Arcidiacono research. Compressed multipliers in prior version
// (~1.0-1.4x range) undercounted exceptional ECs and over-flattened the
// stat-band scale; this calibration restores meaningful differentiation
// across both axes while keeping the ratio of exceptional/average admit
// rates within the ~3-4x range supported by SFFA exhibits.
//
// ── Sources ─────────────────────────────────────────────────────────────────
// - Arcidiacono, Kinsler & Ransom (2022), Harvard SFFA exhibits
// - Hoxby & Avery (2013), NBER WP 18586 ("Missing One-Offs")
// - Espenshade & Radford (2009), institutional-tier penalty data
// - College Board AP/SAT research briefs (2018-2023)
//
// All numbers are conservative interpretations; real admissions ratio data
// supports ~3-4x exceptional/average gap, not 5x+, which is why the chance
// model in admissions.ts also applies a >4.0 raw-multiplier dampener.

// ── Stat bands ──────────────────────────────────────────────────────────────
//
// Five bands based on user position relative to school's published 25th/75th
// percentile range. Combined via min(GPA band, test band) per Decision 3 —
// uneven profiles do not get the high-stat benefit.
//
//   above-p75:    user above school's 75th percentile on BOTH GPA and test
//                 (or one if other is null)                          → 3.0x
//   above-median: clearly above the school's median but below p75    → 1.7x
//   mid-range:    around the school's median                         → 1.0x
//   below-median: below median but above 25th percentile             → 0.5x
//   below-p25:    below 25th percentile                              → 0.2x

export type StatBand =
  | "above-p75"
  | "above-median"
  | "mid-range"
  | "below-median"
  | "below-p25";

export const STAT_BAND_MULTIPLIER: Record<StatBand, number> = {
  "above-p75":    3.0,
  "above-median": 1.7,
  "mid-range":    1.0,
  "below-median": 0.5,
  "below-p25":    0.2,
};

export function getStatBandMultiplier(band: StatBand): number {
  return STAT_BAND_MULTIPLIER[band];
}

// Ordering for min() combine: lower rank = lower multiplier wins (more
// conservative). When user is top-quartile on one metric and mid-range on
// the other, the lower band drives the multiplier.
export const STAT_BAND_RANK: Record<StatBand, number> = {
  "above-p75":    5,
  "above-median": 4,
  "mid-range":    3,
  "below-median": 2,
  "below-p25":    1,
};

// ── EC band multipliers ─────────────────────────────────────────────────────
//
// Five EC bands from the EC Evaluator. Distinguished EC auto-flags (first
// author publication, national competition placement, founder with users,
// selective program admit) override the user's profile.ecBand and force
// "exceptional" — see UserProfile / computeAdmissionChance.
//
//   limited      (below average) — 0.7x   limited involvement
//   developing   (average)       — 1.0x   typical neutral baseline
//   solid        (above average) — 1.2x   meaningful involvement
//   strong                       — 1.4x   state-level achievement, varsity
//                                          captaincy, leadership in named orgs
//   exceptional                  — 1.7x   first-author publication, national
//                                          competition placement, founder with
//                                          users/revenue, RSI/TASP-tier
//                                          selective program admit
//
// Rule-of-thumb until W3 sources empirical EC effects.

export const EC_BAND_MULTIPLIER: Record<string, number> = {
  limited:    0.7,
  developing: 1.0,
  solid:      1.2,
  strong:     1.4,
  exceptional: 1.7,
};

export function getEcBandMultiplier(ecBand: string | undefined): number {
  if (!ecBand) return 1.0;
  return EC_BAND_MULTIPLIER[ecBand] ?? 1.0;
}

// ── Combined multiplier dampener ────────────────────────────────────────────
//
// Apply when stat-band × EC multiplier exceeds 4.0. Real admissions ratio
// of exceptional/average admit rates supports ~3-4x, not 5x+. Without this,
// elite stats × exceptional ECs would compound to 5.1x and overstate chance.

export function applyCombinedDampener(rawStatTimesEc: number): number {
  if (rawStatTimesEc <= 4.0) return rawStatTimesEc;
  return 4.0 + (rawStatTimesEc - 4.0) * 0.5;
}

// ── Final selectivity caps ──────────────────────────────────────────────────
//
// No school with overall admit rate under 15% produces "likely" tier output
// regardless of profile — top schools have institutional uncertainty
// (hooked-applicant slots, class composition needs, holistic review noise)
// that prevents unhooked applicants from being "likely". The 39% upper bound
// for 5-15% schools deliberately stops at the target tier ceiling so the
// classification can be at most "target".
//
// EA at non-restrictive schools (e.g. MIT, USC) uses RD caps because EA
// gives no binding boost. REA/SCEA uses ED caps because they're Restrictive
// Early Action — institutionally treated like ED for early-pool advantage.

export type SelectivityCapPlan = "RD" | "ED";

export interface ChanceCap {
  rd: number;
  ed: number;
}

// Single cap table — every school is treated as holistic. The earlier
// stats-driven public split was over-inflating chances at UNC/UMich/UVA/UCs
// for stat-strong applicants under the (incorrect) assumption that those
// schools admit purely formulaically.
export function getChanceCap(overallAcceptanceRate: number): ChanceCap {
  if (overallAcceptanceRate < 5)  return { rd: 18, ed: 25 };
  if (overallAcceptanceRate < 10) return { rd: 22, ed: 30 };
  if (overallAcceptanceRate < 15) return { rd: 28, ed: 35 };
  if (overallAcceptanceRate < 25) return { rd: 45, ed: 55 };
  if (overallAcceptanceRate < 50) return { rd: 70, ed: 70 };
  return { rd: 90, ed: 90 };
}
