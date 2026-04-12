// ── UNDO [application-plan] ─────────────────────────────────────────────────
// To fully revert the application-plan feature, remove every block tagged
// `UNDO [application-plan]` across:
//   - src/lib/college-types.ts
//   - src/lib/admissions.ts
//   - src/data/colleges.ts
//   - src/hooks/useChanceCalculator.ts
//   - src/components/ChanceForm.tsx
//   - src/components/ChanceResult.tsx
// The field on College is optional and the ChanceInputs default is "RD",
// so removing the tagged regions restores the original behavior with no
// data migration required.
// ────────────────────────────────────────────────────────────────────────────

// UNDO [application-plan]: remove this block (ApplicationPlan + ApplicationOption)
export type ApplicationPlan =
  | "RD"
  | "EA"
  | "REA"
  | "SCEA"
  | "ED"
  | "ED2"
  | "Rolling";

export interface ApplicationOption {
  readonly type: ApplicationPlan;
  readonly binding?: boolean; // true only for ED / ED2
}

export const APPLICATION_PLAN_LABELS: Record<ApplicationPlan, string> = {
  RD: "Regular Decision",
  EA: "Early Action",
  REA: "Restrictive Early Action",
  SCEA: "Single-Choice Early Action",
  ED: "Early Decision",
  ED2: "Early Decision II",
  Rolling: "Rolling Admission",
};
// end UNDO [application-plan]

// Tier types used across the extended college profile. "low" | "medium" | "high"
// is deliberately coarse — normalized tiers are better than fake precision when
// exact data isn't publicly available.
export type Tier3 = "low" | "medium" | "high";

export interface College {
  // ── Core (original) ──────────────────────────────────────────────────────
  readonly name: string;
  readonly state: string;
  readonly type: "public" | "private";
  readonly size: "small" | "medium" | "large";
  readonly setting: "urban" | "suburban" | "rural";
  readonly acceptanceRate: number; // 0-100
  readonly avgGPAUW: number; // unweighted (4.0 scale, college recalculated)
  readonly avgGPAW: number; // weighted (5.0 scale, with AP/Honors bonuses)
  readonly sat25: number;
  readonly sat75: number;
  readonly act25: number;
  readonly act75: number;
  readonly testPolicy: "required" | "optional" | "blind";
  readonly topMajors: string[];
  readonly competitiveMajors: string[]; // majors harder to get into at this school
  readonly tags: string[]; // e.g. ["selective", "tech", "research", "collaborative"]
  readonly usNewsRank: number | null;
  readonly region: string;
  // UNDO [application-plan]: remove this field.
  readonly applicationOptions?: readonly ApplicationOption[];

  // ── Extended (all optional — used by comparison engine) ──────────────────

  // Location
  readonly city?: string;
  readonly selectivityTier?: "ultra" | "high" | "medium" | "low";

  // Academics
  readonly academicIntensity?: Tier3;
  readonly researchStrength?: Tier3;
  readonly internshipStrength?: Tier3;
  readonly knownFor?: readonly string[];        // e.g. ["Core Curriculum", "Entrepreneurship"]
  readonly flexibility?: Tier3;                 // ease of exploring across disciplines
  readonly coreCurriculum?: "open" | "moderate" | "structured"; // open = pick anything, structured = strong core reqs

  // Career / Outcomes
  readonly topIndustries?: readonly string[];    // e.g. ["Finance", "Consulting", "Tech"]
  readonly careerPipelines?: readonly string[];  // e.g. ["Wall Street", "Big Tech", "Med School"]
  readonly gradSchoolStrength?: Tier3;

  // Campus / Life
  readonly vibeTags?: readonly string[];         // e.g. ["collaborative", "preprofessional", "artsy"]
  readonly socialScene?: Tier3;
  readonly greekLifePresence?: Tier3;
  readonly sportsCulture?: Tier3;
  readonly campusCohesion?: Tier3;

  // Location extras
  readonly proximityToCity?: Tier3;
  readonly weather?: string;                     // e.g. "Cold winters", "Year-round mild"

  // Cost
  readonly costTier?: Tier3;
  readonly strongFinancialAid?: boolean;
  readonly strongMeritAid?: boolean;

