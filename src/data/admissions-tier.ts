/**
 * admissions-tier.ts
 *
 * Tags each College with admissionsTier (algorithmic vs holistic-elite) and
 * admissionsType (stats-driven vs holistic vs mixed). Merged into the College
 * objects by the layer chain in src/data/colleges.ts.
 *
 * Mark: tier assignments come from the spec. The 22-school holistic-elite
 * cohort is canonical (all Ivies + Stanford/MIT/Caltech + Duke/Northwestern/
 * JHU/UChicago + Notre Dame/Vanderbilt/Rice + Williams/Amherst/Pomona/
 * Swarthmore). The stats-driven publics list is canonical: state flagships
 * with formulaic admissions (UCs, UMich, UVA, UNC, Georgia Tech, etc.).
 *
 * Maintenance: when a school is added to colleges.ts, decide explicitly
 * whether it belongs to one of these sets. Default 'algorithmic' + 'holistic'
 * is fine for most privates and any school not on these lists.
 */

export const HOLISTIC_ELITE_SCHOOLS: ReadonlySet<string> = new Set([
  // Ivies (all 8)
  "Harvard University",
  "Yale University",
  "Princeton University",
  "Columbia University",
  "University of Pennsylvania",
  "Brown University",
  "Dartmouth College",
  "Cornell University",
  // Stanford/MIT/Caltech
  "Stanford University",
  "MIT",
  "Caltech",
  // Top private universities
  "Duke University",
  "Northwestern University",
  "Johns Hopkins University",
  "University of Chicago",
  "University of Notre Dame",
  "Vanderbilt University",
  "Rice University",
  // Top liberal arts
  "Williams College",
  "Amherst College",
  "Pomona College",
  "Swarthmore College",
]);

// Stats-driven public flagships. Decisions at these schools are largely
// formulaic — strong GPA + test reads as 'likely' rather than 'target'. The
// 15-25% admit-rate cap split treats them differently in the algorithmic
// chance model.
export const STATS_DRIVEN_PUBLICS: ReadonlySet<string> = new Set([
  "University of Florida",
  "Florida State University",
  "University of Central Florida",
  // All UC schools
  "UC Berkeley",
  "UCLA",
  "UC San Diego",
  "UC Davis",
  "UC Irvine",
  "UC Santa Barbara",
  "UC Santa Cruz",
  "UC Riverside",
  "UC Merced",
  // Other major publics
  "University of Michigan",
  "University of Virginia",
  "UNC Chapel Hill",
  "UT Austin",
  "Georgia Tech",
  "Penn State",
  "Virginia Tech",
  "Ohio State University",
  "Michigan State University",
  "University of Wisconsin-Madison",
  "UIUC",
  "Purdue University",
  "Texas A&M University",
]);

export function admissionsTierForSchool(
  name: string,
): "algorithmic" | "holistic-elite" {
  return HOLISTIC_ELITE_SCHOOLS.has(name) ? "holistic-elite" : "algorithmic";
}

export function admissionsTypeForSchool(
  name: string,
): "stats-driven" | "holistic" {
  return STATS_DRIVEN_PUBLICS.has(name) ? "stats-driven" : "holistic";
}
