export interface SATScores {
  readonly readingWriting: string; // 200-800
  readonly math: string;          // 200-800
}

export interface ACTScores {
  readonly english: string;  // 1-36
  readonly math: string;     // 1-36
  readonly reading: string;  // 1-36
  readonly science: string;  // 1-36
}

export interface UserProfile {
  // GPA — auto-filled from GPA calculator
  gpaUW: string;
  gpaW: string;

  // Test scores — user-entered section scores
  sat: SATScores;
  act: ACTScores;

  // Essay — auto-filled from essay grader
  essayCommonApp: string; // 0-100
  essayVspice: string;    // 0-4

  // Extracurriculars — auto-filled from EC evaluator
  ecBand: string;         // limited|developing|solid|strong|exceptional
  ecStrength: "low" | "medium" | "high";

  // Course rigor — auto-filled from weighted GPA
  rigor: "low" | "medium" | "high";
}

export const EMPTY_PROFILE: UserProfile = {
  gpaUW: "",
  gpaW: "",
  sat: { readingWriting: "", math: "" },
  act: { english: "", math: "", reading: "", science: "" },
  essayCommonApp: "",
  essayVspice: "",
  ecBand: "",
  ecStrength: "medium",
  rigor: "medium",
};

export const PROFILE_STORAGE_KEY = "admitedge-profile";

export function computeSATComposite(scores: SATScores): number | null {
  const rw = scores.readingWriting ? parseInt(scores.readingWriting) : null;
  const m = scores.math ? parseInt(scores.math) : null;
  if (rw === null || m === null) return null;
  if (isNaN(rw) || isNaN(m)) return null;
  return rw + m;
}

export function computeACTComposite(scores: ACTScores): number | null {
  const e = scores.english ? parseInt(scores.english) : null;
  const m = scores.math ? parseInt(scores.math) : null;
  const r = scores.reading ? parseInt(scores.reading) : null;
  const s = scores.science ? parseInt(scores.science) : null;
  if (e === null || m === null || r === null || s === null) return null;
  if (isNaN(e) || isNaN(m) || isNaN(r) || isNaN(s)) return null;
  return Math.round((e + m + r + s) / 4);
}
