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
  readonly vspice: number | null;            // vspiceComposite (0-4)
  readonly latest: GradingResult | null;    // most recent full grade from history
}

export interface StrategyPinnedSchool {
  readonly pin: PinnedCollege;
  readonly classified: ClassifiedCollege;   // live classification against profile
}

export interface StrategyProfile {
  readonly gpa: StrategyGpa;
  readonly tests: StrategyTests;
  readonly ec: ProfileEvaluation | null;
  readonly essay: StrategyEssay | null;
  readonly pinnedSchools: readonly StrategyPinnedSchool[];
  readonly intendedMajor: string;            // from admitedge-profile if present, else ""
  readonly basicInfo: { name: string; graduationYear: string } | null;
  // Flags for the empty-state / missing-data UI
  readonly hasGpa: boolean;
  readonly hasTests: boolean;
  readonly hasEc: boolean;
  readonly hasEssay: boolean;
  readonly hasPinnedSchools: boolean;
}

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
  };
  readonly averageAcceptanceRate: number;   // across pinned
  readonly averageFitScore: number;
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

export interface StrategyAnalysis {
  readonly academic: AcademicStrength;
  readonly ec: ECStrength;
  readonly spike: SpikeAnalysis;
  readonly weaknesses: readonly WeaknessFlag[];
  readonly schoolList: SchoolListDistribution;
  readonly earlyStrategy: readonly EarlyRecommendation[];
  readonly positioning: CompetitivenessPositioning;
  readonly missingData: readonly string[];  // human-readable missing sources
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
  readonly generatedAt: number;
}

export const STRATEGY_CACHE_KEY = "admitedge-strategy-cache";
export const STRATEGY_CACHE_VERSION = "v1";
