// Shared matcher for "is this college strong in the major/interest the user
// cares about?" Used by both the college list (to badge cards) and the
// strategy engine (to rank recommended colleges). Keeping the rules in one
// file means the two surfaces stay consistent.
//
// The match is deliberately fuzzy and three-tiered:
//   - STRONG: the major appears directly in College.topMajors, or the
//             interest matches something in College.knownFor.
//   - DECENT: weaker signal — the major shows up in careerPipelines /
//             topIndustries, or the interest has token overlap with
//             knownFor / careerPipelines / topIndustries, OR the user's
//             major has a related term that hits the school's topMajors
//             (e.g. Pre-Med → "Biology" at Johns Hopkins).
//   - NONE:   no discernible signal. The college still shows on the list
//             — it just doesn't get the "fit for X" badge.

import type { College } from "./college-types";
import { getEnrichedMajors, enrichedOnlyEntries } from "./college-majors-enriched";

// ── Related-major map ────────────────────────────────────────────────────
// Semantic neighborhood for each entry in the MAJORS constant. When a user
// picks e.g. "Pre-Med" we also want to surface schools whose topMajors list
// reads "Biology" or "Neuroscience" — those are de-facto pre-med pipelines
// even without the exact label. Each cluster is 4-8 terms: tight enough to
// avoid spurious matches, broad enough to catch the common synonyms and
// sibling programs schools actually list.
//
// Keyed by the exact MAJORS string (case must match) so a case-insensitive
// lookup helper below can find them from normalized user input.
export const RELATED_MAJORS: Record<string, readonly string[]> = {
  // ── General ─────────────────────────────────────────────────────────────
  // "Any" and "Undecided" intentionally have no related terms — the "no
  // preference" sentinels. The matcher skips its related-bucket entirely
  // when these are selected.
  "Any": [],
  "Undecided": [],

  // ── Business & Economics ────────────────────────────────────────────────
  "Business": ["Economics", "Finance", "Management", "Accounting", "Marketing", "Entrepreneurship", "Business Administration"],
  "Accounting": ["Finance", "Business", "Actuarial Science", "Auditing", "Taxation"],
  "Finance": ["Economics", "Business", "Accounting", "Quantitative Finance", "Financial Engineering", "Investment Management"],
  "Marketing": ["Business", "Communications", "Advertising", "Management", "Consumer Behavior"],
  "Management": ["Business", "Organizational Behavior", "Leadership", "Operations Management"],
  "Entrepreneurship": ["Business", "Management", "Innovation", "Venture Capital"],
  "International Business": ["Business", "International Relations", "Economics", "Global Studies"],
  "Supply Chain Management": ["Business", "Operations Management", "Industrial Engineering", "Logistics"],
  "Hospitality Management": ["Business", "Tourism", "Hotel Management", "Event Management"],
  "Real Estate": ["Business", "Finance", "Urban Planning", "Economics"],
  "Actuarial Science": ["Mathematics", "Statistics", "Finance", "Risk Management"],
  "Economics": ["Finance", "Business", "Public Policy", "Quantitative Economics", "International Economics", "Political Economy"],
  "Econometrics": ["Economics", "Statistics", "Quantitative Economics", "Mathematics"],

  // ── Computing & Technology ──────────────────────────────────────────────
  "Computer Science": ["Software Engineering", "Data Science", "Information Systems", "Computational Science", "Artificial Intelligence", "Machine Learning"],
  "Software Engineering": ["Computer Science", "Information Systems", "Computer Engineering"],
  "Information Systems": ["Computer Science", "Information Technology", "Business Analytics", "Management Information Systems"],
  "Information Technology": ["Computer Science", "Information Systems", "Networking", "Cybersecurity"],
  "Data Science": ["Statistics", "Computer Science", "Machine Learning", "Applied Mathematics", "Business Analytics"],
  "Artificial Intelligence": ["Computer Science", "Machine Learning", "Data Science", "Cognitive Science", "Robotics"],
  "Cybersecurity": ["Computer Science", "Information Technology", "Network Security", "Information Assurance"],
  "Human-Computer Interaction": ["Computer Science", "Cognitive Science", "Psychology", "Design", "User Experience"],
  "Game Design": ["Computer Science", "Animation", "Graphic Design", "Interactive Media", "Art"],

  // ── Engineering ─────────────────────────────────────────────────────────
  "Engineering": ["Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Chemical Engineering", "Biomedical Engineering", "Industrial Engineering", "Aerospace Engineering"],
  "Mechanical Engineering": ["Engineering", "Aerospace Engineering", "Robotics", "Materials Science"],
  "Electrical Engineering": ["Engineering", "Computer Engineering", "Electronics", "Power Systems"],
  "Civil Engineering": ["Engineering", "Environmental Engineering", "Structural Engineering", "Urban Planning"],
  "Chemical Engineering": ["Engineering", "Chemistry", "Biochemistry", "Materials Science", "Biotechnology"],
  "Biomedical Engineering": ["Engineering", "Biology", "Pre-Med", "Bioengineering", "Biotechnology"],
  "Aerospace Engineering": ["Engineering", "Mechanical Engineering", "Astronautics", "Aeronautics"],
  "Industrial Engineering": ["Engineering", "Operations Research", "Supply Chain Management", "Systems Engineering"],
  "Environmental Engineering": ["Engineering", "Environmental Science", "Civil Engineering", "Sustainability"],
  "Materials Science": ["Engineering", "Chemistry", "Physics", "Nanotechnology"],
  "Nuclear Engineering": ["Engineering", "Physics", "Mechanical Engineering"],
  "Computer Engineering": ["Computer Science", "Electrical Engineering", "Engineering", "Embedded Systems"],
  "Robotics": ["Computer Science", "Mechanical Engineering", "Electrical Engineering", "Artificial Intelligence", "Engineering"],

  // ── Life Sciences ───────────────────────────────────────────────────────
  "Biology": ["Biochemistry", "Neuroscience", "Molecular Biology", "Environmental Biology", "Human Biology", "Genetics", "Microbiology"],
  "Biochemistry": ["Chemistry", "Biology", "Molecular Biology", "Biomedical Engineering", "Pre-Med"],
  "Neuroscience": ["Biology", "Psychology", "Cognitive Science", "Psychobiology", "Pre-Med", "Behavioral Neuroscience"],
  "Molecular Biology": ["Biology", "Biochemistry", "Genetics", "Cell Biology"],
  "Genetics": ["Biology", "Molecular Biology", "Biochemistry", "Biotechnology", "Genomics"],
  "Microbiology": ["Biology", "Biochemistry", "Immunology", "Public Health"],
  "Biotechnology": ["Biology", "Biochemistry", "Biomedical Engineering", "Chemical Engineering", "Genetics"],
  "Ecology": ["Biology", "Environmental Science", "Environmental Biology", "Conservation Biology"],
  "Marine Biology": ["Biology", "Oceanography", "Environmental Science", "Zoology"],
  "Environmental Science": ["Biology", "Ecology", "Earth Science", "Environmental Studies", "Sustainability Studies"],
  "Zoology": ["Biology", "Wildlife Biology", "Animal Science", "Ecology"],
  "Botany": ["Biology", "Plant Science", "Ecology", "Agriculture"],

  // ── Physical Sciences & Math ────────────────────────────────────────────
  "Chemistry": ["Biochemistry", "Chemical Engineering", "Materials Science", "Pharmaceutical Sciences", "Analytical Chemistry"],
  "Physics": ["Astrophysics", "Engineering Physics", "Applied Physics", "Astronomy", "Theoretical Physics"],
  "Astronomy": ["Physics", "Astrophysics", "Planetary Science"],
  "Astrophysics": ["Physics", "Astronomy", "Applied Physics"],
  "Earth Science": ["Geology", "Environmental Science", "Oceanography", "Atmospheric Science"],
  "Geology": ["Earth Science", "Geophysics", "Environmental Science", "Paleontology"],
  "Oceanography": ["Earth Science", "Marine Biology", "Environmental Science"],
  "Mathematics": ["Applied Mathematics", "Statistics", "Data Science", "Mathematical Sciences", "Pure Mathematics"],
  "Applied Mathematics": ["Mathematics", "Statistics", "Data Science", "Computer Science", "Operations Research"],
  "Statistics": ["Mathematics", "Data Science", "Biostatistics", "Applied Mathematics"],

  // ── Health & Pre-Professional ───────────────────────────────────────────
  "Pre-Med": ["Biology", "Biochemistry", "Neuroscience", "Chemistry", "Human Biology", "Physiology", "Molecular Biology", "Health Sciences"],
  "Pre-Dental": ["Biology", "Chemistry", "Biochemistry", "Pre-Med", "Health Sciences"],
  "Pre-Vet": ["Biology", "Animal Science", "Zoology", "Chemistry", "Pre-Med"],
  "Pre-Physician Assistant": ["Biology", "Pre-Med", "Health Sciences", "Nursing", "Kinesiology"],
  "Pre-Pharmacy": ["Chemistry", "Biochemistry", "Biology", "Pharmaceutical Sciences"],
  "Pre-Law": ["Political Science", "Philosophy", "History", "International Relations", "Public Policy", "English", "Legal Studies"],
  "Nursing": ["Health Sciences", "Public Health", "Nursing Practice", "Healthcare Administration", "Biology"],
  "Public Health": ["Health Sciences", "Biology", "Epidemiology", "Biostatistics", "Community Health"],
  "Kinesiology": ["Health Sciences", "Biology", "Sports Science", "Exercise Science", "Athletic Training"],
  "Nutrition": ["Health Sciences", "Biology", "Dietetics", "Food Science"],
  "Athletic Training": ["Kinesiology", "Health Sciences", "Physical Therapy", "Sports Medicine"],
  "Occupational Therapy": ["Health Sciences", "Psychology", "Kinesiology", "Physical Therapy"],
  "Physical Therapy": ["Health Sciences", "Kinesiology", "Biology", "Athletic Training"],
  "Speech Pathology": ["Health Sciences", "Linguistics", "Psychology", "Communication Disorders"],
  "Health Sciences": ["Pre-Med", "Biology", "Public Health", "Nursing"],

  // ── Social Sciences ─────────────────────────────────────────────────────
  "Psychology": ["Cognitive Science", "Neuroscience", "Behavioral Science", "Psychobiology", "Human Development"],
  "Cognitive Science": ["Psychology", "Neuroscience", "Linguistics", "Computer Science", "Philosophy"],
  "Sociology": ["Anthropology", "Political Science", "Social Work", "Gender Studies", "Criminology"],
  "Anthropology": ["Sociology", "Archaeology", "Linguistics", "History", "Area Studies"],
  "Political Science": ["International Relations", "Government", "Public Policy", "Public Administration", "Political Economy", "International Studies"],
  "International Relations": ["Political Science", "International Studies", "Public Policy", "Global Studies", "International Economics"],
  "Public Policy": ["Political Science", "Economics", "Public Administration", "Sociology"],
  "Public Administration": ["Political Science", "Public Policy", "Nonprofit Management"],
  "Criminology": ["Criminal Justice", "Sociology", "Psychology", "Forensic Science"],
  "Criminal Justice": ["Criminology", "Sociology", "Political Science", "Law Enforcement"],
  "Geography": ["Earth Science", "Urban Planning", "Environmental Science", "Geographic Information Systems"],
  "Urban Planning": ["Geography", "Architecture", "Public Policy", "Civil Engineering", "Environmental Studies"],
  "Social Work": ["Sociology", "Psychology", "Counseling", "Public Health"],

  // ── Humanities ──────────────────────────────────────────────────────────
  "English": ["Creative Writing", "Literature", "Comparative Literature", "Linguistics", "Writing", "Rhetoric"],
  "Creative Writing": ["English", "Literature", "Writing", "Journalism"],
  "Comparative Literature": ["English", "Literature", "Linguistics", "Area Studies"],
  "Linguistics": ["English", "Cognitive Science", "Anthropology", "Psychology", "Computer Science"],
  "History": ["Classics", "Archaeology", "Political Science", "History of Science", "Art History", "Area Studies"],
  "Classics": ["History", "Philosophy", "Archaeology", "Religious Studies", "Comparative Literature"],
  "Philosophy": ["Religious Studies", "History", "Classics", "Political Science", "Pre-Law", "Ethics"],
  "Religious Studies": ["Philosophy", "History", "Classics", "Theology", "Area Studies"],
  "Area Studies": ["History", "International Relations", "Anthropology", "Political Science", "Global Studies"],
  "Gender Studies": ["Sociology", "Anthropology", "History", "Political Science"],

  // ── Arts & Design ───────────────────────────────────────────────────────
  "Art": ["Fine Arts", "Graphic Design", "Visual Arts", "Studio Art", "Art History", "Design", "Illustration"],
  "Fine Arts": ["Art", "Studio Art", "Visual Arts", "Sculpture", "Painting"],
  "Art History": ["Art", "History", "Museum Studies", "Visual Arts"],
  "Graphic Design": ["Art", "Design", "Visual Arts", "Industrial Design", "Illustration"],
  "Industrial Design": ["Design", "Engineering", "Graphic Design", "Art"],
  "Interior Design": ["Design", "Architecture", "Art", "Fine Arts"],
  "Fashion Design": ["Design", "Art", "Merchandising", "Textiles"],
  "Photography": ["Art", "Visual Arts", "Film Studies", "Fine Arts"],
  "Animation": ["Art", "Film Studies", "Graphic Design", "Game Design", "Illustration"],
  "Music": ["Music Performance", "Music Composition", "Musicology", "Ethnomusicology", "Music Theory", "Music Education"],
  "Music Performance": ["Music", "Performing Arts", "Music Education"],
  "Music Composition": ["Music", "Music Theory", "Composition"],
  "Theater": ["Performing Arts", "Drama", "Film Studies", "Dance", "Art"],
  "Dance": ["Performing Arts", "Theater", "Kinesiology", "Choreography"],
  "Film Studies": ["Art", "Media Studies", "Theater", "Cinema Studies", "Communications"],
  "Architecture": ["Design", "Urban Planning", "Civil Engineering", "Art", "Environmental Design"],

  // ── Communications & Media ──────────────────────────────────────────────
  "Communications": ["Journalism", "Media Studies", "Public Relations", "Film", "Broadcast Journalism", "Strategic Communication", "Rhetoric"],
  "Journalism": ["Communications", "Media Studies", "Broadcast Journalism", "Writing", "English"],
  "Media Studies": ["Communications", "Film Studies", "Cultural Studies", "Journalism"],
  "Public Relations": ["Communications", "Marketing", "Advertising", "Journalism"],
  "Advertising": ["Marketing", "Communications", "Graphic Design", "Public Relations"],
  "Broadcast Journalism": ["Journalism", "Communications", "Media Studies"],

  // ── Education ───────────────────────────────────────────────────────────
  "Education": ["Teaching", "Child Development", "Educational Psychology", "Elementary Education", "Secondary Education", "Curriculum Studies"],
  "Early Childhood Education": ["Education", "Child Development", "Elementary Education"],
  "Elementary Education": ["Education", "Teaching", "Child Development", "Curriculum Studies"],
  "Secondary Education": ["Education", "Teaching", "Curriculum Studies"],
  "Special Education": ["Education", "Psychology", "Speech Pathology", "Social Work"],
  "Educational Psychology": ["Psychology", "Education", "Child Development"],

  // ── Agriculture & Environment ───────────────────────────────────────────
  "Agriculture": ["Agricultural Sciences", "Animal Science", "Plant Science", "Food Science"],
  "Forestry": ["Environmental Science", "Ecology", "Wildlife Biology"],
  "Wildlife Biology": ["Biology", "Zoology", "Ecology", "Conservation Biology"],
  "Sustainability Studies": ["Environmental Science", "Environmental Studies", "Environmental Engineering", "Public Policy"],
  "Food Science": ["Nutrition", "Biology", "Chemistry", "Agriculture"],
};

