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

export interface APScoreProfile {
  readonly subject: string;
  readonly score: 1 | 2 | 3 | 4 | 5;
}

// Shared student identity used by resume, cover letters, etc.
// Optional — tools degrade gracefully when basicInfo is absent.
export interface BasicStudentInfo {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly school: string;
  readonly graduationYear: string;
  readonly address: string;
}

export interface UserProfile {
  // GPA — auto-filled from GPA calculator
  gpaUW: string;
  gpaW: string;

  // Test scores — user-entered section scores
  sat: SATScores;
  act: ACTScores;

  // AP scores — user-entered, persists across sessions
  apScores: APScoreProfile[];

  // Essay — auto-filled from essay grader
  essayCommonApp: string; // 0-100
  essayVspice: string;    // 0-4

  // Extracurriculars — auto-filled from EC evaluator
  ecBand: string;         // limited|developing|solid|strong|exceptional
  ecStrength: "low" | "medium" | "high";

  // Course rigor — auto-filled from weighted GPA
  rigor: "low" | "medium" | "high";

  // Shared student identity (used by resume, future cover letters, etc.)
  basicInfo?: BasicStudentInfo;

  // Intended area of study. Used by the college list (to badge strong-fit
  // schools) and the strategy engine (to pick major-relevant recommendations).
  // `intendedMajor` is one of the MAJORS constants; `intendedInterest` is a
  // free-text box for niches (e.g. "sustainability", "quant trading").
  intendedMajor?: string;
  intendedInterest?: string;

  // ── Hook fields (Feature 1 structural — math deferred per SPEC W2) ────────
  // Booleans are read by the chance model in W4. The /profile UI for these
  // is intentionally deferred — the data shape is ready so the model and
  // any future UI both see the same surface.
  //
  // - firstGen: parent(s) did not complete a bachelor's degree. Math deferred
  //   (research disagrees on magnitude — SPEC W2). Logged for future use.
  // - legacyParent: at least one parent attended this school. Math deferred
  //   (multiplicative bump pending per-school sourcing — SPEC W2). The chance
  //   model gates legacy bumps on College.legacyConsidered.
  // - recruitedAthlete: true triggers the special pathway (~70-85% admit at
  //   top schools per Harvard SFFA court data) that bypasses the normal
  //   chance model. Implemented in W4.
  firstGen?: boolean;
  legacyParent?: boolean;
  recruitedAthlete?: boolean;
}

export const EMPTY_BASIC_STUDENT_INFO: BasicStudentInfo = {
  name: "",
  email: "",
  phone: "",
  school: "",
  graduationYear: "",
  address: "",
};

export const EMPTY_PROFILE: UserProfile = {
  gpaUW: "",
  gpaW: "",
  sat: { readingWriting: "", math: "" },
  act: { english: "", math: "", reading: "", science: "" },
  apScores: [],
  essayCommonApp: "",
  essayVspice: "",
  ecBand: "",
  ecStrength: "medium",
  rigor: "medium",
  basicInfo: EMPTY_BASIC_STUDENT_INFO,
  intendedMajor: "",
  intendedInterest: "",
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
  if (e === null || m === null || r === null) return null;
  if (isNaN(e) || isNaN(m) || isNaN(r)) return null;
  // ACT composite = English + Math + Reading (science excluded)
  return Math.round((e + m + r) / 3);
}
