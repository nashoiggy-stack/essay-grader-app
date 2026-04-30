/**
 * list-recommender.ts
 *
 * Pure recommender for the user's pinned college list. Returns 0–3
 * suggestions (add or swap) that, when applied, would improve the grade
 * computed by list-grader.ts.
 *
 * Rules (per spec):
 *   - List < 8: always recommend, fill toward 8–12. Show 2–3 picks.
 *   - List 8–12: only recommend a SWAP if a clearly stronger candidate
 *     exists. Priority: (a) at max 12 with stronger candidate, (b) replacing
 *     a weak-fit school improves both grades, (c) swap rebalances tiers.
 *     If genuinely solid, return [] — don't force recommendations.
 *   - List = 12: swap-only mode (no pure adds).
 *
 * Source: full COLLEGES dataset. Each rec includes a one-line rationale and
 * (for swaps) the existing school being replaced.
 */

import type { College, PinnedCollege } from "./college-types";
import { COLLEGES } from "@/data/colleges";
import {
  gradeList,
  createGraderCaches,
  type GraderCaches,
  type ListGraderProfile,
  type GradeResult,
} from "./list-grader";

// ── Public API ──────────────────────────────────────────────────────────────

export type RecommendationKind = "add" | "swap";

export interface RecommendationResult {
  readonly kind: RecommendationKind;
  readonly college: College;
  /** For swaps: the name of the existing pinned school being replaced. */
  readonly replaces?: string;
  readonly rationale: string;
  /** Numeric grade delta (officialScore_after − officialScore_before). */
  readonly gradeDelta: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

const SWEET_SPOT_MIN = 8;
const SWEET_SPOT_MAX = 12;
const MIN_DELTA_FOR_ADD = 0.5;     // require ≥0.5 points of improvement to add
const MIN_DELTA_FOR_SWAP = 1.0;    // swaps need a more decisive win
const MAX_RECOMMENDATIONS = 3;

// ── Helpers ─────────────────────────────────────────────────────────────────

function pinFromCollege(college: College): PinnedCollege {
  return { name: college.name, pinnedAt: Date.now() };
}

function withAdded(
  pinned: readonly PinnedCollege[],
  college: College,
): readonly PinnedCollege[] {
  return [...pinned, pinFromCollege(college)];
}

function withSwapped(
  pinned: readonly PinnedCollege[],
  removeName: string,
  added: College,
): readonly PinnedCollege[] {
  return pinned.filter((p) => p.name !== removeName).concat(pinFromCollege(added));
}

// Cheap pre-filter: candidates the user could plausibly want to consider.
// Keeps the simulation count bounded so the grader doesn't run 1000+ times.
function candidatePool(
  pinned: readonly PinnedCollege[],
  profile: ListGraderProfile,
): readonly College[] {
  const pinnedNames = new Set(pinned.map((p) => p.name));
  const major = profile.intendedMajor.trim().toLowerCase();
  const interest = profile.intendedInterest.trim().toLowerCase();

  // Tier 1 sieve: drop pinned + drop schools with no usable admit data.
  const remaining = COLLEGES.filter((c) => !pinnedNames.has(c.name));

  // Tier 2 sort: prefer schools that intersect major/interest; ranked schools
  // float. Score is a coarse priority — the real grade-delta check below
  // does the work.
  const scored = remaining.map((c) => {
    let score = 0;
    if (major) {
      if (c.topMajors.some((m) => m.toLowerCase().includes(major))) score += 50;
      if (c.competitiveMajors.some((m) => m.toLowerCase().includes(major))) score += 20;
    }
    if (interest) {
      if (c.knownFor?.some((k) => k.toLowerCase().includes(interest))) score += 30;
      if (c.tags.some((t) => t.toLowerCase().includes(interest))) score += 10;
    }
    if (typeof c.usNewsRank === "number" && c.usNewsRank <= 50) score += 25;
    if (c.strongFinancialAid) score += 5;
    return { college: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  // Cap at 40 candidates to keep simulation under ~500 grader calls in the
  // worst case (40 × 12 swap targets = 480). Grader is cheap, but a hard cap
  // protects render performance on slower devices.
  return scored.slice(0, 40).map((s) => s.college);
}

// Deterministic dedupe: same (kind, name, replaces) appears once.
function recKey(r: RecommendationResult): string {
  return `${r.kind}|${r.college.name}|${r.replaces ?? ""}`;
}

// ── Add-mode (list < 8) ─────────────────────────────────────────────────────

function findBestAdds(
  pinned: readonly PinnedCollege[],
  profile: ListGraderProfile,
  before: GradeResult,
  caches: GraderCaches,
): readonly RecommendationResult[] {
  const candidates = candidatePool(pinned, profile);
  const scored: { college: College; after: GradeResult; delta: number }[] = [];
  for (const c of candidates) {
    const after = gradeList(withAdded(pinned, c), profile, caches);
    const delta = after.officialScore - before.officialScore;
    if (delta >= MIN_DELTA_FOR_ADD) {
      scored.push({ college: c, after, delta });
    }
  }
  scored.sort((a, b) => b.delta - a.delta);

  const out: RecommendationResult[] = [];
  for (const s of scored.slice(0, MAX_RECOMMENDATIONS)) {
    out.push({
      kind: "add",
      college: s.college,
      rationale: addRationale(s.college, before, s.after, profile),
      gradeDelta: Math.round(s.delta * 10) / 10,
    });
  }
  return out;
}

// ── Swap-mode (list 8-12, only when a clear improvement exists) ─────────────

function findBestSwaps(
  pinned: readonly PinnedCollege[],
  profile: ListGraderProfile,
  before: GradeResult,
  caches: GraderCaches,
): readonly RecommendationResult[] {
  const candidates = candidatePool(pinned, profile);
  const scored: { add: College; remove: string; after: GradeResult; delta: number }[] = [];

  // Only consider replacing schools that are themselves below-average within
  // the user's list — keeps the search space manageable and the rationale
  // honest. Below-average = officialScore-before delta if removed alone is
  // small (i.e., that school isn't carrying much of the grade).
  for (const pin of pinned) {
    for (const add of candidates) {
      if (add.name === pin.name) continue;
      const after = gradeList(withSwapped(pinned, pin.name, add), profile, caches);
      const delta = after.officialScore - before.officialScore;
      if (delta >= MIN_DELTA_FOR_SWAP) {
        scored.push({ add, remove: pin.name, after, delta });
      }
    }
  }

  scored.sort((a, b) => b.delta - a.delta);

  // Dedupe: prefer a single suggestion per added candidate (the best-delta
  // swap target wins).
  const seen = new Set<string>();
  const deduped: typeof scored = [];
  for (const s of scored) {
    if (seen.has(s.add.name)) continue;
    seen.add(s.add.name);
    deduped.push(s);
    if (deduped.length >= MAX_RECOMMENDATIONS) break;
  }

  return deduped.map((s) => ({
    kind: "swap" as const,
    college: s.add,
    replaces: s.remove,
    rationale: swapRationale(s.add, s.remove, before, s.after),
    gradeDelta: Math.round(s.delta * 10) / 10,
  }));
}

// ── Rationale builders ──────────────────────────────────────────────────────

function addRationale(
  college: College,
  before: GradeResult,
  after: GradeResult,
  profile: ListGraderProfile,
): string {
  // Identify which sub-factor improved most.
  const balanceDelta = after.balanceScore - before.balanceScore;
  const majorDelta = after.majorScore - before.majorScore;
  const tierMix =
    after.balanceBreakdown.tierDistribution.score - before.balanceBreakdown.tierDistribution.score;
  const ed = after.balanceBreakdown.edLeverage.score - before.balanceBreakdown.edLeverage.score;

  const major = profile.intendedMajor.trim();
  const partsList: string[] = [];
  if (major && college.topMajors.some((m) => m.toLowerCase().includes(major.toLowerCase()))) {
    partsList.push(`strong ${major} program`);
  }
  if (tierMix >= 2) partsList.push("rebalances your tier mix");
  if (ed >= 5) partsList.push("adds an ED-leverage candidate");
  if (majorDelta >= 5) partsList.push("lifts major fit");
  if (balanceDelta >= 5 && partsList.length === 0) partsList.push("strengthens overall balance");
  if (typeof college.usNewsRank === "number" && college.usNewsRank <= 25) {
    partsList.push("top-25 ranked");
  }
  const reason = partsList.slice(0, 2).join(", ") || "rounds out the list";
  return `${college.name} — ${reason}.`;
}

function swapRationale(
  add: College,
  removeName: string,
  before: GradeResult,
  after: GradeResult,
): string {
  const tierImproves =
    after.balanceBreakdown.tierDistribution.score >
    before.balanceBreakdown.tierDistribution.score;
  const majorImproves = after.majorScore > before.majorScore + 1;
  const edImproves =
    after.balanceBreakdown.edLeverage.score > before.balanceBreakdown.edLeverage.score;

  const reasons: string[] = [];
  if (majorImproves) reasons.push("better major fit");
  if (tierImproves) reasons.push("better tier balance");
  if (edImproves) reasons.push("adds ED leverage");
  if (reasons.length === 0) reasons.push("higher overall list grade");
  return `Swap ${removeName} → ${add.name} — ${reasons.slice(0, 2).join(" and ")}.`;
}

// ── Public entry point ─────────────────────────────────────────────────────

export function recommendForList(
  pinned: readonly PinnedCollege[],
  // allColleges param is part of the spec'd signature for future-proofing,
  // but we currently use the bundled COLLEGES dataset for the candidate pool.
  // Accepting it keeps the boundary stable when we move to a server-fed list.
  allColleges: readonly College[],
  profile: ListGraderProfile,
): readonly RecommendationResult[] {
  void allColleges; // reserved for future server-fed candidate pools

  // One cache for the entire run. Every simulation re-classifies the same
  // pinned schools under the same plans; with the cache, classifyCollege
  // is called once per (collegeName, applicationPlan) instead of hundreds
  // of times. Pure perf — output is bit-identical to the cache-free path.
  const caches = createGraderCaches();

  const before = gradeList(pinned, profile, caches);
  const total = pinned.length;

  if (total < SWEET_SPOT_MIN) {
    // Always recommend at least one add toward the 8-12 sweet spot.
    return findBestAdds(pinned, profile, before, caches);
  }

  if (total >= SWEET_SPOT_MIN && total < SWEET_SPOT_MAX) {
    // Only suggest a swap if it's a clear improvement; skip pure adds when
    // the list is already in the sweet spot — adding past 12 is its own
    // problem.
    return findBestSwaps(pinned, profile, before, caches);
  }

  // total >= SWEET_SPOT_MAX: swap-only mode. Adding pushes past the cap.
  return findBestSwaps(pinned, profile, before, caches);
}
