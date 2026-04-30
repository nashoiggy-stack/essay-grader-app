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

  // ── CDS-authoritative fields ─────────────────────────────────────────────
  // Sourced from each college's Common Data Set PDF via scripts/cds-sync.ts.
  // When present, these override the hand-curated estimates for the same
  // concept (e.g. acceptanceRate, pctTopTenClass).
  readonly yield?: number;                        // 0-100, % of admitted who enrolled (CDS C1)
  readonly edAdmitRate?: number;                  // 0-100, Early Decision admit rate (CDS C21)
  readonly eaAdmitRate?: number;                  // 0-100, Early Action admit rate (CDS C21)
  readonly regularDecisionAdmitRate?: number;     // 0-100, RD-only admit rate (CDS C1/C21 derived)
  readonly top10HSPercent?: number;               // 0-100, CDS-reported top 10% of HS class (CDS C11)
  readonly avgGPACDS?: number;                    // CDS-reported average HS GPA of enrolled freshmen (CDS C12)
  // Trailing year of the source CDS academic year (e.g. "2024-2025" → 2025).
  // Populated for CDS-sourced schools by the merge in src/data/colleges.ts.
  // Internal-only: feeds the chance model's confidence calculation
  // (hasCds in admissions.ts). Not surfaced as a user-facing flag.
  readonly dataYear?: number;

  // ── Hook fields (W2) ──────────────────────────────────────────────────────
  // Set in src/data/hook-multipliers.ts and merged by src/data/colleges.ts.
  //
  // - legacyConsidered: explicit `false` for schools that publicly state they
  //   do not consider legacy (MIT, Caltech, all UCs, JHU, Amherst, Tufts).
  //   Undefined = treat as legacy considered (the historical default at most
  //   private US universities, though SFFA-era policy is still in flux).
  //   The chance model gates any future legacy bump on this field.
  // - yieldProtected: `true` for schools with documented yield-protective
  //   admissions behavior (waitlisting over-qualified RD applicants, weighting
  //   demonstrated interest). The chance model caps the top-quartile
  //   multiplier at 1.0x for these schools; CollegeCard surfaces the note
  //   "May consider demonstrated interest".
  readonly legacyConsidered?: boolean;
  readonly yieldProtected?: boolean;

  // ── Two-tier routing (final calibration) ─────────────────────────────────
  // The chance model has two distinct pathways. Algorithmic uses the standard
  // multiplier stack with caps. Holistic-elite uses a fit-multiplier model
  // because at the top-20 level, stats stop predicting outcomes past the
  // academic threshold and institutional-fit factors dominate. Default is
  // 'algorithmic' for any school not explicitly tagged 'holistic-elite'.
  //
  // Holistic-elite cohort: all 8 Ivies, Stanford, MIT, Caltech, Duke,
  // Northwestern, JHU, UChicago, Notre Dame, Vanderbilt, Rice, Williams,
  // Amherst, Pomona, Swarthmore.
  readonly admissionsTier?: "algorithmic" | "holistic-elite";

  // Differentiates how the school evaluates applicants in the algorithmic
  // tier. Stats-driven publics (UF, all UCs, UMich, UVA, etc.) cap chance
  // generously in the 15-25% admit-rate bracket because their decisions are
  // largely formulaic. Holistic privates cap conservatively because soft
  // factors swing more weight. Default 'holistic'.
  readonly admissionsType?: "stats-driven" | "holistic" | "mixed";

  // ── Program-specific admit rates (W4 structural — empty in Feature 1) ────
  // When populated, the chance model surfaces low-confidence for users whose
  // chosen major matches a known competitive program. Per-program data
  // sourcing is its own workstream.
  readonly programs?: readonly {
    readonly name: string;
    readonly acceptanceRate: number;
    readonly year?: number;
  }[];

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

  // Structured qualitative: strict classifications + descriptions.
  // Classifications are the source of truth for tag labels.
  // Descriptions are 1-2 sentences for expanded detail.
  readonly qualitative?: QualitativeClassifications;
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

// ── Strict qualitative classifications ───────────────────────────────────────
//
// Each classification uses a fixed enum with a real-world definition.
// Tags are derived FROM these enums, never guessed from Tier3 values.
// Descriptions are 1-2 sentences, school-specific, never generic filler.

// LOCATION: based on actual geography, NOT distance to NYC
export type LocationType =
  | "urban"          // integrated with a major metro (Columbia, NYU, BU)
  | "suburban"       // near a major city, 30-60 min access (Princeton, Villanova)
  | "college-town"   // town dominated by the university (Ann Arbor, Chapel Hill)
  | "rural";         // isolated, low population, limited access (Dartmouth, Cornell)

