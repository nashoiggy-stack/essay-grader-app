"use client";

import { useMemo, useDeferredValue } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, ArrowRight, Bookmark, RefreshCw, X } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CollegeCard } from "@/components/CollegeCard";
import { useCollegePins } from "@/hooks/useCollegePins";
import { useProfile } from "@/hooks/useProfile";
import { COLLEGES } from "@/data/colleges";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import {
  gradeList,
  type ListGraderProfile,
  type GradeResult,
  type Letter,
} from "@/lib/list-grader";
import {
  recommendForList,
  type RecommendationResult,
} from "@/lib/list-recommender";
import { classifyCollege } from "@/lib/admissions";
import type { ClassifiedCollege } from "@/lib/college-types";

// ── Build a ListGraderProfile from the user's profile state ───────────────

function toGraderProfile(
  profile: ReturnType<typeof useProfile>["profile"],
): ListGraderProfile {
  const gpaUW = profile.gpaUW ? parseFloat(profile.gpaUW) : null;
  const gpaW = profile.gpaW ? parseFloat(profile.gpaW) : null;
  const sat = computeSATComposite(profile.sat);
  const act = computeACTComposite(profile.act);
  const distinguishedEC =
    profile.firstAuthorPublication === true ||
    profile.nationalCompetitionPlacement === true ||
    profile.founderWithUsers === true ||
    profile.selectiveProgram === true;
  const essayCA = profile.essayCommonApp ? parseFloat(profile.essayCommonApp) : null;
  const essayV = profile.essayVspice ? parseFloat(profile.essayVspice) : null;
  return {
    gpaUW: gpaUW != null && Number.isFinite(gpaUW) ? gpaUW : null,
    gpaW: gpaW != null && Number.isFinite(gpaW) ? gpaW : null,
    sat,
    act,
    intendedMajor: profile.intendedMajor ?? "",
    intendedInterest: profile.intendedInterest ?? "",
    ecBand: profile.ecBand || undefined,
    distinguishedEC,
    rigor: profile.rigor,
    apScores: profile.apScores,
    advancedCoursework: profile.advancedCoursework,
    advancedCourseworkAvailable: profile.advancedCourseworkAvailable,
    essayScores: profile.essayScores,
    essayCA: essayCA != null && Number.isFinite(essayCA) ? essayCA : null,
    essayV: essayV != null && Number.isFinite(essayV) ? essayV : null,
  };
}

// ── Tier metadata (semantic color use only) ────────────────────────────────

const TIER_KEYS = ["safety", "likely", "target", "reach", "unlikely", "insufficient"] as const;
type TierKey = (typeof TIER_KEYS)[number];

const TIER_DOT: Record<TierKey, string> = {
  safety: "bg-emerald-500",
  likely: "bg-blue-500",
  target: "bg-amber-500",
  reach: "bg-orange-500",
  unlikely: "bg-red-500",
  insufficient: "bg-zinc-500",
};
const TIER_LABEL: Record<TierKey, string> = {
  safety: "Safety",
  likely: "Likely",
  target: "Target",
  reach: "Reach",
  unlikely: "Unlikely",
  insufficient: "Insufficient",
};

// Letter colors are restrained — letter is large enough that any tone reads
// as decorative if pushed. We pull a single hairline tone per band.
const LETTER_TONE: Record<Letter, string> = {
  "A+": "text-emerald-600 dark:text-emerald-300",
  "A":  "text-emerald-600 dark:text-emerald-300",
  "A-": "text-emerald-600 dark:text-emerald-300",
  "B+": "text-text-primary",
  "B":  "text-text-primary",
  "B-": "text-text-primary",
  "C+": "text-amber-600 dark:text-amber-300",
  "C":  "text-amber-600 dark:text-amber-300",
  "C-": "text-amber-600 dark:text-amber-300",
  "D":  "text-orange-600 dark:text-orange-300",
  "F":  "text-red-600 dark:text-red-300",
};

// ── Reusable typographic tokens (Linear-derived chrome) ───────────────────
// SERIF is a misnomer — kept for compat with this file's existing usage.
// In Linear-derived there is no display serif; headlines are heavy weights
// of the body sans with tight tracking. See design-system/MASTER.md.

