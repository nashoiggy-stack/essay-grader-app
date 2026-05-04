// ── Strategy Engine Types ───────────────────────────────────────────────────
//
// Shared types for the Strategy Engine — the holistic admissions-consultant
// layer that reads user data from every other tool and produces high-level
// strategy output.
//
// Pipeline shape:
//   StrategyProfile  (readStrategyProfile)   →
//   StrategyAnalysis (analyzers in strategy-engine.ts) →
//   StrategyResult   (LLM narrative layer via /api/strategy)
//
// The profile and analysis layers are deterministic TS. Only the narrative
// layer calls the LLM.

import type { ClassifiedCollege, ApplicationPlan, PinnedCollege } from "./college-types";
import type { ProfileEvaluation } from "./extracurricular-types";
import type { GradingResult } from "./types";
import type {
  AdvancedCourseworkRow,
  EssayScoreRecord,
  APScoreProfile,
} from "./profile-types";

// ── Profile (assembled from every localStorage source) ─────────────────────

export interface StrategyGpa {
  readonly uw: number | null;
  readonly w: number | null;
  readonly rigor: "low" | "medium" | "high";
}

export interface StrategyTests {
  readonly sat: number | null;       // composite, R/W + Math
  readonly act: number | null;       // composite (avg of 4 sections)
  readonly apCount: number;           // total APs reported
  readonly apStrongCount: number;     // APs with score >= 4
}

export interface StrategyEssay {
  readonly summaryScore: number | null;    // rawScore from profile (0-100)
  readonly vspice: number | null;            // vspiceComposite (0-24)
  readonly latest: GradingResult | null;    // most recent full grade from history
}

export interface StrategyPinnedSchool {
  readonly pin: PinnedCollege;
  readonly classified: ClassifiedCollege;   // live classification against profile
}

// Extra inputs the chance model needs but aren't surfaced anywhere else
// on StrategyProfile. Without these, strategy-engine's per-school chance
// numbers diverge from /chances (the live calculator) — most visibly the
// essay multiplier and rigor uplift never fire, suppressing both RD and
// ED estimates. The strategy profile reader populates this so
// buildPinnedSchools (RD baseline) and analyzeEarlyStrategy (ED leverage
// recalc) can share the same input set.
export interface StrategyChanceExtras {
  readonly ecBand: string | undefined;
  readonly distinguishedEC: boolean;
  readonly apScores: readonly APScoreProfile[] | undefined;
  readonly advancedCoursework: readonly AdvancedCourseworkRow[] | undefined;
  readonly advancedCourseworkAvailable: "all" | "limited" | "none" | undefined;
  readonly essayScores: readonly EssayScoreRecord[] | undefined;
}

export interface StrategyProfile {
  readonly gpa: StrategyGpa;
  readonly tests: StrategyTests;
  readonly ec: ProfileEvaluation | null;
  readonly essay: StrategyEssay | null;
  readonly pinnedSchools: readonly StrategyPinnedSchool[];
  readonly dreamSchool: string | null;       // admitedge-dream-school localStorage
  readonly intendedMajor: string;            // from admitedge-profile if present, else ""
  readonly intendedInterest: string;         // free-text niche, "" if unset
  readonly basicInfo: { name: string; graduationYear: string } | null;
  readonly chanceExtras: StrategyChanceExtras;
  // Flags for the empty-state / missing-data UI
  readonly hasGpa: boolean;
  readonly hasTests: boolean;
  readonly hasEc: boolean;
  readonly hasEssay: boolean;
  readonly hasPinnedSchools: boolean;
  readonly hasDreamSchool: boolean;
}

// Storage key for the user's dream school selection (just the college name).
export const DREAM_SCHOOL_KEY = "admitedge-dream-school";

// Storage key for the persistent action-plan checkbox state, keyed by the
// strategy result's generatedAt timestamp so re-runs reset the checklist.
export const ACTION_CHECKLIST_KEY = "admitedge-strategy-action-checklist";

// ── Analysis output (deterministic, no prose) ───────────────────────────────

export type AcademicTier = "elite" | "strong" | "solid" | "developing" | "limited";

export interface AcademicStrength {
  readonly tier: AcademicTier;
  readonly score: number;           // 0-100 composite
  readonly gpaFit: "above" | "within" | "below" | "unknown";
  readonly testFit: "above" | "within" | "below" | "unknown" | "missing";
  readonly rigorFit: "high" | "medium" | "low";
  readonly signals: readonly string[];  // short structured bullets
}

export type ECStrengthTier = "exceptional" | "strong" | "solid" | "developing" | "limited" | "missing";

