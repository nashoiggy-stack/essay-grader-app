// ── Activity Conversation ────────────────────────────────────────────────────

export interface ECMessage {
  readonly role: "user" | "assistant";
  readonly content: string;
}

export interface ECConversation {
  readonly id: string;
  readonly messages: ECMessage[];
  readonly done: boolean;
  readonly title: string; // derived from first user message
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