const EYEBROW = "text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted";
const HAIRLINE = "border-t border-border-hair";
const SERIF = "font-[family-name:var(--font-geist-sans)] font-semibold tracking-[-0.022em]";
const MONO = "font-[family-name:var(--font-geist-mono)] tabular-nums";

// ── Page ────────────────────────────────────────────────────────────────────

export default function ListPage() {
  const { pinned, loaded, isPinned, togglePin } = useCollegePins();
  const { profile, loaded: profileLoaded } = useProfile();

  const graderProfile = useMemo<ListGraderProfile>(
    () => toGraderProfile(profile),
    [profile],
  );

  const grade = useMemo<GradeResult>(
    () => gradeList(pinned, graderProfile),
    [pinned, graderProfile],
  );

  // Recommendations are the heavy compute. Run them against deferred
  // values so React can paint the grade card + pinned cards first and
  // schedule the recommender as a low-priority update. Output is
  // bit-identical to a non-deferred path — same recommendations, just
  // not blocking first paint.
  const deferredPinned = useDeferredValue(pinned);
  const deferredProfile = useDeferredValue(graderProfile);
  const recommendations = useMemo<readonly RecommendationResult[]>(
    () => recommendForList(deferredPinned, COLLEGES, deferredProfile),
    [deferredPinned, deferredProfile],
  );

  const pinnedClassified = useMemo<ClassifiedCollege[]>(() => {
    const out: ClassifiedCollege[] = [];
    for (const pin of pinned) {
      const college = COLLEGES.find((c) => c.name === pin.name);
      if (!college) continue;
      const result = classifyCollege(
        college,
        graderProfile.gpaUW,
        graderProfile.gpaW,
        graderProfile.sat,
        graderProfile.act,
        graderProfile.essayCA ?? null,
        graderProfile.essayV ?? null,
        {
          ecBand: graderProfile.ecBand,
          distinguishedEC: graderProfile.distinguishedEC,
          rigor: graderProfile.rigor,
          apScores: graderProfile.apScores,
          advancedCoursework: graderProfile.advancedCoursework,
          advancedCourseworkAvailable: graderProfile.advancedCourseworkAvailable,
          essayScores: graderProfile.essayScores,
          applicationPlan: pin.applicationPlan ?? "RD",
        },
      );
      out.push({
        college,
        classification: result.classification,
        reason: result.reason,
        chance: result.chance,
        confidence: result.confidence,
        yieldProtectedNote: result.yieldProtectedNote,
        usedFallback: result.usedFallback,
        stale: result.stale,
        recruitedAthletePathway: result.recruitedAthletePathway,
        breakdown: result.breakdown,
      });
    }
    return out;
  }, [pinned, graderProfile]);

  if (!loaded || !profileLoaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-bg-base">
        <div className="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    );
  }

  const isEmpty = pinned.length === 0;

  return (
    <main className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">
      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="mb-10 sm:mb-12"
      >
        <p className={EYEBROW}>Your application cycle</p>
        <h1
          className={`${SERIF} mt-3 text-[2rem] sm:text-[2.5rem] leading-[1.04] text-text-primary`}
        >
          The list, graded.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary">
          A second-opinion read on tier balance, ED leverage, financial mix,
          geographic spread, and major fit — calibrated against the same
          chance model that powers the rest of AdmitEdge.
        </p>
      </motion.header>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-10 sm:space-y-12">
            <ScrollReveal delay={0.05}>
              <GradeMasthead grade={grade} />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <Breakdown grade={grade} />
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <TierStrip counts={grade.tierCounts} />
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <PinnedSection
                items={pinnedClassified}
                isPinned={isPinned}
                onTogglePin={togglePin}
              />
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <RecommendationsSection
                recommendations={recommendations}
                listSize={pinned.length}
              />
            </ScrollReveal>
          </div>
        )}
    </main>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border border-border-hair rounded-md bg-bg-surface px-6 sm:px-8 py-10 sm:py-12">
      <p className={EYEBROW}>No schools pinned</p>
      <h2 className="mt-3 text-xl sm:text-2xl font-semibold tracking-[-0.018em] text-text-primary leading-tight">
        Start by pinning a few schools.
      </h2>
      <p className="mt-3 max-w-[60ch] text-[14px] text-text-secondary leading-relaxed">
        We grade the list on tier balance, count, ED leverage, financial mix,
        geographic diversity, and major fit. Aim for 8–12 schools across reach,
        target, likely, and safety.
      </p>
      <Link
        href="/colleges"
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-[var(--accent)] text-[var(--accent-fg)] px-4 py-2 text-[13px] font-medium transition-[background-color] duration-150 hover:bg-[var(--accent-strong)]"
      >
        Browse colleges <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ── Grade summary — restrained stat readout, not a masthead.
