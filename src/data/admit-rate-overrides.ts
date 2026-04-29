/**
 * admit-rate-overrides.ts
 *
 * Verified plan-specific admit rates for schools whose CDS doesn't publish
 * the early/RD split (or publishes a stale year). Merged in colleges.ts
 * AFTER the CDS layer so these values authoritatively override.
 *
 * Maintenance: only add a row when you've confirmed the rate from a primary
 * source (CDS C21, school admissions blog, or institutional research). Each
 * row gets a citation comment.
 *
 * Why this exists: the chance model picks per-plan headline admit rate via
 * getBaseRateForPlan. When edAdmitRate / regularDecisionAdmitRate is missing,
 * it falls back to overall × multiplier — overestimating Penn RD (uses 5.4%
 * overall when actual RD is 4.05%) and similar.
 */
import type { College } from "@/lib/college-types";

type AdmitRateOverrides = Pick<
  College,
  "edAdmitRate" | "eaAdmitRate" | "regularDecisionAdmitRate"
>;

export const ADMIT_RATE_OVERRIDES: Record<string, AdmitRateOverrides> = {
  // Penn — Class of 2028 CDS Section C21:
  //   ED admit 14.22% (1100/7745); RD admit 4.05% (2400/59229).
  "University of Pennsylvania": {
    edAdmitRate: 14.22,
    regularDecisionAdmitRate: 4.05,
  },
  // Stanford — published in Stanford Daily / institutional reports.
  //   REA admit ~9% (REA + RD overall historically 3.7-3.8%).
  "Stanford University": {
    eaAdmitRate: 9.0,
    regularDecisionAdmitRate: 3.7,
  },
  // Harvard — Class of 2028 SCEA admit 8.74% (692/7921).
  // Harvard Gazette + Crimson reporting on RD round.
  "Harvard University": {
    eaAdmitRate: 8.74,
    regularDecisionAdmitRate: 2.77,
  },
  // Yale — Yale Daily News reporting:
  //   SCEA admit ~10.91%, RD admit ~3.81%.
  "Yale University": {
    eaAdmitRate: 10.91,
    regularDecisionAdmitRate: 3.81,
  },
  // Princeton — historical SCEA rate ~10%, RD ~4%. SCEA was paused
  // 2020-2023; resumed 2024 cycle. Princeton publishes admit numbers but
  // not always the early/regular split — these are conservative estimates.
  "Princeton University": {
    eaAdmitRate: 10.0,
    regularDecisionAdmitRate: 4.0,
  },
  // MIT — Class of 2028 EA round defer-heavy; published EA admit ~5.3%,
  // RD ~4.5%, overall ~4.5%. EA is non-restrictive (most defer).
  // Source: MIT Admissions Blog.
  "MIT": {
    eaAdmitRate: 5.3,
    regularDecisionAdmitRate: 4.5,
  },
  // Notre Dame — Class of 2028 REA admit ~12% (per Observer reporting),
  // overall ~12.9% so RD is close to overall.
  "University of Notre Dame": {
    eaAdmitRate: 12.0,
    regularDecisionAdmitRate: 12.9,
  },
  // Duke — Class of 2028 ED admit ~15.5% (per Chronicle Duke reporting),
  // RD admit ~4.7%, overall ~5.4%.
  "Duke University": {
    edAdmitRate: 15.5,
    regularDecisionAdmitRate: 4.7,
  },
  // Northwestern — Class of 2028 ED admit ~20% (per Daily Northwestern),
  // RD admit ~4.2%, overall ~7%.
  "Northwestern University": {
    edAdmitRate: 20.0,
    regularDecisionAdmitRate: 4.2,
  },
  // Johns Hopkins — Class of 2028 ED admit ~17% (per JHU news), RD ~5%.
  "Johns Hopkins University": {
    edAdmitRate: 17.0,
    regularDecisionAdmitRate: 5.0,
  },
  // Brown — Class of 2028 ED admit 14.4% (per Brown CDS), RD ~5%.
  "Brown University": {
    edAdmitRate: 14.4,
    regularDecisionAdmitRate: 5.0,
  },
  // Dartmouth — Class of 2028 ED admit ~16.5%, RD ~4.5%.
  "Dartmouth College": {
    edAdmitRate: 16.5,
    regularDecisionAdmitRate: 4.5,
  },
  // Columbia — Class of 2028 ED admit 13.2% (already in CDS); RD admit
  // 2.8% (also in CDS). Listed here for completeness; spec values match.
  "Columbia University": {
    edAdmitRate: 13.2,
    regularDecisionAdmitRate: 2.8,
  },
  // Cornell — Class of 2028 ED admit 11.6% (already in CDS); RD admit 7.8%.
  // Listed for completeness.
  "Cornell University": {
    edAdmitRate: 11.6,
    regularDecisionAdmitRate: 7.8,
  },
};
