/**
 * admissions-tier.ts
 *
 * Tags each College with admissionsTier (algorithmic vs holistic-elite).
 * Merged into the College objects by the layer chain in src/data/colleges.ts.
 *
 * The earlier `admissionsType` axis (stats-driven vs holistic) and its
 * STATS_DRIVEN_PUBLICS list were removed: every school now uses the
 * single holistic cap table in stat-band-multipliers.ts. The 22-school
 * holistic-elite cohort below remains — it routes to a different math
 * pathway (computeHolisticEliteChance), not a cap-bracket override.
 *
 * Maintenance: when a school is added to colleges.ts, decide whether it
 * belongs to the holistic-elite set. Default 'algorithmic' is correct
 * for most privates and any school not on this list.
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

export function admissionsTierForSchool(
  name: string,
): "algorithmic" | "holistic-elite" {
  return HOLISTIC_ELITE_SCHOOLS.has(name) ? "holistic-elite" : "algorithmic";
}
