/**
 * list-grader.ts
 *
 * Pure grading function for the user's pinned college list. Returns a
 * letter grade + numeric breakdown so /list can render an always-expanded
 * grade card with reasons.
 *
 * officialScore = (balanceScore + majorScore) / 2
 *
 * Sub-scores are documented inline. All thresholds are deterministic — the
 * same (pinned, profile) tuple always produces the same grade. No I/O.
 */

import type { College, PinnedCollege, Classification, ApplicationPlan } from "./college-types";
import type { AdvancedCourseworkRow, EssayScoreRecord } from "./profile-types";
import { COLLEGES } from "@/data/colleges";
import { classifyCollege, getApplicationOptions, type ChanceResultModel } from "./admissions";
import { computeMajorFit } from "./major-match";

// ── Per-render caches (perf only — no behavior change) ──────────────────────
//
// gradeList is called many times during a single recommendForList run (up
// to 480x at the swap horizon). Each call resolves the same pins against
// the same profile, hitting classifyCollege twice per pin and COLLEGES.find
// per pin. With a fresh cache passed through one render, repeated work
// collapses to one call per (collegeName, applicationPlan).
//
// The cache is opaque to callers — gradeList accepts it as an optional
// second argument and creates a fresh cache when omitted, so the public
// signature is unchanged.

export type ChanceCache = Map<string, ChanceResultModel>;
export type CollegeIndex = Map<string, College>;

export interface GraderCaches {
  readonly chance: ChanceCache;
  readonly index: CollegeIndex;
}

function emptyCaches(): GraderCaches {
  // Built once per gradeList call when no caches are passed; built once per
  // recommendForList call and shared across simulations.
  const index: CollegeIndex = new Map();
  for (const c of COLLEGES) index.set(c.name, c);
  return { chance: new Map(), index };
}

export function createGraderCaches(): GraderCaches {
  return emptyCaches();
}

function lookupCollege(name: string, caches: GraderCaches): College | undefined {
  const cached = caches.index.get(name);
  if (cached) return cached;
  // Fallback if a name was added since the index was built.
  const found = COLLEGES.find((c) => c.name === name);
  if (found) caches.index.set(name, found);
  return found;
}

