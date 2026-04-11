// ── Import helpers for Resume Helper ────────────────────────────────────────
//
// Pulls data from existing tools (GPA calculator, EC Evaluator, profile)
// and returns typed resume entries. Pure functions — no localStorage side
// effects, so the hook can control when imports happen.

import type {
  ActivityEntry,
  EducationEntry,
  BasicInfo,
  ResumeData,
} from "./resume-types";
import { generateResumeId, normalizeTitle } from "./resume-types";
import type {
  ECConversation,
  ProfileEvaluation,
  ActivityEvaluation,
} from "./extracurricular-types";
import { EC_STORAGE_KEY, EC_ACTIVITIES_KEY } from "./extracurricular-types";
import type { UserProfile } from "./profile-types";
import { PROFILE_STORAGE_KEY } from "./profile-types";

// ── Safe localStorage reads ─────────────────────────────────────────────────

function safeParse<T>(key: string): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ── Basic info + GPA import ─────────────────────────────────────────────────

export interface ProfileImportResult {
  readonly basicInfo: Partial<BasicInfo>;
  readonly gpaUW: string;
  readonly gpaW: string;
}

export function importFromProfile(): ProfileImportResult {
  const profile = safeParse<UserProfile>(PROFILE_STORAGE_KEY);
  if (!profile) {
    return { basicInfo: {}, gpaUW: "", gpaW: "" };
  }
  return {
    basicInfo: profile.basicInfo ?? {},
    gpaUW: profile.gpaUW ?? "",
    gpaW: profile.gpaW ?? "",
  };
}

// ── EC Evaluator import ─────────────────────────────────────────────────────

/**
 * Derive a clean activity summary from the student's own messages in a
 * conversation. Picks up to the first ~2 substantive user messages and
 * joins them as a first-draft description. The user can rewrite with the
 * "Improve" button afterward.
 */
function extractDescriptionFromConversation(conv: ECConversation): string {
  const userMessages = conv.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter((s) => s.length > 20); // skip trivial one-liners

  if (userMessages.length === 0) return "";

  const combined = userMessages.slice(0, 2).join(" ");
  // Cap to ~300 chars so it doesn't dominate the preview before AI rewrite
  if (combined.length <= 300) return combined;
  return combined.slice(0, 297) + "...";
}

/**
 * Find the matching scored activity (from ProfileEvaluation) for a given
 * conversation. Matching is by title similarity — not by id because the
 * evaluator stores by activityName, not by conv id.
 */
function findMatchingEvaluation(
  conv: ECConversation,
  evaluation: ProfileEvaluation | null
): ActivityEvaluation | null {
  if (!evaluation?.activities?.length) return null;
  const convTitle = normalizeTitle(conv.title);
  return (
    evaluation.activities.find(
      (a) => normalizeTitle(a.activityName) === convTitle
    ) ?? null
  );
}

export interface ECImportResult {
  readonly activities: readonly ActivityEntry[];
  readonly importedCount: number;
  readonly skippedCount: number;
}

/**
 * Import EC conversations as resume Activity entries.
 *
 * Rules:
 * - Disabled conversations are excluded
 * - Empty conversations are excluded
 * - Existing entries with matching normalized titles are skipped (dedup)
 * - Prefers structured evaluator outputs (highlights, scores) over raw chat
 * - Falls back to user messages only when evaluation is missing
 */
export function importFromECEvaluator(
  existingActivities: readonly ActivityEntry[]
): ECImportResult {
  const conversations = safeParse<ECConversation[]>(EC_ACTIVITIES_KEY) ?? [];
  const evaluation = safeParse<ProfileEvaluation>(EC_STORAGE_KEY);

  const existingTitles = new Set(
    existingActivities.map((a) => normalizeTitle(a.activityName))
  );

  const newEntries: ActivityEntry[] = [];
  let skipped = 0;

  for (const conv of conversations) {
    if (conv.disabled) continue;
    if (conv.messages.length === 0) continue;

    const evalMatch = findMatchingEvaluation(conv, evaluation);
    const name = evalMatch?.activityName ?? conv.title;

    if (existingTitles.has(normalizeTitle(name))) {
      skipped += 1;
      continue;
    }

    // Prefer structured impact (highlights) over raw chat
    const impact = evalMatch?.highlights?.length
      ? evalMatch.highlights.join("; ")
      : "";

    // Description: use evaluator's tierExplanation if available, else fall
    // back to cleaned user messages from the conversation
    const description = evalMatch?.tierExplanation
      ? evalMatch.tierExplanation
      : extractDescriptionFromConversation(conv);

    const leadership = evalMatch ? evalMatch.scores.leadership >= 3 : false;

    newEntries.push({
      id: generateResumeId(),
      activityName: name,
      role: "",
      grades: "",
      description,
      leadership,
      impact,
      category: evalMatch?.category,
      source: "EC Evaluator",
    });
  }

  return {
    activities: newEntries,
    importedCount: newEntries.length,
    skippedCount: skipped,
  };
}

// ── Full initial autofill (called once on hook mount) ──────────────────────

/**
 * Build an initial ResumeData seeded from whatever existing tool data we can
 * find. Called only when there's no saved resume in localStorage yet. Does
 * NOT import activities — activities require an explicit import action.
 */
export function buildInitialResume(base: ResumeData): ResumeData {
  const { basicInfo, gpaUW } = importFromProfile();

  const mergedBasicInfo: BasicInfo = {
    ...base.basicInfo,
    name: basicInfo.name ?? base.basicInfo.name,
    email: basicInfo.email ?? base.basicInfo.email,
    phone: basicInfo.phone ?? base.basicInfo.phone,
    school: basicInfo.school ?? base.basicInfo.school,
    graduationYear: basicInfo.graduationYear ?? base.basicInfo.graduationYear,
    address: basicInfo.address ?? base.basicInfo.address,
  };

  // Seed an Education entry from the profile GPA if one is available
  const education: readonly EducationEntry[] =
    gpaUW && base.education.length === 0
      ? [
          {
            id: generateResumeId(),
            school: mergedBasicInfo.school,
            graduationDate: mergedBasicInfo.graduationYear,
            gpa: gpaUW,
            source: "GPA Calculator",
          },
        ]
      : base.education;

  return {
    ...base,
    basicInfo: mergedBasicInfo,
    education,
  };
}
