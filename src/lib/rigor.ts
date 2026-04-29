/**
 * rigor.ts
 *
 * Final calibration: derive a 6-tier rigor classification from
 * advancedCoursework[] + advancedCourseworkAvailable. Replaces the prior
 * single-dropdown 'low'|'medium'|'high' input.
 *
 * Tier definitions (volume baked into thresholds — no separate volume mult):
 *   top     ≥6 5-equivalent scores AND ≥75% of all scores are 5-equivalent
 *   high    ≥4 5-equivalent scores AND majority 5-equivalent
 *   solid   ≥4 advanced courses AND majority 4-or-5-equivalent
 *   mixed   3-equivalents present, 4-and-5-equivalents majority
 *   weak    majority 3-equivalent or below
 *   none    no scores entered, OR advancedCourseworkAvailable === 'none'
 *
 * AP/IB equivalence with HL boost:
 *   AP 5  = IB-HL 7 = IB-HL 6 = "5-equivalent"
 *   AP 4  = IB-HL 5 = IB-SL 7 = "4-equivalent"
 *   AP 3  = IB-SL 6 = IB-SL 5 = "3-equivalent"
 *   AP 1-2 / IB <5 = "low"
 *
 * DE excluded — wide variance in rigor and reporting.
 *
 * AI refinement: the W/UW ratio feeds in as a corroborating signal alongside
 * AP/IB scores. When a student has compounded weighting bonuses through
 * advanced coursework, ratio ≥1.20 reads "strong" and can promote rigor
 * tier by one band. Provides a non-zero rigor signal for students who
 * haven't entered AP scores yet but whose weighted GPA reflects rigor.
 *
 * Mark: rule-of-thumb. Pending W3 empirical research on per-tier admit-rate
 * differentiation. Reasoning is sourced to common counselor intuition that
 * (a) consistency matters as much as ceiling — 8 fives reads stronger than
 * 12 mixed; (b) IB-HL ≥6 reads as ≥AP 5 because HL exam difficulty exceeds
 * AP at the top of the curve.
 */
import type { AdvancedCourseworkRow } from "./profile-types";
import type { WuwSignal } from "./academic-index";

export type RigorTier = "top" | "high" | "solid" | "mixed" | "weak" | "none";

type Equivalent = "5-eq" | "4-eq" | "3-eq" | "low" | null;

function classifyRow(row: AdvancedCourseworkRow): Equivalent {
  if (row.score == null) return null;
  if (row.type === "AP") {
    if (row.score === 5) return "5-eq";
    if (row.score === 4) return "4-eq";
    if (row.score === 3) return "3-eq";
    return "low";
  }
  if (row.type === "IB-HL") {
    if (row.score >= 6) return "5-eq";
    if (row.score === 5) return "4-eq";
    if (row.score === 4) return "3-eq";
    return "low";
  }
  // IB-SL caps at "4-equivalent" by design — SL difficulty is below HL.
  if (row.type === "IB-SL") {
    if (row.score === 7) return "4-eq";
    if (row.score >= 5) return "3-eq";
    return "low";
  }
  return null;
}

const RIGOR_RANK: Record<RigorTier, number> = {
  none: 0,
  weak: 1,
  mixed: 2,
  solid: 3,
  high: 4,
  top: 5,
};
const RIGOR_BY_RANK: Record<number, RigorTier> = {
  0: "none",
  1: "weak",
  2: "mixed",
  3: "solid",
  4: "high",
  5: "top",
};

export function classifyRigor(
  coursework: readonly AdvancedCourseworkRow[] | undefined,
  available: "all" | "limited" | "none" | undefined,
  wuwSignal: WuwSignal = null,
): RigorTier {
  if (available === "none") return "none";
  const rows = coursework ?? [];
  const scored = rows
    .map((r) => classifyRow(r))
    .filter((e): e is Exclude<Equivalent, null> => e !== null);

  // No scored coursework: fall back on W/UW ratio when available. A 'strong'
  // ratio (≥1.20) without entered AP scores reads as 'mixed' rigor — enough
  // to corroborate but not enough to promote to 'solid' without scores.
  if (scored.length === 0) {
    if (wuwSignal === "strong") return "mixed";
    if (wuwSignal === "solid") return "weak";
    return "none";
  }

  const fives = scored.filter((e) => e === "5-eq").length;
  const fours = scored.filter((e) => e === "4-eq").length;
  const threes = scored.filter((e) => e === "3-eq").length;
  const lows = scored.filter((e) => e === "low").length;
  const total = scored.length;

  const fivesPct = fives / total;
  const fivesAndFoursPct = (fives + fours) / total;
  const threesAndBelow = threes + lows;

  // top: ≥6 fives AND ≥75% of all scores are fives.
  let tier: RigorTier;
  if (fives >= 6 && fivesPct >= 0.75) tier = "top";
  // high: ≥4 fives AND majority fives (>50%).
  else if (fives >= 4 && fivesPct > 0.5) tier = "high";
  // solid: ≥4 advanced courses AND majority 4-or-5.
  else if (total >= 4 && fivesAndFoursPct > 0.5) tier = "solid";
  // mixed: threes present AND 4s+5s are majority.
  else if (threes >= 1 && fivesAndFoursPct > 0.5) tier = "mixed";
  // weak: majority 3-or-below.
  else if (threesAndBelow / total >= 0.5) tier = "weak";
  // Fallback: small sample, ambiguous. Treat as mixed when at least one
  // 4-or-5 exists, otherwise weak.
  else tier = fives + fours > 0 ? "mixed" : "weak";

  // W/UW ratio refinement: a strong ratio (≥1.20) promotes rigor by one
  // band when it'd otherwise be tied (e.g. 'solid' → 'high' when AP scores
  // are mostly 4s but the student's weighted GPA confirms heavy advanced
  // coursework load). Capped so it can't elevate weak-foundation profiles.
  if (wuwSignal === "strong" && tier !== "top" && tier !== "weak") {
    return RIGOR_BY_RANK[RIGOR_RANK[tier] + 1];
  }
  return tier;
}

// Maps the 6-tier rigor classification to a coarse signal used by the
// stat-band consensus rule. Top/high → "strong", solid/mixed → "moderate",
// weak → "weak", none → null (excluded from consensus).
export function rigorSignal(tier: RigorTier): "strong" | "moderate" | "weak" | null {
  if (tier === "top" || tier === "high") return "strong";
  if (tier === "solid" || tier === "mixed") return "moderate";
  if (tier === "weak") return "weak";
  return null;
}

// Display label for the breakdown panel + chance reason text.
export function rigorLabel(tier: RigorTier): string {
  return {
    top: "top tier (≥6 5-equivalents, ≥75% fives)",
    high: "high (≥4 fives, majority fives)",
    solid: "solid (≥4 advanced, majority 4s+5s)",
    mixed: "mixed (4s+5s majority, some 3s)",
    weak: "weak (majority 3s or below)",
    none: "no advanced coursework reported",
  }[tier];
}
