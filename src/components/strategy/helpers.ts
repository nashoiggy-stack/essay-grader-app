// Shared helpers and label maps used across the /strategy section cards.
// Extracted from src/app/strategy/page.tsx during the file-split refactor;
// keeping them in one place avoids each card file re-deriving the same
// strength heuristics or label tables.

import type { StrategyStrength } from "@/components/StrategyCard";
import type {
  AcademicTier,
  ECStrengthTier,
  MajorAwareRecommendations,
  StrategyAnalysis,
  UrgencyTone,
} from "@/lib/strategy-types";
import type { Classification } from "@/lib/college-types";

export function snapshotStrength(a: StrategyAnalysis): StrategyStrength {
  const ac = a.academic.tier;
  const ec = a.ec.tier;
  if ((ac === "elite" || ac === "strong") && (ec === "exceptional" || ec === "strong")) return "strong";
  if (ac === "limited" || ec === "limited") return "weak";
  if (ac === "developing" || ec === "developing" || ec === "missing") return "mixed";
  return "mixed";
}

export function spikeStrength(a: StrategyAnalysis): StrategyStrength {
  const s = a.spike;
  if (s.strength === "dominant" && s.clarity === "focused") return "strong";
  if (s.strength === "strong" && s.clarity === "focused") return "strong";
  if (s.strength === "none" || s.clarity === "scattered") return "weak";
  return "mixed";
}

export function gapsStrength(a: StrategyAnalysis): StrategyStrength {
  if (a.weaknesses.some((w) => w.severity === "critical")) return "weak";
  if (a.weaknesses.some((w) => w.severity === "high")) return "warning";
  if (a.weaknesses.length === 0) return "strong";
  return "mixed";
}

export function schoolListStrength(a: StrategyAnalysis): StrategyStrength {
  switch (a.schoolList.balance) {
    case "balanced":
      return "strong";
    case "reach-heavy":
    case "safety-heavy":
      return "warning";
    case "thin":
    case "empty":
      return "weak";
    default:
      return "neutral";
  }
}

// Maps the engine's urgencyTone to the StrategyCard strength scale that
// already powers every other card's badge color. Keeps badge tone in
// sync with the verdict — go=green, caution=amber, stop=red.
export function urgencyToneStrength(t: UrgencyTone | null): StrategyStrength {
  if (t === "go") return "strong";
  if (t === "caution") return "mixed";
  if (t === "stop") return "weak";
  return "neutral";
}

export const TIER_LABEL: Record<AcademicTier, string> = {
  elite: "Elite",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
};

export const EC_LABEL: Record<ECStrengthTier, string> = {
  exceptional: "Exceptional",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
  missing: "No data",
};

export const PERCENTILE_LABEL: Record<string, string> = {
  "top-10": "Top 10%",
  "top-25": "Top 25%",
  "top-50": "Top 50%",
  "bottom-50": "Bottom 50%",
};

export function majorRecsStrength(r: MajorAwareRecommendations): StrategyStrength {
  if (!r.intendedMajor && !r.intendedInterest) return "neutral";
  const pinnedCount =
    r.fromPinned.safeties.length + r.fromPinned.targets.length + r.fromPinned.reaches.length;
  if (pinnedCount === 0 && r.toConsider.length === 0) return "warning";
  if (pinnedCount >= 3) return "strong";
  return "mixed";
}

export function majorRecsHeadline(r: MajorAwareRecommendations): string {
  if (!r.intendedMajor && !r.intendedInterest) return "Pick a major to see tailored picks";
  const label = r.intendedMajor || r.intendedInterest || "";
  const pinnedCount =
    r.fromPinned.safeties.length + r.fromPinned.targets.length + r.fromPinned.reaches.length;
  const parts: string[] = [];
  if (pinnedCount > 0) parts.push(`${pinnedCount} from your pins`);
  if (r.toConsider.length > 0) parts.push(`${r.toConsider.length} to consider`);
  const summary = parts.length > 0 ? parts.join(" · ") : "no matches yet";
  return `${label} · ${summary}`;
}

export const CLASSIFICATION_COLORS: Record<Classification, string> = {
  safety: "bg-emerald-500/70",
  likely: "bg-blue-500/70",
  target: "bg-amber-500/70",
  reach: "bg-orange-500/70",
  unlikely: "bg-red-500/70",
  insufficient: "bg-zinc-500/30",
};

export const CLASSIFICATION_TEXT: Record<Classification, string> = {
  safety: "text-emerald-300",
  likely: "text-accent-text",
  target: "text-amber-300",
  reach: "text-orange-300",
  unlikely: "text-red-300",
  insufficient: "text-text-secondary",
};