function classifyCached(
  college: College,
  plan: ApplicationPlan,
  profile: ListGraderProfile,
  caches: GraderCaches,
): ChanceResultModel {
  const key = `${college.name}|${plan}`;
  const hit = caches.chance.get(key);
  if (hit) return hit;
  const result = classifyCollege(
    college,
    profile.gpaUW, profile.gpaW, profile.sat, profile.act,
    profile.essayCA ?? null, profile.essayV ?? null,
    {
      ecBand: profile.ecBand,
      distinguishedEC: profile.distinguishedEC,
      rigor: profile.rigor,
      apScores: profile.apScores,
      advancedCoursework: profile.advancedCoursework,
      advancedCourseworkAvailable: profile.advancedCourseworkAvailable,
      essayScores: profile.essayScores,
      applicationPlan: plan,
    },
  );
  caches.chance.set(key, result);
  return result;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ListGraderProfile {
  readonly gpaUW: number | null;
  readonly gpaW: number | null;
  readonly sat: number | null;
  readonly act: number | null;
  readonly intendedMajor: string;
  readonly intendedInterest: string;
  // Forwarded to the chance model so balance reflects what the cards show.
  readonly ecBand?: string;
  readonly distinguishedEC?: boolean;
  readonly rigor?: "low" | "medium" | "high";
  readonly apScores?: readonly { score: 1 | 2 | 3 | 4 | 5 }[];
  readonly advancedCoursework?: readonly AdvancedCourseworkRow[];
  readonly advancedCourseworkAvailable?: "all" | "limited" | "none";
  readonly essayScores?: readonly EssayScoreRecord[];
  readonly essayCA?: number | null;
  readonly essayV?: number | null;
}

export interface BalanceBreakdown {
  readonly tierDistribution: { readonly score: number; readonly note: string }; // /40
  readonly count: { readonly score: number; readonly note: string };            // /25
  readonly edLeverage: { readonly score: number; readonly note: string };       // /20
  readonly financialFit: { readonly score: number; readonly note: string };     // /10
  readonly geoDiversity: { readonly score: number; readonly note: string };     // /5
}

export interface MajorBreakdown {
  readonly avgFit: { readonly score: number; readonly note: string };         // weighted 70
  readonly programStrong: { readonly score: number; readonly note: string };  // weighted 30
}

export interface TierCounts {
  readonly safety: number;
  readonly likely: number;
  readonly target: number;
  readonly reach: number;
  readonly unlikely: number;
  readonly insufficient: number;
  readonly total: number;
}

export type Letter =
  | "A+" | "A" | "A-"
  | "B+" | "B" | "B-"
  | "C+" | "C" | "C-"
  | "D"  | "F";

export interface GradeResult {
  readonly officialScore: number; // 0-100, one decimal
  readonly balanceScore: number;  // 0-100, one decimal
  readonly majorScore: number;    // 0-100, one decimal
  readonly letter: Letter;
  readonly reasons: readonly string[];
  readonly balanceBreakdown: BalanceBreakdown;
  readonly majorBreakdown: MajorBreakdown;
  readonly tierCounts: TierCounts;
}

// ── Constants ───────────────────────────────────────────────────────────────

const IDEAL_DISTRIBUTION: Record<"reach" | "target" | "likely" | "safety", number> = {
  reach: 0.30,
  target: 0.30,
  likely: 0.25,
  safety: 0.15,
};

const ED_LEVERAGE_THRESHOLD_PP = 3; // percentage points; matches strategy-engine

// ── Resolution ──────────────────────────────────────────────────────────────

interface ResolvedPin {
  readonly pin: PinnedCollege;
  readonly college: College;
  readonly classification: Classification;
  readonly rdChance: number;
  readonly edChance: number | null; // null if school offers no ED
}

function resolvePins(
  pinned: readonly PinnedCollege[],
  profile: ListGraderProfile,
  caches: GraderCaches,
): readonly ResolvedPin[] {
  const out: ResolvedPin[] = [];
  for (const pin of pinned) {
    const college = lookupCollege(pin.name, caches);
    if (!college) continue;
    // Use the user's selected plan if present; otherwise the card defaults to RD.
    const userPlan: ApplicationPlan = pin.applicationPlan ?? "RD";
    const result = classifyCached(college, userPlan, profile, caches);

    // ED leverage = edChance − rdChance. Compute when the school offers
    // ED/ED2 and the user isn't already viewing ED. Skip when the school
    // doesn't offer ED — null means "not eligible for the leverage check".
    let edChance: number | null = null;
    const offersEd = getApplicationOptions(college).some((o) => o.type === "ED" || o.type === "ED2");
    if (offersEd) {
      const edPlan: ApplicationPlan =
        getApplicationOptions(college).some((o) => o.type === "ED") ? "ED" : "ED2";
      if (userPlan === "ED" || userPlan === "ED2") {
        edChance = result.chance.mid;
      } else {
        edChance = classifyCached(college, edPlan, profile, caches).chance.mid;
      }
    }

    // Always compute RD chance for ED-leverage delta, even when the user
    // selected ED. Otherwise leverage = 0 and we miss the candidate.
    const rdChance: number =
      userPlan === "RD"
        ? result.chance.mid
        : classifyCached(college, "RD", profile, caches).chance.mid;

    out.push({ pin, college, classification: result.classification, rdChance, edChance });
  }
  return out;
}

// ── Tier counts ─────────────────────────────────────────────────────────────

function countTiers(resolved: readonly ResolvedPin[]): TierCounts {
  const counts: Record<Classification, number> = {
    safety: 0, likely: 0, target: 0, reach: 0, unlikely: 0, insufficient: 0,
  };
  for (const r of resolved) counts[r.classification]++;
  return {
    safety: counts.safety,
    likely: counts.likely,
    target: counts.target,
    reach: counts.reach,
    unlikely: counts.unlikely,
    insufficient: counts.insufficient,
    total: resolved.length,
  };
}

// ── balanceScore sub-factors ────────────────────────────────────────────────

/**
 * Tier distribution: 40 pts. Ideal: ~30% reach, ~30% target, ~25% likely,
 * ~15% safety. "unlikely" rolls into the reach bucket (chance variance
 * dominates at sub-10% admit rate, so the practical signal is the same).
 * "insufficient" pins are excluded from the denominator.
 *
 * Score by total absolute deviation from ideal (TAD). 0 deviation → 40 pts;
 * max deviation (200 percentage points) → 0 pts. Linear in between.
 */
function scoreTierDistribution(counts: TierCounts): { score: number; note: string } {
  const denom =
    counts.safety + counts.likely + counts.target + counts.reach + counts.unlikely;
  if (denom === 0) {
    return { score: 0, note: "No classified schools yet — pin some to see balance." };
  }
  const actual = {
    reach: (counts.reach + counts.unlikely) / denom,
    target: counts.target / denom,
    likely: counts.likely / denom,
    safety: counts.safety / denom,
  };
  const tadFraction =
    Math.abs(actual.reach - IDEAL_DISTRIBUTION.reach) +
    Math.abs(actual.target - IDEAL_DISTRIBUTION.target) +
    Math.abs(actual.likely - IDEAL_DISTRIBUTION.likely) +
    Math.abs(actual.safety - IDEAL_DISTRIBUTION.safety);
  // tadFraction ∈ [0, 2]; map linearly to score [40, 0].
  const score = Math.max(0, Math.round((40 - tadFraction * 20) * 10) / 10);

  // Build note: name the largest deviation so the user knows what to fix.
  type TierKey = "reach" | "target" | "likely" | "safety";
  const deviations: { key: TierKey; label: string; delta: number }[] = [
    { key: "reach",  label: "reach (incl. unlikely)", delta: actual.reach  - IDEAL_DISTRIBUTION.reach  },
    { key: "target", label: "target", delta: actual.target - IDEAL_DISTRIBUTION.target },
    { key: "likely", label: "likely", delta: actual.likely - IDEAL_DISTRIBUTION.likely },
    { key: "safety", label: "safety", delta: actual.safety - IDEAL_DISTRIBUTION.safety },
  ];
  deviations.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const worst = deviations[0];
  const direction = worst.delta > 0.02 ? "heavy" : worst.delta < -0.02 ? "light" : "on target";
  const note = direction === "on target"
    ? "Tier mix matches the ideal distribution closely."
    : `${worst.label.charAt(0).toUpperCase() + worst.label.slice(1)} ${direction} (${Math.round(actual[worst.key] * 100)}% vs ${Math.round(IDEAL_DISTRIBUTION[worst.key] * 100)}% ideal).`;

  return { score, note };
}

/**
 * Total count: 25 pts. 8–12 = full marks. 6–7 or 13–14 = partial. <6 or >14 = worse.
 */
function scoreCount(total: number): { score: number; note: string } {
  let score: number;
  let note: string;
  if (total >= 8 && total <= 12) {
    score = 25;
    note = `${total} schools pinned — right in the 8–12 sweet spot.`;
  } else if (total >= 6 && total <= 7) {
    score = 18;
    note = `${total} schools pinned — add 1–2 more to reach the 8–12 sweet spot.`;
  } else if (total >= 13 && total <= 14) {
    score = 18;
    note = `${total} schools pinned — slightly over; consider trimming to 12.`;
  } else if (total >= 4 && total <= 5) {
    score = 8;
    note = `Only ${total} schools pinned — list is thin; aim for 8–12.`;
  } else if (total >= 15 && total <= 16) {
    score = 8;
    note = `${total} schools pinned — too many to manage well; trim to 12.`;
  } else if (total === 0) {
    score = 0;
    note = "No schools pinned.";
  } else if (total < 4) {
    score = 4;
    note = `Only ${total} schools pinned — far below the 8–12 sweet spot.`;
  } else {
    score = 0;
    note = `${total} schools pinned — far above sustainable; trim to 12.`;
  }
  return { score, note };
}

/**
 * ED leverage: 20 pts. Counts schools where ED chance > RD chance by at least
 * ED_LEVERAGE_THRESHOLD_PP. ≥2 = 20, 1 = 10, 0 = 0. Schools that don't offer
 * ED (or are sub-10% admit anyway and capped at "reach") still count if the
 * model produces a meaningful delta.
 */
function scoreEdLeverage(resolved: readonly ResolvedPin[]): {
  score: number;
  note: string;
  candidates: readonly ResolvedPin[];
} {
  const candidates = resolved.filter(
    (r) => r.edChance != null && r.edChance - r.rdChance >= ED_LEVERAGE_THRESHOLD_PP,
  );
  const n = candidates.length;
  let score: number;
  let note: string;
  if (n >= 2) {
    score = 20;
    const names = candidates.slice(0, 2).map((c) => c.college.name).join(", ");
    note = `${n} ED-leverage candidates (${names}${n > 2 ? "…" : ""}) — strong early-round options.`;
  } else if (n === 1) {
    score = 10;
    note = `1 ED-leverage candidate (${candidates[0].college.name}). A second would cover early-round risk better.`;
  } else {
    score = 0;
    note = "No ED-leverage candidates on the list. Consider adding a binding-ED school where ED gives a meaningful boost.";
  }
  return { score, note, candidates };
}

/**
 * Financial fit: 10 pts. 5 for public/private mix, 5 for ≥1 strong-financial-aid
 * school (need-met).
 */
function scoreFinancialFit(resolved: readonly ResolvedPin[]): { score: number; note: string } {
  if (resolved.length === 0) return { score: 0, note: "No schools to assess." };
  const hasPublic = resolved.some((r) => r.college.type === "public");
  const hasPrivate = resolved.some((r) => r.college.type === "private");
  const aidCount = resolved.filter((r) => r.college.strongFinancialAid === true).length;

  let score = 0;
  const parts: string[] = [];
  if (hasPublic && hasPrivate) {
    score += 5;
    parts.push("public/private mix");
  } else {
    parts.push(hasPublic ? "all public" : "all private");
  }
  if (aidCount >= 1) {
    score += 5;
    parts.push(`${aidCount} aid-generous school${aidCount > 1 ? "s" : ""}`);
  } else {
    parts.push("no aid-generous schools flagged");
  }
  return { score, note: parts.join(", ") + "." };
}

/**
 * Geographic diversity: 5 pts. 1 region = 0, 2 = 2, 3 = 4, 4+ = 5.
 */
function scoreGeoDiversity(resolved: readonly ResolvedPin[]): { score: number; note: string } {
  if (resolved.length === 0) return { score: 0, note: "No schools to assess." };
  const regions = new Set(resolved.map((r) => r.college.region));
  const n = regions.size;
  let score: number;
  if (n >= 4) score = 5;
  else if (n === 3) score = 4;
  else if (n === 2) score = 2;
  else score = 0;
  const note = n === 1
    ? `All schools in ${[...regions][0]} — broaden geography for diversification.`
    : `${n} regions covered: ${[...regions].join(", ")}.`;
  return { score, note };
}

// ── majorScore sub-factors ──────────────────────────────────────────────────

/**
 * 70% of majorScore: average computeMajorFit().score across the list. When
 * no major or interest is declared, returns 50 (neutral) so users without
 * a declared major aren't punished.
 */
function scoreAvgMajorFit(
  resolved: readonly ResolvedPin[],
  profile: ListGraderProfile,
): { score: number; note: string } {
  if (resolved.length === 0) return { score: 0, note: "No schools to assess." };
  const major = profile.intendedMajor.trim();
  const interest = profile.intendedInterest.trim();
  if (!major && !interest) {
    return {
      score: 50,
      note: "No declared major — major fit defaults to neutral (50).",
    };
  }
  const fits = resolved.map((r) =>
    computeMajorFit(r.college, { major: major || null, interest: interest || null }).score,
  );
  const avg = fits.reduce((a, b) => a + b, 0) / fits.length;
  const score = Math.round(avg * 10) / 10;
  return {
    score,
    note: `Average major-fit score: ${score.toFixed(1)} across ${resolved.length} schools (declared: ${major || "—"}${interest ? `, interest: ${interest}` : ""}).`,
  };
}

/**
 * 30% of majorScore: count of program-strong schools (computeMajorFit
 * returns "strong"). 0 → 0, 1 → 50, 2 → 75, 3+ → 100. Scales with count.
 */
function scoreProgramStrong(
  resolved: readonly ResolvedPin[],
  profile: ListGraderProfile,
): { score: number; note: string } {
  if (resolved.length === 0) return { score: 0, note: "No schools to assess." };
  const major = profile.intendedMajor.trim();
  const interest = profile.intendedInterest.trim();
  if (!major && !interest) {
    return { score: 50, note: "No declared major — neutral score." };
  }
  const strong = resolved.filter(
    (r) =>
      computeMajorFit(r.college, { major: major || null, interest: interest || null }).match ===
      "strong",
  );
  const n = strong.length;
  let score: number;
  if (n >= 3) score = 100;
  else if (n === 2) score = 75;
  else if (n === 1) score = 50;
  else score = 0;
  const note = n === 0
    ? `No program-strong schools for ${major || interest}. Add 1–2 known-strong programs.`
    : `${n} program-strong school${n > 1 ? "s" : ""} (${strong.slice(0, 3).map((s) => s.college.name).join(", ")}${n > 3 ? "…" : ""}).`;
  return { score, note };
}

// ── Letter grade scale (per spec, no overlaps) ─────────────────────────────

function scoreToLetter(score: number): Letter {
  if (score >= 95)   return "A+";
  if (score >= 89.5) return "A";
  if (score >= 86.5) return "A-";
  if (score >= 83)   return "B+";
  if (score >= 79.5) return "B";
  if (score >= 76)   return "B-";
  if (score >= 73)   return "C+";
  if (score >= 70)   return "C";
  if (score >= 67)   return "C-";
  if (score >= 60)   return "D";
  return "F";
}

// ── Public entry point ─────────────────────────────────────────────────────

export function gradeList(
  pinned: readonly PinnedCollege[],
  profile: ListGraderProfile,
  caches: GraderCaches = emptyCaches(),
): GradeResult {
  const resolved = resolvePins(pinned, profile, caches);
  const tierCounts = countTiers(resolved);

  // balanceScore (sum to 100)
  const tier = scoreTierDistribution(tierCounts);
  const count = scoreCount(tierCounts.total);
  const ed = scoreEdLeverage(resolved);
  const fin = scoreFinancialFit(resolved);
  const geo = scoreGeoDiversity(resolved);
  const balanceScore =
    Math.round((tier.score + count.score + ed.score + fin.score + geo.score) * 10) / 10;

  // majorScore (0-100, weighted)
  const avg = scoreAvgMajorFit(resolved, profile);
  const programStrong = scoreProgramStrong(resolved, profile);
  const majorScore = Math.round((avg.score * 0.7 + programStrong.score * 0.3) * 10) / 10;

  const officialScore = Math.round(((balanceScore + majorScore) / 2) * 10) / 10;
  const letter = scoreToLetter(officialScore);

  // Why-this-grade reason bullets — 3-5 of the most informative notes.
  const reasons: string[] = [];
  reasons.push(count.note);
  reasons.push(tier.note);
  if (ed.score < 20) reasons.push(ed.note);
  if (geo.score < 4) reasons.push(geo.note);
  if (avg.score < 50) reasons.push(`Major fit thin: ${avg.note}`);
  else if (programStrong.score >= 75) reasons.push(programStrong.note);
  if (fin.score < 5) reasons.push(`Financial mix: ${fin.note}`);

  const balanceBreakdown: BalanceBreakdown = {
    tierDistribution: tier,
    count,
    edLeverage: { score: ed.score, note: ed.note },
    financialFit: fin,
    geoDiversity: geo,
  };
  const majorBreakdown: MajorBreakdown = {
    avgFit: avg,
    programStrong,
  };

  return {
    officialScore,
    balanceScore,
    majorScore,
    letter,
    reasons,
    balanceBreakdown,
    majorBreakdown,
    tierCounts,
  };
}
