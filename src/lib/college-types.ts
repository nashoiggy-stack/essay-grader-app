export interface College {
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
}

export type Classification = "reach" | "target" | "safety";

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
  major: string;
  region: string;
  size: string;
  setting: string;
  type: string;
  acceptanceRateMin: string;
  acceptanceRateMax: string;
  testPolicy: string;
}

export interface ChanceInputs {
  gpaUW: string;
  gpaW: string;
  sat: string;
  act: string;
  rigor: "low" | "medium" | "high";
  major: string;
  ecStrength: "low" | "medium" | "high";
  essayStrength: "low" | "medium" | "high";
  collegeIndex: number | null;
}

export const EMPTY_FILTERS: CollegeFilters = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  major: "",
  region: "any",
  size: "any",
  setting: "any",
  type: "any",
  acceptanceRateMin: "",
  acceptanceRateMax: "",
  testPolicy: "any",
};

export const EMPTY_CHANCE_INPUTS: ChanceInputs = {
  gpaUW: "",
  gpaW: "",
  sat: "",
  act: "",
  rigor: "medium",
  major: "",
  ecStrength: "medium",
  essayStrength: "medium",
  collegeIndex: null,
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
