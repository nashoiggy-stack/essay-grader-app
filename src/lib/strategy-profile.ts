// ── Strategy Profile Reader ─────────────────────────────────────────────────
//
// Assembles a StrategyProfile from every localStorage source the rest of the
// app writes to. Handles missing data gracefully — every field is nullable,
// so the Strategy Engine degrades cleanly when the user hasn't used every
// tool yet.
//
// This function is pure (reads localStorage, no side effects) and must only
// run on the client.

import type {
  StrategyProfile,
  StrategyPinnedSchool,
  StrategyGpa,
  StrategyTests,
  StrategyEssay,
  StrategyChanceExtras,
} from "./strategy-types";
import { DREAM_SCHOOL_KEY } from "./strategy-types";
import type { UserProfile, EssayScoreRecord } from "./profile-types";
import type { ProfileEvaluation } from "./extracurricular-types";
import type { GradingResult, SavedEssay } from "./types";
import type { ClassifiedCollege, PinnedCollege } from "./college-types";
import { PINNED_COLLEGES_KEY } from "./college-types";
import { PROFILE_STORAGE_KEY } from "./profile-types";
import { COLLEGES } from "@/data/colleges";
import { classifyCollege } from "./admissions";
import { getCachedJson, getCachedRaw, type CloudKey } from "./cloud-storage";

function readUserProfile(): UserProfile | null {
  return getCachedJson<UserProfile>(PROFILE_STORAGE_KEY as CloudKey);
}

function readEcEvaluation(): ProfileEvaluation | null {
  return getCachedJson<ProfileEvaluation>("ec-evaluator-result");
}

function readEssayHistory(): readonly SavedEssay[] {
  const parsed = getCachedJson<SavedEssay[]>("essay-grader-history");
  return Array.isArray(parsed) ? parsed : [];
}

function readPinnedCollegeList(): readonly PinnedCollege[] {
  const parsed = getCachedJson<PinnedCollege[]>(PINNED_COLLEGES_KEY as CloudKey);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (p): p is PinnedCollege =>
      typeof p?.name === "string" && typeof p?.pinnedAt === "number",
  );
}

// ── Transforms ──────────────────────────────────────────────────────────────

function buildGpa(profile: UserProfile | null): StrategyGpa {
  const uw = profile?.gpaUW ? parseFloat(profile.gpaUW) : NaN;
  const w = profile?.gpaW ? parseFloat(profile.gpaW) : NaN;
  return {
    uw: Number.isFinite(uw) ? uw : null,
    w: Number.isFinite(w) ? w : null,
    rigor: profile?.rigor ?? "medium",
  };
}

function buildTests(profile: UserProfile | null): StrategyTests {
  let sat: number | null = null;
  let act: number | null = null;
  let apCount = 0;
  let apStrongCount = 0;

  if (profile?.sat?.readingWriting && profile?.sat?.math) {
    const r = parseInt(profile.sat.readingWriting, 10);
    const m = parseInt(profile.sat.math, 10);
    if (Number.isFinite(r) && Number.isFinite(m)) sat = r + m;
  }
  if (profile?.act?.english && profile?.act?.math && profile?.act?.reading) {
    const e = parseInt(profile.act.english, 10);
    const m = parseInt(profile.act.math, 10);
    const r = parseInt(profile.act.reading, 10);
    const s = profile.act.science ? parseInt(profile.act.science, 10) : NaN;
    const parts = [e, m, r, s].filter((v) => Number.isFinite(v));
    if (parts.length >= 3) {
      act = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    }
  }
  if (Array.isArray(profile?.apScores)) {
    for (const ap of profile!.apScores) {
      apCount++;
      if (ap.score >= 4) apStrongCount++;
    }
  }

  return { sat, act, apCount, apStrongCount };
}