// Case-insensitive lookup for RELATED_MAJORS. Built once at module load.
const RELATED_MAJORS_LOOKUP = new Map<string, readonly string[]>(
  Object.entries(RELATED_MAJORS).map(([k, v]) => [k.toLowerCase(), v]),
);

export type MajorMatch = "strong" | "decent" | "none";

export interface MajorMatchInput {
  readonly major?: string | null;    // e.g. "Computer Science" (from MAJORS)
  readonly interest?: string | null; // free-text, e.g. "sustainability"
  // Pass 4 (LLM interest map): when the client has resolved the free-text
  // interest via /api/interest-map, the result's relatedMajors + keywords
  // are forwarded here to widen the matcher. Optional — the three base
  // signal paths (direct, static-related, pipelines, token overlap) all
  // still work when these are absent.
  readonly relatedMajors?: readonly string[] | null;   // extra related majors
  readonly expandedKeywords?: readonly string[] | null; // extra interest keywords
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

// "substring either direction" — the user's query or the college's tag can
// be the superstring. Keeps matches robust to small wording differences
// ("Computer Science" vs "CS", "Business" vs "Business Administration").
function biSubstringMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

function anyBiSubstring(query: string, pool: readonly string[] | undefined): boolean {
  if (!pool || pool.length === 0) return false;
  return pool.some((p) => biSubstringMatch(query, normalize(p)));
}

// Specificity-aware direct match.
//
// "full":    the pool contains an entry that equals the query OR is more
//            specific (query is a substring of the entry). e.g. user asks
//            for "Computer Science" and the college lists "Computer Science"
//            or "Applied Computer Science".
// "partial": the pool's best match is a PARENT category (entry is a strict
//            substring of the query). e.g. user asks for "Biomedical
//            Engineering" and the college only lists "Engineering". This
//            fires the signal so the rationale builder still engages, but
//            at half weight — a generic parent listing shouldn't rival a
//            school that actually advertises the specific field.
// "none":    no relationship.
function bestContainSpecificity(
  pool: readonly string[] | undefined,
  query: string,
): "full" | "partial" | "none" {
  if (!pool || pool.length === 0 || !query) return "none";
  let best: "full" | "partial" | "none" = "none";
  for (const p of pool) {
    const term = normalize(p);
    if (!term) continue;
    if (term === query || term.includes(query)) return "full";
    if (query.includes(term)) best = "partial";
  }
  return best;
}

// Token overlap = any non-trivial shared word. Used only for the fuzzier
// "decent" tier so we don't over-match on common words.
const STOPWORDS = new Set([
  "the", "and", "or", "of", "a", "an", "in", "for", "to", "with",
  "on", "is", "are", "at", "be", "by", "as", "it", "this", "that",
]);

function tokens(s: string): string[] {
  return normalize(s)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function hasTokenOverlap(query: string, pool: readonly string[] | undefined): boolean {
  if (!pool || pool.length === 0) return false;
  const qTokens = new Set(tokens(query));
  if (qTokens.size === 0) return false;
  for (const entry of pool) {
    for (const t of tokens(entry)) {
      if (qTokens.has(t)) return true;
    }
  }
  return false;
}

// Pipeline/industry match for a major query. For multi-word queries we
// require the MODIFIER token (everything except the head noun) to appear
// in the pool entry — otherwise the head alone would double-count with
// the direct topMajors bucket. Example: query "Biomedical Engineering"
// won't fire against a generic "engineering" industry; it needs
// "biomedical" somewhere.
function majorPipelineHit(major: string, pool: readonly string[] | undefined): boolean {
  if (!pool || pool.length === 0) return false;
  const mTokens = tokens(major);
  if (mTokens.length === 0) return false;
  if (mTokens.length === 1) {
    const only = mTokens[0];
    return pool.some((entry) => tokens(entry).includes(only));
  }
  const modifiers = mTokens.slice(0, -1);
  return pool.some((entry) => {
    const eTokens = tokens(entry);
    return modifiers.some((m) => eTokens.includes(m));
  });
}

// ── Graded fit score ────────────────────────────────────────────────────
//
// Earlier the match was a three-way bucket (strong/decent/none). That
// collapses real quality: Stanford-for-CS and a random state school both
// listing "Computer Science" in topMajors both came out "strong". Pass 2
// replaces that with a 0-100 score; the MajorMatch tier is now derived by
// thresholding the score.
//
// Scoring buckets (additive, each fires independently):
//   40  direct hit: major→topMajors OR major→knownFor OR interest→knownFor
//   20  related hit: user's major has a RELATED_MAJORS entry whose terms
//       show up in topMajors (e.g. Pre-Med → "Biology")
//   15  pipeline hit: major substring-matches a careerPipelines or
//       topIndustries entry
//   10  interest token overlap on any qualitative array
//   15  US News rank contribution, linearly scaled rank 1→15, rank 100→0.
//       Gated on the four signal buckets above contributing ≥ 20 pts
//       total, so top-ranked-alone doesn't inflate unrelated schools.
//
// Thresholds:
//   score ≥ 55 → "strong"
//   score ≥ 25 → "decent"
//   else       → "none"

// Individual signal flags — exposed so Pass 3's buildMatchReason can build
// a human-readable rationale from whichever signals actually fired.
export interface MajorFitSignals {
  readonly directTopMajor: boolean;
  readonly directKnownFor: boolean;     // from major OR interest
  readonly relatedTopMajor: boolean;
  readonly pipelineHit: boolean;        // careerPipelines / topIndustries
  readonly interestTokenHit: boolean;
  readonly rankPoints: number;          // 0-25, already gated
  // Source of the direct topMajors / knownFor hit when one fired:
  //   "curated"  — hit came from the hand-curated College record (default)
  //   "enriched" — hit came ONLY from LLM-enriched data (curated had no
  //                matching entry); the rationale builder may flag this.
  //   "none"     — no direct hit fired.
  readonly directSource: "curated" | "enriched" | "none";
}

export interface MajorFitResult {
  readonly score: number;               // 0-100
  readonly match: MajorMatch;
  readonly signals: MajorFitSignals;
}

function emptySignals(): MajorFitSignals {
  return {
    directTopMajor: false,
    directKnownFor: false,
    relatedTopMajor: false,
    pipelineHit: false,
    interestTokenHit: false,
    rankPoints: 0,
    directSource: "none",
  };
}

function scoreToMatch(score: number): MajorMatch {
  if (score >= 55) return "strong";
  if (score >= 25) return "decent";
  return "none";
}

// Map a US News rank to 0-25 pts. Rank 1 = 25 pts, rank 100+ = 0. Linear.
// Schools with null rank get 0 — we don't award mystery points.
//
// Cap raised from 15 to 25 in Pass 5: at a top-5 school, rank alone should
// carry ~25 % of the max score so that elite schools with any relevant
// signal visibly dominate mid-rank schools carrying the same signal.
function rankContribution(rank: number | null): number {
  if (rank == null || !Number.isFinite(rank)) return 0;
  if (rank <= 1) return 25;
  if (rank >= 100) return 0;
  // Linear interpolation across rank 1-100.
  return Math.max(0, Math.round(25 * (1 - (rank - 1) / 99)));
}

// At top-ranked schools (≤ this threshold), treat a parent-category direct
// match as a full direct hit. Rationale: if a school is rank ≤25, its
// "Engineering" listing is strong across ALL engineering sub-disciplines,
// not just the named parent. Below this cut, we keep the partial credit
// because "Engineering" at a rank-150 school usually means narrower depth.
const PARENT_TO_FULL_RANK_CUTOFF = 25;

/**
 * Full scored fit calculation. Returns score, derived tier, and which
 * individual signals fired (for Pass 3's rationale builder). Pure function
 * — safe to call from server, client, or strategy engine.
 */
export function computeMajorFit(
  college: College,
  input: MajorMatchInput,
): MajorFitResult {
  const major = normalize(input.major);
  const interest = normalize(input.interest);

  if ((!major || major === "any") && !interest) {
    return { score: 0, match: "none", signals: emptySignals() };
  }

  const s = { ...emptySignals() } as {
    directTopMajor: boolean;
    directKnownFor: boolean;
    relatedTopMajor: boolean;
    pipelineHit: boolean;
    interestTokenHit: boolean;
    rankPoints: number;
    directSource: "curated" | "enriched" | "none";
  };

  // ── Merge curated + LLM-enriched topMajors / knownFor ────────────────────
  // Spec: hand-curated wins on direct conflict; enriched APPENDS where
  // curated is sparse. Implementation: run bestContainSpecificity against
  // the curated pool first; if it doesn't fire (or fires only "partial")
  // try the enriched-only pool (entries the LLM added that aren't already
  // covered by curated). When the enriched-only pool is what produces the
  // best hit, source = "enriched"; otherwise source = "curated".
  //
  // getEnrichedMajors returns null for needsReview rows AND for schools
  // not yet enriched, which leaves us in pure curated-only behavior.
  const enriched = getEnrichedMajors(college.name);
  const enrichedTopMajorsOnly = enriched
    ? enrichedOnlyEntries(enriched.topMajors, college.topMajors)
    : [];
  const enrichedKnownForOnly = enriched
    ? enrichedOnlyEntries(enriched.knownFor, college.knownFor)
    : [];

  // Direct hits — now specificity-aware with a top-rank override.
  //   full (40 pts):    college term equals or is more specific than the
  //                     query ("Biomedical Engineering" at a school listing
  //                     "Biomedical Engineering" or "Applied Biomedical
  //                     Engineering"). ALSO: partial matches at top-25
  //                     schools get promoted here — at rank ≤ 25, the
  //                     parent-category listing implies breadth across all
  //                     sub-disciplines.
  //   partial (20 pts): college term is a strict PARENT of the query
  //                     ("Biomedical Engineering" at a school that only
  //                      lists "Engineering") — at rank > 25 schools only.
  //
  // Direct bucket takes the max of topMajors vs knownFor so a full hit on
  // one field isn't inflated by a partial hit on the other.
  const isTopRanked =
    college.usNewsRank != null && college.usNewsRank <= PARENT_TO_FULL_RANK_CUTOFF;
  const pointsFor = (spec: "full" | "partial" | "none"): number => {
    if (spec === "full") return 40;
    if (spec === "partial") return isTopRanked ? 40 : 20;
    return 0;
  };

  // Tracks whether the highest-points contributor came from curated or
  // enriched data. Curated takes precedence when tied.
  let directPts = 0;
  let directFiredFrom: "curated" | "enriched" | "none" = "none";

  const considerHit = (
    spec: "full" | "partial" | "none",
    source: "curated" | "enriched",
    setFlag: () => void,
  ): void => {
    if (spec === "none") return;
    setFlag();
    const pts = pointsFor(spec);
    if (pts > directPts) {
      directPts = pts;
      directFiredFrom = source;
    } else if (pts === directPts && directFiredFrom === "none") {
      directFiredFrom = source;
    }
    // Tie with existing curated hit: keep "curated" (curated wins ties).
  };

  if (major && major !== "any") {
    considerHit(
      bestContainSpecificity(college.topMajors, major),
      "curated",
      () => { s.directTopMajor = true; },
    );
    considerHit(
      bestContainSpecificity(enrichedTopMajorsOnly, major),
      "enriched",
      () => { s.directTopMajor = true; },
    );
    considerHit(
      bestContainSpecificity(college.knownFor, major),
      "curated",
      () => { s.directKnownFor = true; },
    );
    considerHit(
      bestContainSpecificity(enrichedKnownForOnly, major),
      "enriched",
      () => { s.directKnownFor = true; },
    );
  }
  if (interest) {
    considerHit(
      bestContainSpecificity(college.knownFor, interest),
      "curated",
      () => { s.directKnownFor = true; },
    );
    considerHit(
      bestContainSpecificity(enrichedKnownForOnly, interest),
      "enriched",
      () => { s.directKnownFor = true; },
    );
  }
  s.directSource = directFiredFrom;

  // Related-major → topMajors (20 pts). Pre-Med → Biology at Hopkins.
  // Pools together the static RELATED_MAJORS map and any LLM-expanded
  // relatedMajors the caller forwarded in (Pass 4 interest mapping).
  // Searched against curated topMajors PLUS enriched-only topMajors so
  // related-term hits work even when the curated record is shallow.
  const relatedSearchPool: readonly string[] = [
    ...(college.topMajors ?? []),
    ...enrichedTopMajorsOnly,
  ];
  if (major && major !== "any") {
    const staticRelated = RELATED_MAJORS_LOOKUP.get(major) ?? [];
    const dynamicRelated = (input.relatedMajors ?? []).filter((r) => r && r.trim().length > 0);
    const related = [...staticRelated, ...dynamicRelated];
    if (related.length > 0 && related.some((r) => anyBiSubstring(normalize(r), relatedSearchPool))) {
      s.relatedTopMajor = true;
    }
  } else if ((input.relatedMajors ?? []).length > 0) {
    // Edge: no major picked, but the interest-map produced relatedMajors
    // (the LLM inferred likely majors from a free-text interest). Still
    // allow those to fire the related bucket.
    const dynamicRelated = (input.relatedMajors ?? []).filter((r) => r && r.trim().length > 0);
    if (dynamicRelated.some((r) => anyBiSubstring(normalize(r), relatedSearchPool))) {
      s.relatedTopMajor = true;
    }
  }

  // Pipelines / industries (15 pts). Uses majorPipelineHit which requires
  // a modifier-token match for multi-word queries — so a generic
  // "engineering" industry entry won't double-count for a user searching
  // "Biomedical Engineering".
  if (
    major &&
    major !== "any" &&
    (majorPipelineHit(major, college.careerPipelines) ||
      majorPipelineHit(major, college.topIndustries))
  ) {
    s.pipelineHit = true;
  }

  // Interest token overlap (10 pts) against any qualitative field.
  // The query pool is the user's raw interest text PLUS any LLM-expanded
  // keywords the caller forwarded in (Pass 4). An empty expansion just
  // means we fall back to the raw interest. The knownFor pool is the
  // curated entries plus the enriched-only entries so additional LLM
  // descriptors broaden the surface that interests can match against.
  const expandedKeywords = (input.expandedKeywords ?? []).filter((k) => k && k.trim().length > 0);
  const interestPool = [interest, ...expandedKeywords].filter((q) => q.length > 0);
  if (interestPool.length > 0) {
    const mergedKnownFor: readonly string[] = [
      ...(college.knownFor ?? []),
      ...enrichedKnownForOnly,
    ];
    const fields: (readonly string[] | undefined)[] = [
      mergedKnownFor,
      college.careerPipelines,
      college.topIndustries,
    ];
    const hit = interestPool.some((q) =>
      fields.some((f) => hasTokenOverlap(q, f)),
    );
    // Also catch exact biSubstring on an expanded keyword against knownFor
    // — "climate adaptation" should fire against "climate research" even
    // though neither is a subword of the other at the token level.
    const biHit =
      !hit &&
      expandedKeywords.some(
        (k) =>
          anyBiSubstring(normalize(k), mergedKnownFor) ||
          anyBiSubstring(normalize(k), college.careerPipelines) ||
          anyBiSubstring(normalize(k), college.topIndustries),
      );
    if (hit || biHit) s.interestTokenHit = true;
  }

  // Pre-rank subtotal — gates the US News bucket so unrelated top schools
  // don't get free points just for being ranked. Direct bucket is now
  // specificity-aware (0 / 20 / 40) instead of all-or-nothing.
  const preRank =
    directPts +
    (s.relatedTopMajor ? 20 : 0) +
    (s.pipelineHit ? 15 : 0) +
    (s.interestTokenHit ? 10 : 0);

  if (preRank >= 20) {
    s.rankPoints = rankContribution(college.usNewsRank ?? null);
  }

  const score = Math.min(100, preRank + s.rankPoints);
  return { score, match: scoreToMatch(score), signals: s };
}

/**
 * Raw 0-100 score. Thin wrapper around computeMajorFit for callers that
 * only need the number (e.g. sorting).
 */
export function computeMajorFitScore(
  college: College,
  input: MajorMatchInput,
): number {
  return computeMajorFit(college, input).score;
}

/**
 * Tier for the given college/query. Derived from the score, which means
 * a direct topMajors hit alone scores 40 → "decent" unless supporting
 * signals (pipelines, rank) push it over 55. That's the point of Pass 2
 * — a state school and Stanford both listing "Computer Science" shouldn't
 * look identical.
 */
export function getMajorMatch(college: College, input: MajorMatchInput): MajorMatch {
  return computeMajorFit(college, input).match;
}

// ── Rationale strings ────────────────────────────────────────────────────
//
// Pass 3: every badge gets a specific, deterministic 1-liner instead of a
// generic "Strong fit". We assemble up to 3 fragments from whichever
// signals fired, prioritizing: (1) US News rank tied to the user's major,
// (2) knownFor tag that matched, (3) careerPipelines / topIndustries
// entry that matched, (4) notable earnings. Returns "" when no fragment
// can be built — components conditional-render on the string.

function capitalizeFirst(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// Pick the pool entry whose text has the closest connection to the user's
// major or any of its related terms. Returns the original entry (not
// normalized) so display keeps its casing/punctuation.
function firstRelevantEntry(
  pool: readonly string[] | undefined,
  queries: readonly string[],
): string | undefined {
  if (!pool || pool.length === 0) return undefined;
  const lowered = queries.map((q) => q.toLowerCase()).filter(Boolean);
  if (lowered.length === 0) return undefined;
  return pool.find((entry) => {
    const e = entry.toLowerCase();
    return lowered.some((q) => e.includes(q) || q.includes(e));
  });
}

// Format a pipeline entry. Entries that already contain "feeder" /
// "pipeline" / "hub" read naturally as-is; others get wrapped in a
// "strong X pipeline" template.
function formatPipeline(entry: string): string {
  const lower = entry.toLowerCase();
  if (/feeder|pipeline|hub|network/.test(lower)) return entry;
  return `strong ${entry} pipeline`;
}

// Format earnings as "$Xk" with a short label.
function formatEarnings(college: College): string | undefined {
  if (college.medianEarnings10Yr && college.medianEarnings10Yr >= 90000) {
    return `$${Math.round(college.medianEarnings10Yr / 1000)}k 10-yr median earnings`;
  }
  if (college.avgStartingSalary && college.avgStartingSalary >= 80000) {
    return `$${Math.round(college.avgStartingSalary / 1000)}k avg starting salary`;
  }
  return undefined;
}

/**
 * Build a 1-line human-readable rationale from the fired signals. Pure
 * function over existing College data — no LLM call.
 *
 * Example outputs:
 *   "Ranked #5 in Computer Science; strong Silicon Valley tech pipeline; $95k 10-yr median earnings"
 *   "Known for pre-med powerhouse; Harvard Law/Med feeder"
 *   "Ranked #3 in Economics; strong Wall Street pipeline"
 *
 * Returns "" if no signals fired or no printable fragment could be
 * assembled — callers should conditional-render on the empty string.
 */
export function buildMatchReason(
  college: College,
  input: MajorMatchInput,
  signals: MajorFitSignals,
): string {
  const major = input.major && input.major.toLowerCase() !== "any"
    ? input.major.trim()
    : "";
  const interest = (input.interest ?? "").trim();

  const hasRelevantSignal =
    signals.directTopMajor ||
    signals.directKnownFor ||
    signals.relatedTopMajor ||
    signals.pipelineHit ||
    signals.interestTokenHit;

  if (!hasRelevantSignal) return "";

  const parts: string[] = [];

  // Rank with field — only top-50 schools get this callout, and only
  // when something about the user's query actually matched. An unranked
  // school with strong qualitative signals still speaks through the other
  // fragments.
  if (college.usNewsRank && college.usNewsRank <= 50) {
    const suffix = major ? ` in ${major}` : "";
    parts.push(`Ranked #${college.usNewsRank}${suffix}`);
  }

  // knownFor tag — prefer one related to the query. Uses the related
  // terms so "Pre-Med" finds a tag like "biology research" if that's
  // what the school advertises. Merges curated + enriched-only knownFor
  // so an enriched-data rationale still surfaces when curated is sparse.
  const queries = [
    ...(major ? [major] : []),
    ...(major ? (RELATED_MAJORS_LOOKUP.get(major.toLowerCase()) ?? []) : []),
    ...(interest ? [interest] : []),
  ];
  if (signals.directKnownFor || signals.interestTokenHit) {
    const enriched = getEnrichedMajors(college.name);
    const enrichedKnownForOnly = enriched
      ? enrichedOnlyEntries(enriched.knownFor, college.knownFor)
      : [];
    const mergedKnownFor: string[] = [
      ...(college.knownFor ?? []),
      ...enrichedKnownForOnly,
    ];
    const tag = firstRelevantEntry(mergedKnownFor, queries);
    if (tag) parts.push(`known for ${tag}`);
  }

  // Pipeline / industry — pick the most relevant entry.
  if (signals.pipelineHit) {
    const entry =
      firstRelevantEntry(college.careerPipelines, queries) ??
      firstRelevantEntry(college.topIndustries, queries);
    if (entry) parts.push(formatPipeline(entry));
  }

  // Earnings callout — only when earnings are notable (top quartile-ish).
  const earnings = formatEarnings(college);
  if (earnings) parts.push(earnings);

  if (parts.length === 0) return "";
  // Cap at 3 fragments to keep cards scannable, capitalize the first.
  return capitalizeFirst(parts.slice(0, 3).join("; "));
}

// Ordered ranking used by sort comparators ("strong" beats "decent" beats
// "none"). Higher number = better match.
export const MAJOR_MATCH_RANK: Record<MajorMatch, number> = {
  strong: 2,
  decent: 1,
  none: 0,
};

export function compareByMajorMatch(a: MajorMatch, b: MajorMatch): number {
  return MAJOR_MATCH_RANK[b] - MAJOR_MATCH_RANK[a];
}

// ── Multi-input fit ─────────────────────────────────────────────────────
//
// When the user has multiple active majors/interests selected on /colleges,
// we run computeMajorFit per active entry, then summarize:
//   - score: max across active entries (drives sort + headline number)
//   - match: max level (OR logic — strong if ANY entry is strong)
//   - perEntry: full breakdown for the per-card UI
//   - bestMatchName: which entry produced the max (drives the per-card flag)
//   - bestReason: 1-liner from the highest-scoring entry, prefixed with
//     "Strong in <Major>:" so the user knows which selection earned it
//
// OR logic: a school is "strong" if ANY active selection is strong; "decent"
// if any is decent (and none strong); else "none".

export interface MajorFitBreakdownEntry {
  readonly name: string;                          // major name or interest text
  readonly kind: "major" | "interest";
  readonly score: number;                          // 0-100
  readonly level: MajorMatch;
  readonly signals: MajorFitSignals;
}

export interface MajorFitMultiResult {
  readonly score: number;                          // max across entries
  readonly match: MajorMatch;                      // max level (OR logic)
  readonly perEntry: readonly MajorFitBreakdownEntry[];
  readonly bestMatchName: string | null;           // entry that produced max
  readonly bestReason: string;                     // major-prefixed 1-liner
}

export interface MajorMatchMultiInput {
  readonly activeMajors?: readonly string[] | null;
  readonly activeInterests?: readonly string[] | null;
  readonly relatedMajors?: readonly string[] | null;
  readonly expandedKeywords?: readonly string[] | null;
}

export function computeMajorFitMulti(
  college: College,
  input: MajorMatchMultiInput,
): MajorFitMultiResult {
  const majors = (input.activeMajors ?? []).filter((m) => m && m.trim().length > 0 && m !== "Any");
  const interests = (input.activeInterests ?? []).filter((i) => i && i.trim().length > 0);

  if (majors.length === 0 && interests.length === 0) {
    return { score: 0, match: "none", perEntry: [], bestMatchName: null, bestReason: "" };
  }

  const perEntry: MajorFitBreakdownEntry[] = [];

  // Each major scored independently. relatedMajors / expandedKeywords pass
  // through to the underlying single-input matcher so LLM expansion still
  // applies on a per-entry basis (they widen the related-bucket pool).
  for (const m of majors) {
    const fit = computeMajorFit(college, {
      major: m,
      interest: null,
      relatedMajors: input.relatedMajors,
      expandedKeywords: input.expandedKeywords,
    });
    perEntry.push({ name: m, kind: "major", score: fit.score, level: fit.match, signals: fit.signals });
  }

  for (const i of interests) {
    const fit = computeMajorFit(college, {
      major: null,
      interest: i,
      relatedMajors: input.relatedMajors,
      expandedKeywords: input.expandedKeywords,
    });
    perEntry.push({ name: i, kind: "interest", score: fit.score, level: fit.match, signals: fit.signals });
  }

  // Pick the highest-scoring entry as the "best match" — that's what drives
  // the per-card flag label and the prefixed reason. Ties resolve to the
  // first occurrence (majors are appended before interests, so a major wins
  // a tie against an interest, which matches the visual hierarchy).
  let best: MajorFitBreakdownEntry | null = null;
  for (const e of perEntry) {
    if (!best || e.score > best.score) best = e;
  }

  const maxScore = best?.score ?? 0;
  // OR logic for the match level: strong if ANY entry is strong, etc.
  let maxLevel: MajorMatch = "none";
  for (const e of perEntry) {
    if (e.level === "strong") { maxLevel = "strong"; break; }
    if (e.level === "decent") maxLevel = "decent";
  }

  // Reason: build from the best entry's signals, prefixed with the major /
  // interest name so the user sees WHICH selection earned the badge.
  let bestReason = "";
  if (best && maxLevel !== "none") {
    const baseReason = buildMatchReason(
      college,
      best.kind === "major"
        ? { major: best.name, interest: null }
        : { major: null, interest: best.name },
      best.signals,
    );
    if (baseReason) {
      const verb = maxLevel === "strong" ? "Strong" : "Adjacent";
      const preposition = best.kind === "major" ? "in" : "to";
      bestReason = `${verb} ${preposition} ${best.name}: ${baseReason}`;
    }
  }

  return {
    score: maxScore,
    match: maxLevel,
    perEntry,
    bestMatchName: best && maxLevel !== "none" ? best.name : null,
    bestReason,
  };
}