  // Demographics
  readonly diversityIndex?: Tier3;
  readonly percentInternational?: number | null; // 0-100, null if unavailable

  // Detailed demographics — percentage breakdowns (each 0-100, should sum ~100)
  readonly demographics?: DemographicBreakdown;
  readonly genderBreakdown?: GenderBreakdown;
  readonly undergradPopulation?: number;
  readonly inStatePercent?: number;   // 0-100, primarily meaningful for publics

  // Search aliases — common abbreviations and nicknames so users can search
  // by "UPenn", "UMich", "Cal", etc. Not displayed, only used for matching.
  readonly aliases?: readonly string[];
}

export interface DemographicBreakdown {
  readonly white?: number;
  readonly asian?: number;
  readonly hispanic?: number;
  readonly black?: number;
  readonly multiracial?: number;
  readonly international?: number;
  readonly other?: number;
}

export interface GenderBreakdown {
  readonly male?: number;
  readonly female?: number;
}

export type Classification = "unlikely" | "reach" | "target" | "likely" | "safety";

export interface ClassifiedCollege {
  readonly college: College;
  readonly classification: Classification;
  readonly reason: string;
  readonly fitScore: number; // 0-100
}

export type ChanceBand = "very-low" | "low" | "possible" | "competitive" | "strong";

export interface ChanceResult {
  readonly band: ChanceBand;
  readonly bandLabel: string;
  readonly explanation: string;
  readonly strengths: string[];
  readonly weaknesses: string[];
  readonly score: number; // internal 0-100
  readonly confidence: "low" | "medium" | "high";
}

export interface CollegeFilters {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  actScience: string; // optional, not in composite
  major: string;
  region: string;
  size: string;
  setting: string;
  type: string;
  acceptanceRateMin: string;
  acceptanceRateMax: string;
  testPolicy: string;
  essayCommonApp: string; // 0-100
  essayVspice: string; // 0-4
}

export type ECBandInput = "" | "limited" | "developing" | "solid" | "strong" | "exceptional";

export interface ChanceInputs {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  actScience: string; // optional, not in composite
  apScores: { subject: string; score: 1 | 2 | 3 | 4 | 5 }[]; // optional AP exam scores
  rigor: "low" | "medium" | "high";
  major: string;
  ecBand: ECBandInput; // 5-band scale from EC Evaluator
  essayCommonApp: string; // 0-100
  essayVspice: string; // 0-4 (composite)
  collegeIndex: number | null;
  // UNDO [application-plan]: remove this field. Default "RD" means removing
  // it and deleting the reset-on-college-change effect restores the original
  // behavior exactly.
  applicationPlan: ApplicationPlan;
}

export const EMPTY_FILTERS: CollegeFilters = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  actScience: "",
  major: "",
  region: "any",
  size: "any",
  setting: "any",
  type: "any",
  acceptanceRateMin: "",
  acceptanceRateMax: "",
  testPolicy: "any",
  essayCommonApp: "",
  essayVspice: "",
};

export const EMPTY_CHANCE_INPUTS: ChanceInputs = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  actScience: "",
  apScores: [],
  rigor: "medium",
  major: "",
  ecBand: "",
  essayCommonApp: "",
  essayVspice: "",
  collegeIndex: null,
  // UNDO [application-plan]: remove this line.
  applicationPlan: "RD",
};

export const REGIONS = [
  "any", "Northeast", "Southeast", "Midwest", "Southwest", "West",
] as const;

export const MAJORS = [
  "Any", "Business", "Computer Science", "Engineering", "Biology",
  "Psychology", "Economics", "Political Science", "Communications",
  "Nursing", "Education", "English", "Mathematics", "Chemistry",
  "Physics", "History", "Art", "Music", "Pre-Med", "Pre-Law",
] as const;

// ── Pinned Colleges ────────────────────────────────────────────────────────
// Users pin schools they're actually considering. The Strategy Engine reads
// this list as its primary source for school-list analysis.
export interface PinnedCollege {
  readonly name: string;         // matches College.name exactly
  readonly pinnedAt: number;     // epoch ms — for stable ordering
  readonly applicationPlan?: ApplicationPlan; // optional user override
}

export const PINNED_COLLEGES_KEY = "admitedge-pinned-colleges";