//    Reads like the reference tables on /gpa rather than the editorial
//    oversized letter that was carrying over from the previous redesign. ─

function GradeMasthead({ grade }: { grade: GradeResult }) {
  const tone = LETTER_TONE[grade.letter];
  return (
    <section
      aria-labelledby="grade-masthead"
      className="rounded-md border border-border-hair bg-bg-surface p-6 sm:p-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-x-10 gap-y-8">
        {/* Stat block — letter sits in the 4xl/5xl range like the rest of
            the app's hero numbers, not the 13rem masthead clamp. */}
        <div>
          <p className={EYEBROW} id="grade-masthead">Official grade</p>
          <div className="mt-3 flex items-baseline gap-5">
            <span
              aria-label={`Grade: ${grade.letter}`}
              className={`font-semibold ${tone} leading-none text-[clamp(3.5rem,8vw,5.5rem)] tracking-[-0.025em]`}
            >
              {grade.letter}
            </span>
            <div>
              <div className={`${MONO} text-2xl text-text-primary leading-none`}>
                {grade.officialScore.toFixed(1)}
                <span className="text-text-faint"> / 100</span>
              </div>
              <p className="mt-1 text-[12px] text-text-muted">
                Balance + major fit, averaged.
              </p>
            </div>
          </div>

          {/* Sub-scores as a dense two-row table, not a masthead column */}
          <table className={`${MONO} mt-6 w-full max-w-sm text-[13px]`}>
            <tbody className="divide-y divide-border-hair">
              <tr>
                <td className="py-2 text-text-secondary font-sans">Balance</td>
                <td className="py-2 text-right tabular-nums text-text-primary">
                  {grade.balanceScore.toFixed(1)}
                  <span className="text-text-faint"> / 100</span>
                </td>
              </tr>
              <tr>
                <td className="py-2 text-text-secondary font-sans">Major fit</td>
                <td className="py-2 text-right tabular-nums text-text-primary">
                  {grade.majorScore.toFixed(1)}
                  <span className="text-text-faint"> / 100</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Why this grade — bullet list with mono ordinals; same visual
            register as the breakdown rows below, no editorial drama. */}
        <div>
          <p className={EYEBROW}>Why this grade</p>
          <ul className="mt-3 divide-y divide-border-hair">
            {grade.reasons.slice(0, 5).map((r, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 py-3">
                <span className={`${MONO} text-[12px] text-text-faint pt-0.5`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] text-text-secondary leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Always-expanded breakdown — two columns of measured rows ──────────────

interface BreakdownRow {
  readonly label: string;
  readonly out: number;
  readonly score: number;
  readonly note: string;
}

function Breakdown({ grade }: { grade: GradeResult }) {
  const balanceRows: readonly BreakdownRow[] = [
    { label: "Tier distribution", out: 40, ...grade.balanceBreakdown.tierDistribution },
    { label: "Total count",        out: 25, ...grade.balanceBreakdown.count },
    { label: "ED leverage",        out: 20, ...grade.balanceBreakdown.edLeverage },
    { label: "Financial fit",      out: 10, ...grade.balanceBreakdown.financialFit },
    { label: "Geographic diversity", out: 5, ...grade.balanceBreakdown.geoDiversity },
  ];
  const majorRows: readonly BreakdownRow[] = [
    { label: "Average major-fit", out: 100, ...grade.majorBreakdown.avgFit },
    { label: "Program-strong schools", out: 100, ...grade.majorBreakdown.programStrong },
  ];

  return (
    <section
      aria-labelledby="grade-breakdown"
      className="rounded-md border border-border-hair bg-bg-surface p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between mb-6">
        <p className={EYEBROW} id="grade-breakdown">
          Breakdown
        </p>
        <p className="text-[11px] text-text-faint max-w-[20ch] text-right">
          balance + major / 2 = official
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
        <BreakdownColumn title="Balance" weight="40 + 25 + 20 + 10 + 5 = 100" rows={balanceRows} />
        <BreakdownColumn title="Major fit" weight="70% avg-fit · 30% program-strong" rows={majorRows} />
      </div>
    </section>
  );
}

function BreakdownColumn({
  title, weight, rows,
}: {
  title: string;
  weight: string;
  rows: readonly BreakdownRow[];
}) {
  const total = rows.reduce((s, r) => s + r.score, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between pb-3 mb-2 border-b border-border-hair">
        <h3 className="text-[15px] font-semibold tracking-[-0.012em] text-text-primary leading-none">
          {title}
        </h3>
        <div className={`${MONO} text-[13px] text-text-primary`}>
          {total.toFixed(1)}
          <span className="text-text-faint"> / {totalOut}</span>
        </div>
      </div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-text-faint mb-4 font-medium">{weight}</p>
      <div className="divide-y divide-border-hair">
        {rows.map((r, i) => {
          const pct = Math.max(0, Math.min(100, (r.score / r.out) * 100));
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] text-text-primary">{r.label}</div>
                <p className="mt-1 text-[12px] text-text-muted leading-relaxed max-w-[55ch]">
                  {r.note}
                </p>
              </div>
              <div className="text-right">
                <div className={`${MONO} text-[13px] text-text-primary`}>
                  {r.score.toFixed(1)}
                  <span className="text-text-faint"> / {r.out}</span>
                </div>
                {/* Meter — accent fill on a hairline track. Visible in
                    both modes; previous border-strong fill was barely
                    distinguishable from the track. */}
                <div className="mt-2 h-1 w-24 rounded-sm bg-bg-inset overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-[var(--accent)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tier strip — fine 1px segments, tabular figures above ─────────────────

function TierStrip({ counts }: { counts: GradeResult["tierCounts"] }) {
  const denom = counts.total || 1;
  const segments = TIER_KEYS
    .map((tier) => ({ tier, n: counts[tier] }))
    .filter((s) => s.n > 0);
  return (
    <section
      aria-labelledby="tier-strip"
      className="rounded-md border border-border-hair bg-bg-surface p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between mb-5">
        <p className={EYEBROW} id="tier-strip">
          Tier distribution
        </p>
        <span className={`${MONO} text-[11px] text-text-muted`}>
          {counts.total} pinned
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {TIER_KEYS.map((tier) => {
          const n = counts[tier];
          const pct = n / denom;
          return (
            <div key={tier} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-text-secondary">{TIER_LABEL[tier]}</span>
                <span className={`${MONO} text-[11px] text-text-primary`}>{n}</span>
              </div>
              <div className="h-1 rounded-sm bg-bg-inset overflow-hidden">
                <div
                  className={`h-full rounded-sm ${TIER_DOT[tier]}`}
                  style={{ width: `${pct * 100}%`, minWidth: n > 0 ? "12%" : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Subtle reminder of segmenting — no big legend */}
      <p className="mt-4 text-[11px] text-text-faint">
        Ideal target: ~30% reach · 30% target · 25% likely · 15% safety.
      </p>
      {/* Hide unused segments mention */}
      <p className="sr-only">{segments.length} segments rendered.</p>
    </section>
  );
}

// ── Pinned schools — section with eyebrow, count, dense grid ──────────────

function PinnedSection({
  items, isPinned, onTogglePin,
}: {
  items: readonly ClassifiedCollege[];
  isPinned: (name: string) => boolean;
  onTogglePin: (name: string) => void;
}) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.chance.mid - a.chance.mid),
    [items],
  );
  return (
    <section aria-labelledby="pinned-heading">
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-baseline gap-3">
          <p className={EYEBROW} id="pinned-heading">
            Your pinned schools
          </p>
          <span className={`${MONO} text-[11px] text-text-muted`}>
            ·  {sorted.length}
          </span>
        </div>
        <Link
          href="/colleges"
          className="text-[12px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1 transition-colors"
        >
          Browse more <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sorted.map((item, i) => (
          <CollegeCard
            key={item.college.name}
            item={item}
            index={i}
            isPinned={isPinned(item.college.name)}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </section>
  );
}

// ── Recommendations — editorial entries, not bubbly cards ─────────────────

function RecommendationsSection({
  recommendations, listSize,
}: {
  recommendations: readonly RecommendationResult[];
  listSize: number;
}) {
  if (recommendations.length === 0) {
    if (listSize >= 8 && listSize <= 12) {
      return (
        <section>
          <p className={EYEBROW}>Engine suggestions</p>
          <p className="mt-3 text-lg sm:text-xl font-semibold tracking-[-0.018em] text-text-primary max-w-[60ch] leading-tight">
            Your list is solid.
          </p>
          <p className="mt-2 max-w-[60ch] text-[13px] text-text-secondary leading-relaxed">
            No clear improvements to suggest right now. The breakdown above
            shows what&apos;s driving your score — refine those if you want a
            higher grade.
          </p>
        </section>
      );
    }
    return null;
  }

  const mode =
    listSize >= 12
      ? "Swap-only mode"
      : listSize >= 8
      ? "Targeted swaps"
      : "Filling toward 8–12";

  return (
    <section
      aria-labelledby="recs-heading"
      className="rounded-md border border-border-hair bg-bg-surface p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between mb-5">
        <p className={EYEBROW} id="recs-heading">
          Engine suggestions
        </p>
        <span className={`${MONO} text-[11px] text-text-faint`}>{mode}</span>
      </div>
      <ol className="divide-y divide-border-hair">
        {recommendations.map((rec, i) => (
          <RecommendationRow
            key={`${rec.kind}-${rec.college.name}-${rec.replaces ?? ""}`}
            rec={rec}
            index={i}
          />
        ))}
      </ol>
    </section>
  );
}

function RecommendationRow({
  rec, index,
}: {
  rec: RecommendationResult;
  index: number;
}) {
  const { togglePin } = useCollegePins();
  const apply = () => {
    if (rec.kind === "swap" && rec.replaces) {
      togglePin(rec.replaces);
    }
    togglePin(rec.college.name);
  };
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto_auto] gap-4 sm:gap-6 py-5 items-baseline"
    >
      <span className={`${MONO} text-[12px] text-text-faint`}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="text-[15px] sm:text-base font-semibold tracking-[-0.012em] text-text-primary leading-tight">
            {rec.college.name}
          </h3>
          {rec.kind === "swap" && rec.replaces && (
            <span className="text-[11px] text-text-muted inline-flex items-center gap-1">
              <X className="w-3 h-3" /> {rec.replaces}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed max-w-[70ch]">
          {rec.rationale}
        </p>
      </div>
      <div className="text-right">
        <div className={`${MONO} text-[13px] text-text-primary`}>
          +{rec.gradeDelta.toFixed(1)}
        </div>
        <div className="text-[10px] uppercase tracking-[0.08em] text-text-faint font-medium">
          grade
        </div>
      </div>
      <button
        type="button"
        onClick={apply}
        className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-text hover:text-[var(--accent-strong)] transition-colors"
      >
        {rec.kind === "swap" ? (
          <>
            <RefreshCw className="w-3 h-3" /> Swap in
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" /> Pin
          </>
        )}
      </button>
      {/* Mobile: full-row CTA */}
      <button
        type="button"
        onClick={apply}
        className="sm:hidden col-span-3 mt-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-medium text-text-primary border border-border-strong rounded-full py-2 hover:bg-white/[0.04] transition-colors"
      >
        {rec.kind === "swap" ? (
          <>
            <RefreshCw className="w-3 h-3" /> Swap in {rec.college.name}
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" /> Pin {rec.college.name}
          </>
        )}
      </button>
    </motion.li>
  );
}

// Make the unused symbol from the type imports tree-shake cleanly.
void Bookmark;
