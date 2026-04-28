// Hook multipliers, exemption lists, and recruited-athlete handling.
//
// Citations are inline per school. The chance model in src/lib/admissions.ts
// (W4) reads these to gate or apply hook adjustments. Math for legacy and
// first-gen is intentionally deferred — only structural data lives here in
// Feature 1.
//
// Re-verify each school against its admissions website before public launch;
// post-SFFA policy is still in flux and several private universities have
// updated their published stance since 2024.

// ── Recruited-athlete pathway ────────────────────────────────────────────────
//
// Per Harvard SFFA court documents (Class of 2014–2019 admissions data,
// produced in evidence in *Students for Fair Admissions v. Harvard*),
// recruited athletes were admitted at ~86% regardless of academic profile.
// Crimson reporting on the unsealed exhibits and the court's findings
// confirms the band runs roughly 70–85% across most top schools, with the
// exact figure varying by sport, school, and recruit class size.
//
// The chance model bypasses the normal stat-band calculation when
// `profile.recruitedAthlete === true` and instead surfaces a separate
// pathway message. Stats-based estimate is still shown below as
// "if not recruited" for transparency.
export const RECRUITED_ATHLETE_BAND = {
  low: 70,   // % admit, conservative end of the published band
  high: 85,  // % admit, top of the published band at Ivy/T20s
} as const;

export const RECRUITED_ATHLETE_NOTE =
  "Recruited athlete pathway — typical admission ~70–85% at top schools, " +
  "regardless of academic profile. Contact coaches for school-specific " +
  "likelihood. Estimate below is for non-recruited applicants.";

// ── Legacy: schools that publicly do NOT consider legacy ────────────────────
//
// Treatment in the chance model:
// - College.legacyConsidered === false → legacy bump is skipped, period.
// - College.legacyConsidered === undefined → treat as "considers legacy", but
//   the bump itself is DEFERRED in Feature 1 (see SPEC W2). When implemented
//   later it should be MULTIPLICATIVE (Harvard SFFA: 33.6% legacy admit vs
//   ~6% non-legacy = 5.6x baseline) and SCALED DOWN per school.
//
// Sources cited per school. State-level legacy bans (CO, VA, MD, IL public
// universities) are reflected for the UC system here; verify other public
// flagships before extending the list.
export const LEGACY_BLIND_SCHOOLS: readonly string[] = [
  // MIT — publicly stated they do not consider legacy.
  // Source: MIT Admissions FAQ (mitadmissions.org).
  "MIT",
  // Caltech — does not consider legacy. Source: Caltech admissions site
  // (admissions.caltech.edu/apply/first-year/criteria).
  "Caltech",
  // Johns Hopkins — eliminated legacy preference, publicly announced 2014,
  // re-confirmed 2020. Source: JHU Hub (hub.jhu.edu) and JHU admissions.
  "Johns Hopkins University",
  // Amherst — eliminated legacy preference, publicly announced October 2021.
  // Source: Amherst News (amherst.edu/news).
  "Amherst College",
  // Tufts — does not consider legacy. Source: Tufts Admissions
  // (admissions.tufts.edu/discover-tufts/our-perspective/).
  "Tufts University",
  // ── UC system: California public university policy + AB-1780-adjacent
  //    practice. UCs do not consider legacy in admissions per UC Office of
  //    the President policy. Source: UC Admissions
  //    (admission.universityofcalifornia.edu).
  "UCLA",
  "UC Berkeley",
  "UC San Diego",
  "UC Davis",
  "UC Irvine",
  "UC Santa Barbara",
  "UC Santa Cruz",
  "UC Riverside",
  "UC Merced",
];

// ── Yield-protected schools ─────────────────────────────────────────────────
//
// Schools with documented yield-protective admissions behavior: they
// preferentially admit students more likely to enroll, sometimes waitlisting
// or denying over-qualified RD applicants who appear to be using the school
// as a safety. Demonstrated interest typically matters here.
//
// Treatment in the chance model:
// - For top-quartile applicants in RD without a demonstrated-interest
//   signal, cap stat-band multiplier at 1.0x. Optionally apply a small
//   reduction (~10-15%) to reflect waitlist risk.
// - CollegeCard renders a small "May consider demonstrated interest" note.
//
// Sources: Top Tier Admissions, Admissions Laboratory, IvyWise, and multiple
// independent counselor analyses across 2022–2025 admission cycles. The
// list below has been the consistent intersection of these sources.
// Re-verify each entry per cycle.
export const YIELD_PROTECTED_SCHOOLS: readonly string[] = [
  "Tufts University",
  "Tulane University",
  "Washington University in St. Louis",
  "Case Western Reserve University",
  "Northeastern University",
  "Boston University",
  "George Washington University",
  "Lehigh University",
  "American University",
  "Clemson University",
  "Auburn University",
];

// ── Lookups ──────────────────────────────────────────────────────────────────

const LEGACY_BLIND_SET = new Set<string>(LEGACY_BLIND_SCHOOLS);
const YIELD_PROTECTED_SET = new Set<string>(YIELD_PROTECTED_SCHOOLS);

export function isLegacyBlind(collegeName: string): boolean {
  return LEGACY_BLIND_SET.has(collegeName);
}

export function isYieldProtected(collegeName: string): boolean {
  return YIELD_PROTECTED_SET.has(collegeName);
}