// COLLABORATION style
export type CollaborationStyle =
  | "collaborative"  // group-oriented, shared work culture (MIT psets, Rice colleges)
  | "mixed"          // varies by major or department
  | "competitive";   // grade-conscious, high comparison (pre-med heavy, curve-graded)

// STUDENT archetype
export type StudentArchetype =
  | "preprofessional" // career-focused: finance, consulting, tech pipelines
  | "intellectual"    // theory-driven, discussion-heavy, academia-leaning
  | "balanced"        // genuine mix (only use when truly neither-dominant)
  | "entrepreneurial" // startup/innovation-focused
  | "service-oriented"; // mission/community driven

// ACADEMIC VIBE
export type AcademicVibe =
  | "intense"        // heavy workload, high pressure, demanding
  | "rigorous"       // challenging but manageable, well-supported
  | "moderate"       // standard college workload
  | "relaxed";       // lighter workload, flexible pacing

// GRADE CULTURE
export type GradeCulture =
  | "deflation"      // harder grading (Princeton, MIT, Berkeley)
  | "neutral"        // standard grading
  | "inflation";     // easier grading (Harvard, Stanford, Brown)

// PARTY / SOCIAL SCENE
export type SocialSceneType =
  | "high"           // frequent large events, dominant social activity
  | "moderate"       // active but not dominant
  | "low";           // limited or niche, intellectual/small-group focused

// GREEK LIFE role
export type GreekLifeRole =
  | "dominant"       // major part of social structure (>25%)
  | "present"        // exists but not dominant (10-25%)
  | "minimal";       // small role (<10%)

// SOCIAL STYLE
export type SocialStyle =
  | "campus-centered"  // activity mostly on campus
  | "city-integrated"  // social life heavily off-campus
  | "mixed";           // blend of both

// INTELLECTUAL CLIMATE
export type IntellectualClimate =
  | "discussion-heavy"      // seminars, debate, humanities-leaning
  | "research-heavy"        // labs, projects, STEM-leaning
  | "preprofessional-focused" // career prep dominates intellectual life
  | "balanced";             // genuine mix

export interface CampusDetails {
  readonly socialScene?: string;
  readonly greekLife?: string;
  readonly sportsCulture?: string;
  readonly housing?: string;
  readonly environment?: string;
}

export interface CultureDetails {
  readonly vibe?: string;
  readonly collaboration?: string;
  readonly studentType?: string;
  readonly academicCulture?: string;
}

export interface LocationDetails {
  readonly cityIntegration?: string;
  readonly internshipAccess?: string;
  readonly surroundings?: string;
}

// ── Structured classifications (used for tag derivation) ────────────────────
// These live on College and are the SOURCE OF TRUTH for tag labels.
// The UI reads these directly — never derives tags from Tier3 values.

export interface QualitativeClassifications {
  readonly locationType: LocationType;
  readonly collaborationStyle: CollaborationStyle;
  readonly studentArchetype: StudentArchetype;
  readonly academicVibe: AcademicVibe;
  readonly gradeCulture: GradeCulture;
  readonly socialSceneType: SocialSceneType;
  readonly greekLifeRole: GreekLifeRole;
  readonly socialStyle: SocialStyle;
  readonly intellectualClimate: IntellectualClimate;
}

// Six-tier classification. "insufficient" added (Finding 4.9) for the
// no-metrics case so the chance model never fakes a tier when it has no
// data to ground the call.
export type Classification = "unlikely" | "reach" | "target" | "likely" | "safety" | "insufficient";

// Confidence tier for a chance estimate. Three inputs feed it:
//   1. Number of stat metrics provided (GPA, test, rigor)
//   2. Whether profile data is reasonably complete (essay, EC band)
//   3. Presence of any CDS field on the school (per SPEC W4)
export type ConfidenceTier = "high" | "medium" | "low";

// Chance range expresses uncertainty as an integer percent band. The
// midpoint is what we display and rank by; the band width is what we use
// to communicate "low confidence". Both ends are inclusive integer percents
// in [0, 100].
export interface ChanceRange {
  readonly low: number;
  readonly mid: number;
  readonly high: number;
}

export type MajorMatchLevel = "strong" | "decent" | "none";

