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

// ── Test Score Comparison ────────────────────────────────────────────────────

export function compareTests(
  sat: number | null,
  act: number | null,
  college: College
): { signals: Signal[]; delta: number; metrics: number } {
  const signals: Signal[] = [];
  let delta = 0;
  let metrics = 0;

  if (sat !== null && college.testPolicy !== "blind") {
    const mid = (college.sat25 + college.sat75) / 2;
    const spread = Math.max((college.sat75 - college.sat25) / 2, 1);
    const normalized = (sat - mid) / spread;
    delta += normalized;
    metrics++;

    if (sat >= college.sat75) {
      signals.push({ label: `Your SAT (${sat}) is above the 75th percentile (${college.sat75})`, delta: normalized });
    } else if (sat >= college.sat25) {
      signals.push({ label: `Your SAT (${sat}) is within the school's range (${college.sat25}-${college.sat75})`, delta: normalized });
    } else {
      signals.push({ label: `Your SAT (${sat}) is below the 25th percentile (${college.sat25})`, delta: normalized });
    }
  }

  if (act !== null && college.testPolicy !== "blind") {
    const mid = (college.act25 + college.act75) / 2;
    const spread = Math.max((college.act75 - college.act25) / 2, 1);
    const normalized = (act - mid) / spread;
    delta += normalized;
    metrics++;

    if (act >= college.act75) {
      signals.push({ label: `Your ACT (${act}) is above the 75th percentile (${college.act75})`, delta: normalized });
    } else if (act >= college.act25) {
      signals.push({ label: `Your ACT (${act}) is within range (${college.act25}-${college.act75})`, delta: normalized });
    } else {
      signals.push({ label: `Your ACT (${act}) is below the 25th percentile (${college.act25})`, delta: normalized });
    }
  }

  return { signals, delta, metrics };
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
  act: number | null
): { classification: Classification; reason: string; fitScore: number } {
  const gpaResult = compareGPA(gpaUW, gpaW, college.avgGPAUW, college.avgGPAW);
  const testResult = compareTests(sat, act, college);

  const allSignals = [...gpaResult.signals, ...testResult.signals];
  const totalDelta = gpaResult.delta + testResult.delta;
  const totalMetrics = gpaResult.metrics + testResult.metrics;

  const avg = totalMetrics > 0 ? totalDelta / totalMetrics : 0;
  let classification: Classification;
  let fitScore: number;

  if (avg > 0.5) {
    classification = "safety";
    fitScore = Math.min(95, 70 + avg * 20);
  } else if (avg > -0.3) {
    classification = "target";
    fitScore = Math.min(80, 50 + (avg + 0.3) * 40);
  } else {
    classification = "reach";
    fitScore = Math.max(5, 30 + avg * 20);
  }

  // Safety requires: acceptance rate >= 30% AND strong academic fit
  if (classification === "safety" && college.acceptanceRate < 30) {
    classification = "target";
    fitScore = Math.min(fitScore, 75);
  }

  // Selective-tagged schools get extra guard
  if (classification === "safety" && college.tags.includes("selective")) {
    classification = "target";
    fitScore = Math.min(fitScore, 72);
  }

  // No metrics → fall back to acceptance rate heuristic
  if (totalMetrics === 0) {
    if (college.acceptanceRate < 20) { classification = "reach"; fitScore = 30; }
    else if (college.acceptanceRate < 50) { classification = "target"; fitScore = 55; }
    else { classification = "safety"; fitScore = 75; }
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

// ── Essay Strength Mapping ───────────────────────────────────────────────────

export function essayScoreToStrength(
  commonAppAvg: number,
  vspiceComposite: number
): "low" | "medium" | "high" {
  // commonAppAvg is 0-100, vspiceComposite is 0-4
  const normalized = (commonAppAvg / 100 + vspiceComposite / 4) / 2; // 0-1 range
  if (normalized >= 0.7) return "high";
  if (normalized >= 0.45) return "medium";
  return "low";
}
