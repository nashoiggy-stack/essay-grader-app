// ── Activity Conversation ────────────────────────────────────────────────────

export interface ECMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

// Resume section a conversation maps to. "auto" lets the classifier decide.
export type ResumeCategory =
  | "auto"
  | "activities"
  | "communityService"
  | "athletics"
  | "summerExperience"
  | "awards";

export const RESUME_CATEGORY_LABELS: Record<ResumeCategory, string> = {
  auto: "Auto-detect",
  activities: "Activities",
  communityService: "Community Service",
  athletics: "Athletics",
  summerExperience: "Summer Experience",
  awards: "Awards & Honors",
};

export interface ECConversation {
  readonly id: string;
  readonly messages: ECMessage[];
  readonly done: boolean;
  readonly title: string; // derived from first user message
  readonly disabled?: boolean; // excluded from evaluation but not deleted
  readonly resumeCategory?: ResumeCategory; // manual override for resume import
}

// ── Evaluation Results ──────────────────────────────────────────────────────

export type ActivityTier = 1 | 2 | 3 | 4;

export interface ActivityScores {
  readonly leadership: number;  // 0-4
  readonly impact: number;      // 0-4
  readonly commitment: number;  // 0-4
  readonly alignment: number;   // 0-2
}

export interface ActivityEvaluation {
  readonly activityName: string;
  readonly category: string;
  readonly tier: ActivityTier;
  readonly tierExplanation: string;
  readonly scores: ActivityScores;
  readonly highlights: string[];
  readonly improvements: string[];
}

export type ECBand = "limited" | "developing" | "solid" | "strong" | "exceptional";

export const EC_BAND_LABELS: Record<ECBand, string> = {
  limited: "Limited",
  developing: "Developing",
  solid: "Solid",
  strong: "Strong",
  exceptional: "Exceptional",
};

export interface ProfileSpike {
  readonly category: string;
  readonly strength: "moderate" | "strong" | "dominant";
}

export interface ProfileEvaluation {
  readonly activities: ActivityEvaluation[];
  readonly band: ECBand;
  readonly bandExplanation: string;
  readonly spikes: ProfileSpike[];
  readonly isWellRounded: boolean;
  readonly consistencyNote: string;
  readonly strengths: string[];
  readonly gaps: string[];
  readonly recommendations: string[];
}

// ── localStorage key ────────────────────────────────────────────────────────

export const EC_STORAGE_KEY = "ec-evaluator-result";
export const EC_ACTIVITIES_KEY = "ec-evaluator-activities";

// ── Readiness Score ─────────────────────────────────────────────────────────

// Each band maps to a score range. Gives students a continuous sense of
// progress inside an otherwise categorical signal.
export const BAND_RANGES: Record<ECBand, { min: number; max: number }> = {
  limited: { min: 0, max: 25 },
  developing: { min: 25, max: 45 },
  solid: { min: 45, max: 65 },
  strong: { min: 65, max: 85 },
  exceptional: { min: 85, max: 100 },
};

export const BAND_ORDER: readonly ECBand[] = [
  "limited",
  "developing",
  "solid",
  "strong",
  "exceptional",
] as const;

interface ReadinessInput {
  readonly activities: readonly ActivityEvaluation[];
  readonly band: ECBand;
  readonly spikes: readonly ProfileSpike[];
}

/**
 * Compute a 0-100 readiness score from an EC evaluation.
 *
 * Scoring:
 * - Each activity contributes based on its tier + sub-scores
 * - Spike presence adds a small bonus (depth beats breadth)
 * - Result is clamped into the range of the LLM-assigned band so the
 *   number never contradicts the verdict
 */
export function computeReadinessScore(input: ReadinessInput): number {
  const TIER_BASE: Record<ActivityTier, number> = { 1: 22, 2: 13, 3: 6, 4: 2 };
  const TIER_BONUS_CAP: Record<ActivityTier, number> = { 1: 12, 2: 9, 3: 5, 4: 2 };

  let total = 0;
  for (const a of input.activities) {
    const base = TIER_BASE[a.tier] ?? 0;
    const cap = TIER_BONUS_CAP[a.tier] ?? 0;
    const subscoreSum = a.scores.leadership + a.scores.impact + a.scores.commitment + a.scores.alignment;
    // Max subscore sum is 4+4+4+2 = 14
    const subBonus = (subscoreSum / 14) * cap;
    total += base + subBonus;
  }

  // Spike bonus — depth beats breadth
  for (const spike of input.spikes) {
    if (spike.strength === "dominant") total += 4;
    else if (spike.strength === "strong") total += 2;
    else total += 1;
  }

  // Clamp raw score to 0-100
  const raw = Math.max(0, Math.min(100, Math.round(total)));

  // Anchor to the LLM-assigned band so the number never contradicts the verdict.
  const range = BAND_RANGES[input.band];
  return Math.max(range.min, Math.min(range.max, raw));
}

/**
 * Generate a next-step narrative sentence based on current band + score.
 */
export function buildReadinessNextStep(band: ECBand, score: number): string {
  const currentIdx = BAND_ORDER.indexOf(band);
  const nextBand = BAND_ORDER[currentIdx + 1];
  const range = BAND_RANGES[band];
  const nextRange = nextBand ? BAND_RANGES[nextBand] : null;
  const pointsToNext = nextRange ? nextRange.min - score : 0;
  const bandProgress = (score - range.min) / (range.max - range.min);

  if (!nextBand) {
    return "You're in the top band — focus on essays and school fit now.";
  }

  if (pointsToNext <= 3) {
    return `You're right on the edge of ${EC_BAND_LABELS[nextBand]}. One more strong activity pushes you across.`;
  }

  if (bandProgress > 0.7) {
    return `You're near the top of ${EC_BAND_LABELS[band]}. A Tier ${band === "strong" ? "1" : "2"} win or stronger leadership role moves you to ${EC_BAND_LABELS[nextBand]}.`;
  }

  if (bandProgress < 0.3) {
    return `You're at the start of ${EC_BAND_LABELS[band]}. Deepen your best activity with measurable impact to move up.`;
  }

  return `You're mid-${EC_BAND_LABELS[band]}. Build on your strongest activity — leadership role, measurable impact, or a regional-level achievement.`;
}