export interface ClassifiedCollege {
  readonly college: College;
  readonly classification: Classification;
  readonly reason: string;
  // Replaces the 0-100 fitScore. Midpoint drives sort and tier assignment;
  // low/high anchor the displayed range and the low-confidence visual band.
  readonly chance: ChanceRange;
  readonly confidence: ConfidenceTier;
  // Set when the school is yield-protective AND the applicant is top-quartile
  // in RD without a demonstrated-interest signal. Drives the CollegeCard
  // "May consider demonstrated interest" note.
  readonly yieldProtectedNote?: boolean;
  // Set when the chance value was derived from a fallback (ED rate inferred
  // from overall × 2.5; EA rate from overall × 1.15) rather than a published
  // school-specific rate. Surfaces a "based on overall trends" badge.
  readonly usedFallback?: "ed" | "ea" | null;
  // Set when the school's data is older than 2 academic cycles (or missing).
  // Internal-only: still emitted by computeAdmissionChance and threaded
  // through ClassifiedCollege so confidence-band logic can read it. The
  // user-facing "data may be stale" pill was removed (fired on most schools
  // and gave users no actionable signal).
  readonly stale?: boolean;
  // Set when the recruited-athlete pathway fired. The chance/range represent
  // the published 70-85% band, and the note overrides normal stat-band
  // reasoning.
  readonly recruitedAthletePathway?: boolean;
  // Multiplier-stack trace for the "See the breakdown" panel on CollegeCard.
  // Populated by computeAdmissionChance — see src/lib/admissions.ts.
  readonly breakdown?: import("./admissions").ChanceBreakdown;
  // Set when the user has picked a major or interest. "strong" = this
  // school is known for it; "decent" = adjacent signal (career pipeline,
  // industry, or token overlap); "none" = no signal or no query.
  readonly majorMatch?: MajorMatchLevel;
  // Graded 0-100 version of majorMatch. Smoother signal than the tier
  // bucket — lets us distinguish Stanford-for-CS from a lower-ranked
  // school that also lists CS. Absent when no major/interest is set.
  readonly majorFitScore?: number;
  // Deterministic 1-line rationale for why the match fired ("Ranked #5 in
  // CS; strong Google/Meta pipeline"). Empty string / undefined when no
  // signals fired. Populated by buildMatchReason in major-match.ts.
  readonly matchReason?: string;
  // Per-active-selection fit scores. Used by the card to render a per-major
  // flag and the dual-score line (best · avg). Only includes entries from
  // the active majors/interests, not the full saved list. Empty when no
  // major or interest is active.
  readonly majorFitBreakdown?: readonly {
    readonly name: string;                          // major name or interest text
    readonly kind: "major" | "interest";
    readonly score: number;                          // 0-100
    readonly level: MajorMatchLevel;
  }[];
  // Which active selection produced the highest score (drives the per-card
  // flag label). Null when no breakdown entry rose above "none".
  readonly bestMatchMajor?: string | null;
}

// /chances result shape — five-tier classification (plus "insufficient")
// shared with /colleges and /strategy. The legacy ChanceBand enum
// ("very-low" / "low" / "possible" / "competitive" / "strong") is removed
// because absolute labels were misleading at high-selectivity schools
// (12% chance at Yale read as "very low" even though it's 2-3x baseline).
//
// `breakdown` is the multiplier-stack trace and `whatIfs` are the recomputed
// alt-scenarios. Both are emitted by computeAdmissionChance + computeWhatIfs
// in src/lib/admissions.ts and rendered by src/components/BreakdownPanel.tsx.
//
// Imported as `unknown`-typed objects here to avoid a circular import; the
// component imports the concrete types from admissions.ts directly.
export interface ChanceResult {
  readonly classification: Classification;
  readonly tierLabel: string;
  readonly chance: ChanceRange;        // mid is what we display; low-high is the band
  readonly baseAcceptanceRate: number; // school's overall AR — for "Nx typical" annotation
  readonly multiple: number;           // chance.mid / baseAcceptanceRate; UI shows when ≥ 1.5
  readonly explanation: string;
  readonly strengths: string[];
  readonly weaknesses: string[];
  // Neutral CTAs for inputs the user hasn't provided yet (e.g. AP scores).
  // Surfaced as a separate UI section so absence of data isn't styled as a
  // weakness/penalty. Each entry is { label, href }.
  readonly missingDataHints?: readonly { label: string; href: string }[];
  readonly confidence: ConfidenceTier;
  readonly breakdown?: import("./admissions").ChanceBreakdown;
  readonly whatIfs?: readonly import("./admissions").WhatIfScenario[];
}