function buildEssay(
  profile: UserProfile | null,
  history: readonly SavedEssay[],
): StrategyEssay | null {
  const summaryScore = profile?.essayCommonApp
    ? Number.parseFloat(profile.essayCommonApp)
    : null;
  const vspice = profile?.essayVspice
    ? Number.parseFloat(profile.essayVspice)
    : null;

  const hasAny =
    (summaryScore != null && Number.isFinite(summaryScore)) ||
    (vspice != null && Number.isFinite(vspice)) ||
    history.length > 0;
  if (!hasAny) return null;

  // Pick the most recently saved essay as "latest" for richer LLM context.
  const latest: GradingResult | null =
    history.length > 0
      ? history.reduce((a, b) => (a.savedAt > b.savedAt ? a : b)).result
      : null;

  return {
    summaryScore: Number.isFinite(summaryScore ?? NaN) ? summaryScore : null,
    vspice: Number.isFinite(vspice ?? NaN) ? vspice : null,
    latest,
  };
}

// Build the full chance-model "extras" set from the user profile. Mirrors
// what useChanceCalculator does for /chances so strategy numbers match the
// live calculator instead of silently degrading the essay multiplier and
// rigor uplift.
function buildChanceExtras(
  profile: UserProfile | null,
  essayCA: number | null,
  essayV: number | null,
): StrategyChanceExtras {
  const ecBand =
    typeof profile?.ecBand === "string" && profile.ecBand ? profile.ecBand : undefined;
  const distinguishedEC =
    profile?.firstAuthorPublication === true ||
    profile?.nationalCompetitionPlacement === true ||
    profile?.founderWithUsers === true ||
    profile?.selectiveProgram === true;

  const advancedCoursework = Array.isArray(profile?.advancedCoursework)
    ? profile!.advancedCoursework
    : undefined;
  const advancedCourseworkAvailable =
    profile?.advancedCourseworkAvailable === "all" ||
    profile?.advancedCourseworkAvailable === "limited" ||
    profile?.advancedCourseworkAvailable === "none"
      ? profile.advancedCourseworkAvailable
      : undefined;

  // Same synthesis as useChanceCalculator: when no graded essay exists but
  // the user supplied Common-App + V-SPICE numbers on /profile, treat them
  // as a valid essay record so the chance model can leave the 1.0× neutral
  // band. Without this, /strategy under-reports chances vs /chances.
  let essayScores: readonly EssayScoreRecord[] | undefined;
  if (Array.isArray(profile?.essayScores) && profile!.essayScores.length > 0) {
    essayScores = profile!.essayScores;
  } else if (essayCA != null && Number.isFinite(essayCA)) {
    const vspice0to24 =
      essayV != null && Number.isFinite(essayV)
        ? Math.max(0, Math.min(24, essayV))
        : 0;
    essayScores = [
      {
        promptId: "strategy-form",
        combinedScore: essayCA,
        rubricScore: essayCA,
        vspiceScore: vspice0to24,
        gradedAt: Date.now(),
      },
    ];
  }

  return {
    ecBand,
    distinguishedEC,
    apScores: profile?.apScores,
    advancedCoursework,
    advancedCourseworkAvailable,
    essayScores,
  };
}