export interface ECStrength {
  readonly tier: ECStrengthTier;
  readonly score: number;           // 0-100 (maps to readinessScore when EC exists)
  readonly tier1Count: number;       // Tier-1 activities
  readonly tier2Count: number;
  readonly leadershipRate: number;   // 0-1, fraction with leadership >= 3
  readonly impactRate: number;       // 0-1, fraction with impact >= 3
  readonly commitmentRate: number;
  readonly signals: readonly string[];
}

export interface SpikeAnalysis {
  readonly primary: string | null;       // e.g. "STEM Research", "Finance", null if scattered
  readonly strength: "dominant" | "strong" | "moderate" | "emerging" | "none";
  readonly clarity: "focused" | "developing" | "scattered";
  readonly supportingActivities: readonly string[];   // activity names backing the spike
  readonly signals: readonly string[];
}

export type WeaknessSeverity = "critical" | "high" | "medium" | "low";

export interface WeaknessFlag {
  readonly code: string;              // e.g. "no-tier-1", "low-impact", "missing-ec-data"
  readonly severity: WeaknessSeverity;
  readonly label: string;              // short, display-ready
  readonly detail: string;             // specific reference to user data where possible
}

export interface SchoolListDistribution {
  readonly total: number;
  readonly counts: {
    readonly safety: number;
    readonly likely: number;
    readonly target: number;
    readonly reach: number;
    readonly unlikely: number;
    readonly insufficient: number;
  };
  readonly averageAcceptanceRate: number;   // across pinned
  // Average chance midpoint across the pinned list (0-100). Replaces the old
  // averageFitScore. Computed from ClassifiedCollege.chance.mid.
  readonly averageChance: number;
  readonly warnings: readonly string[];     // "too reach-heavy", "no safeties", etc.
  readonly balance: "balanced" | "reach-heavy" | "safety-heavy" | "thin" | "empty";
}

export interface EarlyRecommendation {
  readonly collegeName: string;
  readonly suggestedPlan: ApplicationPlan;
  readonly alternatives: readonly ApplicationPlan[];
  readonly reasoning: string;               // structured, 1-2 sentences
  readonly confidence: "high" | "medium" | "low";
}

export interface CompetitivenessPositioning {
  readonly overallTier: AcademicTier;
  readonly versusPinnedAverage: "above" | "at" | "below";
  readonly percentileEstimate: "top-10" | "top-25" | "top-50" | "bottom-50";
  readonly gaps: readonly string[];         // structured gap descriptions
}

// Phase 10: structured missing-data items so the banner can rank by impact
// and link to the right surface. The legacy `missingData` string array is
// kept for back-compat with any consumer that still reads it.
export interface MissingDataItem {
  readonly key: "gpa" | "tests" | "ec" | "essay" | "pinnedSchools";
  readonly label: string;
  readonly impact: "high" | "medium" | "low";
  readonly unlockDescription: string;
  readonly ctaHref: string;
}

// Deterministic dream-school verdict. Computed by the engine, not the
// LLM — the verdict drives a binding application decision, so it must be
// auditable and stable across regenerations on identical inputs. The LLM
// downstream only narrates these fields; it cannot override the action
// or invent levers.
//
// Why action+tone instead of "ED: yes/no/conditional":
//   "ED: NO" was misread as "do not apply early" when the actual
//   recommendation was often REA or EA. The action describes the
//   recommended path; the tone drives the badge color.
export type DreamSchoolAction =
  | "apply-ed"                  // binding ED is the move
  | "apply-rea"                 // restrictive early action (Stanford, Harvard, Yale, Princeton, Notre Dame, Georgetown)
  | "apply-ea"                  // non-restrictive early action — no downside
  | "apply-early-conditional"   // close fit but fixable gaps; lever needed
  | "apply-rd";                 // regular decision is the right call

export type UrgencyTone = "go" | "caution" | "stop";

export interface DreamSchoolLever {
  readonly description: string;          // user-facing prose
  readonly impact: "high" | "medium";
}

export interface DreamSchoolVerdict {
  readonly schoolName: string;
  readonly recommendedAction: DreamSchoolAction;
  readonly actionLabel: string;                       // short prose label for the UI (deterministic)
  readonly urgencyTone: UrgencyTone;                  // drives badge color: go=green, caution=amber, stop=red
  readonly verdictReasonCodes: readonly string[];      // stable codes — for the prompt, not for users
  readonly leversToImprove: readonly DreamSchoolLever[];
}