export interface CollegeFilters {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  actScience: string; // optional, not in composite
  // Multi-select majors. `intendedMajors` is the saved list (chips visible
  // in the UI); `activeMajors` is the subset currently filtering. The user
  // can save 3 majors but filter on 1 without losing the others.
  // Cap: 5 entries. Empty array = no major preference (no badges).
  intendedMajors: readonly string[];
  activeMajors: readonly string[];
  // Free-text interests, same saved/active split. Each entry matches
  // fuzzily against knownFor / careerPipelines / topIndustries.
  intendedInterests: readonly string[];
  activeInterests: readonly string[];
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
  intendedMajors: [],
  activeMajors: [],
  intendedInterests: [],
  activeInterests: [],
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

// ── Majors ───────────────────────────────────────────────────────────────
// Grouped for the <optgroup>-rendered dropdown. Flat MAJORS below is the
// authoritative list used by filters, matchers, and validators.
//
// Adding a major here:
//   1. Append it to the appropriate group below (keep groups alphabetical)
//   2. If it's a common or popular major, add a RELATED_MAJORS entry in
//      src/lib/major-match.ts so the soft-match still fires when the user
//      picks a specialty but the school only lists the parent field
//      (e.g. "Biochemistry" → schools listing "Chemistry" or "Biology")

export interface MajorGroup {
  readonly label: string;
  readonly majors: readonly string[];
}

export const MAJOR_GROUPS: readonly MajorGroup[] = [
  {
    label: "General",
    majors: ["Any", "Undecided"],
  },
  {
    label: "Business & Economics",
    majors: [
      "Business", "Accounting", "Finance", "Marketing", "Management",
      "Entrepreneurship", "International Business", "Supply Chain Management",
      "Hospitality Management", "Real Estate", "Actuarial Science",
      "Economics", "Econometrics",
    ],
  },
  {
    label: "Computing & Technology",
    majors: [
      "Computer Science", "Software Engineering", "Information Systems",
      "Information Technology", "Data Science", "Artificial Intelligence",
      "Cybersecurity", "Human-Computer Interaction", "Game Design",
    ],
  },
  {
    label: "Engineering",
    majors: [
      "Engineering", "Mechanical Engineering", "Electrical Engineering",
      "Civil Engineering", "Chemical Engineering", "Biomedical Engineering",
      "Aerospace Engineering", "Industrial Engineering",
      "Environmental Engineering", "Materials Science", "Nuclear Engineering",
      "Computer Engineering", "Robotics",
    ],
  },
  {
    label: "Life Sciences",
    majors: [
      "Biology", "Biochemistry", "Neuroscience", "Molecular Biology",
      "Genetics", "Microbiology", "Biotechnology", "Ecology",
      "Marine Biology", "Environmental Science", "Zoology", "Botany",
    ],
  },
  {
    label: "Physical Sciences & Math",
    majors: [
      "Chemistry", "Physics", "Astronomy", "Astrophysics", "Earth Science",
      "Geology", "Oceanography", "Mathematics", "Applied Mathematics",
      "Statistics",
    ],
  },
  {
    label: "Health & Pre-Professional",
    majors: [
      "Pre-Med", "Pre-Dental", "Pre-Vet", "Pre-Physician Assistant",
      "Pre-Pharmacy", "Pre-Law", "Nursing", "Public Health", "Kinesiology",
      "Nutrition", "Athletic Training", "Occupational Therapy",
      "Physical Therapy", "Speech Pathology", "Health Sciences",
    ],
  },
  {
    label: "Social Sciences",
    majors: [
      "Psychology", "Cognitive Science", "Sociology", "Anthropology",
      "Political Science", "International Relations", "Public Policy",
      "Public Administration", "Criminology", "Criminal Justice",
      "Geography", "Urban Planning", "Social Work",
    ],
  },
  {
    label: "Humanities",
    majors: [
      "English", "Creative Writing", "Comparative Literature", "Linguistics",
      "History", "Classics", "Philosophy", "Religious Studies",
      "Area Studies", "Gender Studies",
    ],
  },
  {
    label: "Arts & Design",
    majors: [
      "Art", "Fine Arts", "Art History", "Graphic Design",
      "Industrial Design", "Interior Design", "Fashion Design",
      "Photography", "Animation", "Music", "Music Performance",
      "Music Composition", "Theater", "Dance", "Film Studies",
      "Architecture",
    ],
  },
  {
    label: "Communications & Media",
    majors: [
      "Communications", "Journalism", "Media Studies",
      "Public Relations", "Advertising", "Broadcast Journalism",
    ],
  },
  {
    label: "Education",
    majors: [
      "Education", "Early Childhood Education", "Elementary Education",
      "Secondary Education", "Special Education", "Educational Psychology",
    ],
  },
  {
    label: "Agriculture & Environment",
    majors: [
      "Agriculture", "Forestry", "Wildlife Biology",
      "Sustainability Studies", "Food Science",
    ],
  },
];

// Authoritative flat list — preserves the group order so filter defaults and
// validators see a stable array. `as unknown as readonly string[]` because
// the grouped definition is deeply readonly.
export const MAJORS: readonly string[] = MAJOR_GROUPS.flatMap((g) => [...g.majors]);

// ── Pinned Colleges ────────────────────────────────────────────────────────
// Users pin schools they're actually considering. The Strategy Engine reads
// this list as its primary source for school-list analysis.
export interface PinnedCollege {
  readonly name: string;         // matches College.name exactly
  readonly pinnedAt: number;     // epoch ms — for stable ordering
  readonly applicationPlan?: ApplicationPlan; // optional user override
}

export const PINNED_COLLEGES_KEY = "admitedge-pinned-colleges";