function buildPinnedSchools(
  pins: readonly PinnedCollege[],
  profile: UserProfile | null,
  extras: StrategyChanceExtras,
): readonly StrategyPinnedSchool[] {
  if (pins.length === 0) return [];

  // Parse the profile into the shape classifyCollege expects.
  const gpaUW = profile?.gpaUW ? parseFloat(profile.gpaUW) : null;
  const gpaW = profile?.gpaW ? parseFloat(profile.gpaW) : null;
  const sat =
    profile?.sat?.readingWriting && profile?.sat?.math
      ? parseInt(profile.sat.readingWriting, 10) + parseInt(profile.sat.math, 10)
      : null;
  const actParts = [
    profile?.act?.english,
    profile?.act?.math,
    profile?.act?.reading,
  ]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isFinite(v));
  const act =
    actParts.length >= 3
      ? Math.round(actParts.reduce((a, b) => a + b, 0) / actParts.length)
      : null;
  const essayCA = profile?.essayCommonApp
    ? parseFloat(profile.essayCommonApp)
    : null;
  const essayV = profile?.essayVspice ? parseFloat(profile.essayVspice) : null;
  const rigor = profile?.rigor;

  const result: StrategyPinnedSchool[] = [];
  for (const pin of pins) {
    const college = COLLEGES.find((c) => c.name === pin.name);
    if (!college) continue; // pinned a school that's no longer in the DB — skip
    const r = classifyCollege(
      college,
      Number.isFinite(gpaUW ?? NaN) ? gpaUW : null,
      Number.isFinite(gpaW ?? NaN) ? gpaW : null,
      Number.isFinite(sat ?? NaN) ? sat : null,
      Number.isFinite(act ?? NaN) ? act : null,
      Number.isFinite(essayCA ?? NaN) ? essayCA : null,
      Number.isFinite(essayV ?? NaN) ? essayV : null,
      {
        ecBand: extras.ecBand,
        distinguishedEC: extras.distinguishedEC,
        rigor,
        apScores: extras.apScores,
        advancedCoursework: extras.advancedCoursework,
        advancedCourseworkAvailable: extras.advancedCourseworkAvailable,
        essayScores: extras.essayScores,
      },
    );
    const classified: ClassifiedCollege = {
      college,
      classification: r.classification,
      reason: r.reason,
      chance: r.chance,
      confidence: r.confidence,
      yieldProtectedNote: r.yieldProtectedNote,
      usedFallback: r.usedFallback,
      stale: r.stale,
      recruitedAthletePathway: r.recruitedAthletePathway,
    };
    result.push({ pin, classified });
  }
  return result;
}

// ── Public reader ───────────────────────────────────────────────────────────

function readDreamSchool(): string | null {
  const raw = getCachedRaw(DREAM_SCHOOL_KEY as CloudKey);
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return null;
    }
  }
  return trimmed.length > 0 ? trimmed : null;
}

export function readStrategyProfile(): StrategyProfile {
  const profile = readUserProfile();
  const ec = readEcEvaluation();
  const essayHistory = readEssayHistory();
  const pins = readPinnedCollegeList();
  const dreamSchool = readDreamSchool();

  const gpa = buildGpa(profile);
  const tests = buildTests(profile);
  const essay = buildEssay(profile, essayHistory);
  // Strategy uses the SAME chance-model inputs the live calculator does —
  // build once and reuse for the RD baseline (here) and any later ED
  // re-classification in strategy-engine.
  const essayCAForExtras = profile?.essayCommonApp
    ? parseFloat(profile.essayCommonApp)
    : null;
  const essayVForExtras = profile?.essayVspice
    ? parseFloat(profile.essayVspice)
    : null;
  const chanceExtras = buildChanceExtras(profile, essayCAForExtras, essayVForExtras);
  const pinnedSchools = buildPinnedSchools(pins, profile, chanceExtras);

  const hasGpa = gpa.uw != null || gpa.w != null;
  const hasTests = tests.sat != null || tests.act != null;
  const hasEc = ec != null && Array.isArray(ec.activities) && ec.activities.length > 0;
  const hasEssay = essay != null;
  const hasPinnedSchools = pinnedSchools.length > 0;
  const hasDreamSchool = dreamSchool != null && dreamSchool.length > 0;

  // Normalize "Any" (the default dropdown value on the colleges page) down
  // to empty string — downstream code only cares whether the user actually
  // picked a major.
  const rawMajor = (profile?.intendedMajor ?? "").trim();
  const intendedMajor = rawMajor && rawMajor !== "Any" ? rawMajor : "";
  const intendedInterest = (profile?.intendedInterest ?? "").trim();

  return {
    gpa,
    tests,
    ec,
    essay,
    pinnedSchools,
    dreamSchool,
    intendedMajor,
    intendedInterest,
    basicInfo:
      profile?.basicInfo?.name || profile?.basicInfo?.graduationYear
        ? {
            name: profile?.basicInfo?.name ?? "",
            graduationYear: profile?.basicInfo?.graduationYear ?? "",
          }
        : null,
    chanceExtras,
    hasGpa,
    hasTests,
    hasEc,
    hasEssay,
    hasPinnedSchools,
    hasDreamSchool,
  };
}
