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

// Final calibration: rigor signal lives on advancedCoursework[] (not the old
// single "rigor" dropdown). Each row captures one course; the chance model
// derives a 6-tier rigor classification from the array (top/high/solid/mixed/
// weak/none) plus advancedCourseworkAvailable. Volume baked into thresholds,
// not a separate multiplier.
//
// AP and IB-HL with score ≥6 are treated as the strongest signal ("5-equivalent");
// IB-SL caps at "4-equivalent" even at score 7. Dual-Enrollment (DE) is excluded
// from the classifier — wide variance in rigor and reporting.
export type AdvancedCourseworkType = "AP" | "IB-HL" | "IB-SL";

export interface AdvancedCourseworkRow {
  readonly type: AdvancedCourseworkType;
  readonly name: string;
  // 1-5 for AP, 1-7 for IB. Optional when course is in progress / no score yet.
  readonly score?: number;
}

// Graded essay record. Populated by the essay grading tool — the only trusted
// source for essay quality. Self-reported quality is intentionally NOT trusted.
// When essayScores[] is empty, the chance model uses a 1.0× multiplier and
// surfaces the "Essay quality not measured" advisory instead.
export interface EssayScoreRecord {
  // Stable identifier from the essay tool — distinguishes "Why us?" from main.
  readonly promptId: string;
  // V-SPICE composite (0-25). Surfaces in the breakdown panel for transparency
  // alongside combinedScore.
  readonly vspiceScore: number;
  // Rubric composite (0-100). Surfaces in the breakdown panel.
  readonly rubricScore: number;
  // The single number the chance model multiplies by. Computed by the essay
  // tool from V-SPICE + rubric; chance math reads ONLY this field.
  readonly combinedScore: number;
  // Epoch ms. Drives the "graded N weeks ago" freshness note (>4w = stale).
  readonly gradedAt: number;
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

  // AP scores — user-entered, persists across sessions.
  // @deprecated kept only for legacy data round-trip. The chance model now
  // reads advancedCoursework[] instead. Migrate-on-read in the chance
  // calculator: an apScores entry is treated as advancedCoursework with
  // type='AP'. Cleanup PR will drop this field.
  apScores: APScoreProfile[];

  // Final calibration: per-row advanced coursework. Each row is a single AP
  // exam, IB-HL course, or IB-SL course (DE excluded). Score optional when
  // course is in progress or pre-exam. Replaces the old free-floating apScores
  // for the chance model's rigor classifier.
  advancedCoursework?: AdvancedCourseworkRow[];

  // Total IB diploma score (24-45 typical). Optional — only meaningful for
  // full-IB-diploma candidates. Read by the rigor classifier as a corroborating
  // signal alongside individual HL/SL scores.
  ibDiplomaScore?: number;

  // Explicit "school doesn't offer AP/IB" signal. When 'none', the chance
  // model waives the rigor requirement (no penalty, no boost) for elite-
  // profile floor and stat-band consensus rule. 'limited' means a few APs
  // are offered; 'all' means full menu. Default undefined = treat as 'all'.
  advancedCourseworkAvailable?: "all" | "limited" | "none";

  // Graded essay records — populated by the essay grading tool.
  // The chance model reads combinedScore from each entry, averages, and
  // applies a multiplier (0.9× to 1.15×). Self-reported essay quality is
  // intentionally NOT trusted — only graded scores from the tool count.
  essayScores?: EssayScoreRecord[];

  // Essay — auto-filled from essay grader.
  // @deprecated chance model now reads essayScores[]. Kept for legacy
  // /chances form display while users transition.
  essayCommonApp: string; // 0-100
  essayVspice: string;    // 0-4

  // Extracurriculars — auto-filled from EC evaluator
  ecBand: string;         // limited|developing|solid|strong|exceptional
  ecStrength: "low" | "medium" | "high";

  // Course rigor — auto-filled from weighted GPA.
  // @deprecated replaced by advancedCoursework[] + advancedCourseworkAvailable.
  // The new chance model derives a 6-tier rigor signal from the array and
  // ignores this field. Kept for legacy round-trip; cleanup PR removes it.
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

  // ── Distinguished EC flags (final calibration) ────────────────────────────
  // When any of these is true, the chance model promotes the effective EC
  // band to "exceptional" regardless of the user's profile.ecBand value.
  // The /profile UI for these is deferred — fields ready for a future PR.
  //
  // - firstAuthorPublication: published research as first author at a
  //   recognized venue
  // - nationalCompetitionPlacement: placement in national or international
  //   competition
  // - founderWithUsers: founded business with measurable users or revenue
  // - selectiveProgram: admission to a tier-defining selective program
  //   (RSI, TASP, Telluride, MITES, SSP, etc.)
  firstAuthorPublication?: boolean;
  nationalCompetitionPlacement?: boolean;
  founderWithUsers?: boolean;
  selectiveProgram?: boolean;
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

// Cloud-loaded profile blobs can be partial — older accounts and partially
// hydrated localStorage caches sometimes lack `sat`, `act`, or `apScores`
// entirely. The UserProfile type declares those fields non-optional, so
// downstream code reads `profile.sat.readingWriting` directly. Without
// normalization on load, that crashes with "Cannot read properties of
// undefined". `normalizeProfile` fills every required field with a safe
// default and preserves user-set values, so the static type is honest at
// runtime. Keep this in sync with the UserProfile interface above — any new
// required field MUST be added here too.
export function normalizeProfile(raw: unknown): UserProfile {
  const p = (raw && typeof raw === "object" ? raw : {}) as Partial<UserProfile>;
  return {
    gpaUW: p.gpaUW ?? "",
    gpaW: p.gpaW ?? "",
    sat: {
      readingWriting: p.sat?.readingWriting ?? "",
      math: p.sat?.math ?? "",
    },
    act: {
      english: p.act?.english ?? "",
      math: p.act?.math ?? "",
      reading: p.act?.reading ?? "",
      science: p.act?.science ?? "",
    },
    apScores: Array.isArray(p.apScores) ? p.apScores : [],
    essayCommonApp: p.essayCommonApp ?? "",
    essayVspice: p.essayVspice ?? "",
    ecBand: p.ecBand ?? "",
    ecStrength: p.ecStrength ?? "medium",
    rigor: p.rigor ?? "medium",
    basicInfo: p.basicInfo,
    intendedMajor: p.intendedMajor,
    intendedInterest: p.intendedInterest,
    firstGen: p.firstGen,
    legacyParent: p.legacyParent,
    recruitedAthlete: p.recruitedAthlete,
    firstAuthorPublication: p.firstAuthorPublication,
    nationalCompetitionPlacement: p.nationalCompetitionPlacement,
    founderWithUsers: p.founderWithUsers,
    selectiveProgram: p.selectiveProgram,
  };
}

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
