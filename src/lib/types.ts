export interface CriterionResult {
  score: number;
  feedback: string;
}

export interface LineSuggestion {
  line: string;
  suggestion: string;
}

export interface GradingResult {
  commonApp: Record<string, CriterionResult>;
  vspice: Record<string, CriterionResult>;
  pitfalls: string[];
  bonuses: string[];
  lineSuggestions: LineSuggestion[];
  generalFeedback: string;
  wordCount: number;
  rawScore: number;
  adjustedScore: number;
  wordCountPenalty: number;
  vspiceComposite: number;
}
