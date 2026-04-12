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

  // Academics — quantitative first, tier fallback only when no number exists
  readonly academicIntensity?: Tier3;           // fallback: no clean numeric proxy
  readonly researchStrength?: Tier3;            // fallback: no clean numeric proxy
  readonly internshipStrength?: Tier3;          // fallback: no clean numeric proxy
  readonly knownFor?: readonly string[];
  readonly flexibility?: Tier3;                 // fallback: no clean numeric proxy
  readonly coreCurriculum?: "open" | "moderate" | "structured";
  readonly avgGPARange?: string;                // e.g. "3.8-4.0" — display string
  readonly pctTopTenClass?: number;             // 0-100, % of freshmen from top 10% of HS class
  readonly studentFacultyRatio?: number;        // e.g. 6 means 6:1
  readonly fourYearGradRate?: number;           // 0-100

  // Career / Outcomes — quantitative
  readonly topIndustries?: readonly string[];
  readonly careerPipelines?: readonly string[];
  readonly gradSchoolStrength?: Tier3;          // fallback: hard to quantify
  readonly avgStartingSalary?: number;          // USD, approximate median for all majors
  readonly pctEmployed6Mo?: number;             // 0-100, % employed/grad school within 6 months
  readonly medianEarnings10Yr?: number;         // USD, College Scorecard 10-year median

  // Campus / Life — tier retained internally, descriptions are user-facing
  readonly vibeTags?: readonly string[];
  readonly socialScene?: Tier3;
  readonly greekLifePresence?: Tier3;
  readonly greekLifePct?: number;
  readonly sportsCulture?: Tier3;
  readonly campusCohesion?: Tier3;

  // Structured qualitative descriptions — 1-2 sentences, school-specific.
  // These replace vague tier labels as the primary UI display.
  readonly campusDetails?: CampusDetails;
  readonly cultureDetails?: CultureDetails;
  readonly locationDetails?: LocationDetails;

  // Location — quantitative where possible
  readonly proximityToCity?: Tier3;
  readonly distanceToCityMiles?: number;
  readonly weather?: string;

  // Cost — quantitative
  readonly costTier?: Tier3;                    // kept as fallback label
  readonly annualCostEstimate?: number;         // USD, sticker price (before aid)
  readonly avgNetPrice?: number;                // USD, average net price after aid
  readonly strongFinancialAid?: boolean;
  readonly strongMeritAid?: boolean;

  // Demographics
  readonly diversityIndex?: Tier3;
  readonly percentInternational?: number | null;

  // Detailed demographics
  readonly demographics?: DemographicBreakdown;
  readonly genderBreakdown?: GenderBreakdown;
  readonly undergradPopulation?: number;
  readonly inStatePercent?: number;

  // Search aliases
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

// ── Structured qualitative descriptions ─────────────────────────────────────
// Each field is 1-2 sentences, school-specific, never generic filler.
// These are the primary user-facing display; tier labels (Tier3) are kept
// internally for comparison logic but are NOT the main UI output.

export interface CampusDetails {
  readonly socialScene?: string;     // what social life actually looks/feels like
  readonly greekLife?: string;        // role of Greek life on campus
  readonly sportsCulture?: string;    // how central athletics are to daily life
  readonly housing?: string;          // residential experience
  readonly environment?: string;      // physical campus + surrounding area feel
}

export interface CultureDetails {
  readonly vibe?: string;             // overall atmosphere in 1-2 sentences
  readonly collaboration?: string;    // how students work together (or compete)
  readonly studentType?: string;      // who attends — archetype description
  readonly academicCulture?: string;  // attitude toward coursework + intellectual life
}

export interface LocationDetails {
  readonly cityIntegration?: string;  // how the school connects to its city
  readonly internshipAccess?: string; // practical access to career opportunities
  readonly surroundings?: string;     // what's around campus
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