export interface StrategyAnalysis {
  readonly academic: AcademicStrength;
  readonly ec: ECStrength;
  readonly spike: SpikeAnalysis;
  readonly weaknesses: readonly WeaknessFlag[];
  readonly schoolList: SchoolListDistribution;
  readonly earlyStrategy: readonly EarlyRecommendation[];
  readonly positioning: CompetitivenessPositioning;
  readonly majorRecommendations: MajorAwareRecommendations;
  readonly missingData: readonly string[];  // human-readable missing sources
  // Phase 10: ranked structured version of missingData. Same coverage; the
  // banner UI consumes this. Sorted high → medium → low.
  readonly missingDataRanked: readonly MissingDataItem[];
  // Null when profile.dreamSchool is null/empty. When present, this is the
  // ground truth the LLM must narrate without overriding.
  readonly dreamSchool: DreamSchoolVerdict | null;
}

// Major-aware recommendation set. Populated by recommendCollegesByMajor.
// When the user hasn't set a major/interest, `intendedMajor` and
// `intendedInterest` are null and the lists are empty (the UI shows a
// friendly prompt to set one).
export interface MajorAwareRecommendations {
  readonly intendedMajor: string | null;
  readonly intendedInterest: string | null;
  // Pulled from the user's pinned list, ranked by major fit. Each tier is
  // capped at 2 so the section stays scannable.
  readonly fromPinned: {
    readonly safeties: readonly ClassifiedCollege[];
    readonly targets: readonly ClassifiedCollege[];
    readonly reaches: readonly ClassifiedCollege[];
  };
  // Colleges the user has NOT pinned that are worth considering — up to 3,
  // spread across classification tiers when possible and filtered to
  // at-least-decent major fit.
  readonly toConsider: readonly ClassifiedCollege[];
  // Phase 11: every pinned school, classified + scored, sorted by major fit
  // when a query is set (else by overall fit). Powers the "See all pins
  // ranked" transparency disclosure on the strategy page.
  readonly rankedPinned: readonly ClassifiedCollege[];
}

// ── Final result (LLM narrative — 7 sections) ──────────────────────────────

export interface StrategyResultSection {
  readonly title: string;
  readonly body: string;                    // markdown-free prose, consultant voice
  readonly bullets?: readonly string[];      // optional structured items
}

export interface StrategyResult {
  readonly profileSummary: StrategyResultSection;
  readonly spikeAnalysis: StrategyResultSection;
  readonly weaknessDiagnosis: StrategyResultSection;
  readonly schoolListStrategy: StrategyResultSection;
  readonly applicationStrategy: StrategyResultSection;
  readonly actionPlan: StrategyResultSection;     // bullets are required here
  readonly competitiveness: StrategyResultSection;
  // Optional: present only if a dream school is set in localStorage.
  // Carries the engine's recommended action + LLM-written reasoning for
  // that school.
  readonly dreamSchool?: DreamSchoolSection;
  readonly generatedAt: number;
}

// LLM-output shape for the dream-school section. The structured fields
// (recommendedAction, actionLabel, urgencyTone) are copied verbatim from
// the engine's DreamSchoolVerdict so the LLM cannot drift the verdict.
// Only `reasoning` is LLM-written prose. The levers list is NOT on this
// shape — it lives on analysis.dreamSchool.leversToImprove (engine
// output) as the single source of truth, and the UI reads it from there.
export interface DreamSchoolSection {
  readonly title: string;
  readonly schoolName: string;
  readonly recommendedAction: DreamSchoolAction;
  readonly actionLabel: string;                       // copied verbatim from verdict
  readonly urgencyTone: UrgencyTone;                  // copied verbatim from verdict
  readonly reasoning: string;                          // LLM-written, 3-5 sentences
}

export const STRATEGY_CACHE_KEY = "admitedge-strategy-cache";
// v8: strategy engine now feeds classifyCollege the same input set the live
// /chances calculator uses (essayScores, advancedCoursework,
// advancedCourseworkAvailable). v7 caches under-reported chances because
// the essay multiplier and rigor uplift never fired through the strategy
// path, which also broke ED-leverage selection for the dream school.
// v7: Academic Index (AI) replaces the school-relative percentile classifier.
// AI = (weightedGPA/5×80)×1.5 + ((bestTest-400)/1200×80)×1.5, mapped to
// stat bands via Arcidiacono Harvard 2019 decile cutoffs. Tier 2 multipliers
// rebalanced (above-median 1.0→1.2, below-p25 0.4→0.5). v6 caches reference
// chance values produced by the prior school-relative classifier.
// v6: final calibration — two-tier routing (algorithmic vs holistic-elite),
// essay multiplier reintroduced (graded-only), advancedCoursework[] replaces
// rigor dropdown.
// v5: Feature 1 chance-model rewrite — fitScore removed.
// v4: DreamSchoolSection no longer carries whatWouldChangeThis. v3 lacked
// action/tone fields. Both old shapes are invalidated by this bump.
export const STRATEGY_CACHE_VERSION = "v8";
