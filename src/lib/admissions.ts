import type { College, Classification, ChanceBand } from "./college-types";

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
 * Apply diminishing returns for scores above the 75th percentile.
 * Below p75: linear scaling (full value per point).
 * Above p75: logarithmic flattening — each additional point is worth less.
 * This makes 35→36 ACT or 1550→1580 SAT almost negligible.
 */
function applyDiminishingReturns(rawNormalized: number): number {
  if (rawNormalized <= 0) return rawNormalized; // no flattening for below-range scores
  if (rawNormalized <= 0.6) return rawNormalized; // linear up to ~60th percentile region
  // Above 0.6: log curve that flattens sharply
  // At rawNormalized=0.6 → 0.6 (continuous)
  // At rawNormalized=1.5 → ~0.88 (heavily dampened)
  const excess = rawNormalized - 0.6;
  return 0.6 + 0.3 * Math.log1p(excess / 0.3);
}

/**
 * Compute a normalized test fit signal for a single test against a school's range.
 * Returns a value roughly in [-1.5, +0.9] with diminishing returns above p75.
 */
function normalizeTestScore(
  score: number,
  p25: number,
  p75: number,
  minSpread: number
): number {
  const mid = (p25 + p75) / 2;
  const spread = Math.max((p75 - p25) / 2, minSpread);
  const raw = Math.max(-1.5, Math.min(1.5, (score - mid) / spread));
  return applyDiminishingReturns(raw);
}

/** Normalize SAT to a school-relative fit index. */
export function normalizeSatToIndex(sat: number, college: College): number {
  return normalizeTestScore(sat, college.sat25, college.sat75, 40);
}

/** Normalize ACT to a school-relative fit index. */
export function normalizeActToIndex(act: number, college: College): number {
  return normalizeTestScore(act, college.act25, college.act75, 2);
}

/**
 * Pick the best single test signal. If both SAT and ACT are provided,
 * use whichever gives the student a better (higher) normalized fit.
 * This prevents stacking two tests for an inflated score.
 */
export function getBestTestSignal(
  sat: number | null,
  act: number | null,
  college: College
): { type: "sat" | "act" | null; score: number | null; normalized: number } {
  if (college.testPolicy === "blind") return { type: null, score: null, normalized: 0 };

  const satNorm = sat !== null ? normalizeSatToIndex(sat, college) : null;
  const actNorm = act !== null ? normalizeActToIndex(act, college) : null;

  if (satNorm !== null && actNorm !== null) {
    // Use whichever is more favorable
    return satNorm >= actNorm
      ? { type: "sat", score: sat, normalized: satNorm }
      : { type: "act", score: act, normalized: actNorm };
  }
  if (satNorm !== null) return { type: "sat", score: sat, normalized: satNorm };
  if (actNorm !== null) return { type: "act", score: act, normalized: actNorm };
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

// ── Classification (for College List Builder) ────────────────────────────────

export function classifyCollege(
  college: College,
  gpaUW: number | null,
  gpaW: number | null,
  sat: number | null,
  act: number | null,
  essayCA: number | null = null,
  essayV: number | null = null
): { classification: Classification; reason: string; fitScore: number } {
  const gpaResult = compareGPA(gpaUW, gpaW, college.avgGPAUW, college.avgGPAW);
  const testResult = compareTests(sat, act, college);
  const essayResult = essayScoreAdjustment(essayCA, essayV);

  const allSignals = [...gpaResult.signals, ...testResult.signals, ...essayResult.signals];
  const totalDelta = gpaResult.delta + testResult.delta;
  const totalMetrics = gpaResult.metrics + testResult.metrics;

  const avg = totalMetrics > 0 ? totalDelta / totalMetrics : 0;
  let classification: Classification;
  let fitScore: number;

  // Essay adjustment applies as a small fitScore modifier (not classification-changing)
  const essayBoost = essayResult.adjustment * 0.5; // dampen for classification purposes

  // 5-tier classification: unlikely → reach → target → likely → safety
  if (avg > 0.8 && college.acceptanceRate >= 40) {
    // Safety: stats well above average AND school isn't too selective
    classification = "safety";
    fitScore = Math.min(95, 80 + avg * 10 + essayBoost);
  } else if (avg > 0.4) {
    // Likely: stats above average, good chance but not guaranteed
    classification = "likely";
    fitScore = Math.min(88, 65 + avg * 20 + essayBoost);
  } else if (avg > -0.3) {
    // Target: stats within range
    classification = "target";
    fitScore = Math.min(75, 50 + (avg + 0.3) * 35 + essayBoost);
  } else if (avg > -0.8) {
    // Reach: stats below range but not impossible
    classification = "reach";
    fitScore = Math.max(15, 35 + avg * 20 + essayBoost);
  } else {
    // Unlikely: stats well below range
    classification = "unlikely";
    fitScore = Math.max(5, 20 + avg * 10 + essayBoost);
  }

  // Highly selective schools (<15%) can never be safety — cap at likely
  if ((classification === "safety" || classification === "likely") && college.acceptanceRate < 15) {
    classification = "target";
    fitScore = Math.min(fitScore, 70);
  }

  // Selective-tagged schools with <25% acceptance can't be safety — cap at likely
  if (classification === "safety" && college.tags.includes("selective")) {
    classification = "likely";
    fitScore = Math.min(fitScore, 82);
  }

  // No metrics → fall back to acceptance rate heuristic
  if (totalMetrics === 0) {
    if (college.acceptanceRate < 15) { classification = "reach"; fitScore = 25; }
    else if (college.acceptanceRate < 30) { classification = "target"; fitScore = 45; }
    else if (college.acceptanceRate < 55) { classification = "target"; fitScore = 55; }
    else if (college.acceptanceRate < 75) { classification = "likely"; fitScore = 68; }
    else { classification = "safety"; fitScore = 80; }
  }

  const reason = allSignals.length > 0
    ? allSignals.map((s) => s.label).join(". ") + "."
    : `Based on ${college.acceptanceRate}% acceptance rate.`;

  return { classification, reason, fitScore: Math.round(fitScore) };
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
  vspiceComposite: number | null // 0-4
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

  // VSPICE composite (0-4) — normalize to a -5 to +5 range
  if (vspiceComposite !== null) {
    const normalized = (vspiceComposite - 2.5) / 1.5; // 2.5 is "average"
    const boost = Math.max(-4, Math.min(4, normalized * 5));
    adjustment += boost;

    if (vspiceComposite >= 3.2) {
      signals.push({ label: `Strong VSPICE score (${vspiceComposite.toFixed(1)}/4) — shows depth of character`, delta: boost });
    } else if (vspiceComposite >= 2.3) {
      signals.push({ label: `Solid VSPICE score (${vspiceComposite.toFixed(1)}/4)`, delta: boost });
    } else {
      signals.push({ label: `VSPICE score (${vspiceComposite.toFixed(1)}/4) could be strengthened`, delta: boost });
    }
  }

  return { adjustment: Math.round(adjustment), signals };
}
