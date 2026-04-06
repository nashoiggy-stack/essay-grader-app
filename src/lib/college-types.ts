export interface College {
  readonly name: string;
  readonly state: string;
  readonly type: "public" | "private";
  readonly size: "small" | "medium" | "large";
  readonly setting: "urban" | "suburban" | "rural";
  readonly acceptanceRate: number; // 0-100
  readonly avgGPA: number;
  readonly satRange: [number, number]; // [25th, 75th]
  readonly actRange: [number, number]; // [25th, 75th]
  readonly testPolicy: "required" | "optional" | "blind";
  readonly topMajors: string[];
  readonly usNewsRank: number | null; // null if unranked
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
}

export interface CollegeFilters {
  gpa: string;
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
  gpa: string;
  sat: string;
  act: string;
  rigor: "low" | "medium" | "high";
  major: string;
  ecStrength: "low" | "medium" | "high";
  essayStrength: "low" | "medium" | "high";
  collegeIndex: number | null;
}

export const EMPTY_FILTERS: CollegeFilters = {
  gpa: "",
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
  gpa: "",
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
