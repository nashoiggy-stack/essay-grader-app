"use client";

import { useMemo, useDeferredValue } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, ArrowRight, Bookmark, RefreshCw, X } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
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
  safety: "bg-emerald-400",
  likely: "bg-blue-400",
  target: "bg-amber-400",
  reach: "bg-orange-400",
  unlikely: "bg-red-400",
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
  "A+": "text-emerald-200",
  "A":  "text-emerald-200",
  "A-": "text-emerald-200",
  "B+": "text-zinc-100",
  "B":  "text-zinc-100",
  "B-": "text-zinc-100",
  "C+": "text-amber-200",
  "C":  "text-amber-200",
  "C-": "text-amber-200",
  "D":  "text-orange-200",
  "F":  "text-red-200",
};

// ── Reusable typographic tokens (editorial chrome) ─────────────────────────
//
// Editorial-luxury direction in dark mode. EYEBROW is the inline form;
// PILL_EYEBROW is a slightly more crafted variant used at major section
// boundaries — same letterforms, but in a hairline-bordered pill so the
// header anchors visually before the serif drops in.

const EYEBROW = "text-[10px] uppercase tracking-[0.22em] text-zinc-500 font-medium";
const PILL_EYEBROW =
  "inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-zinc-400 font-medium";
const HAIRLINE = "border-t border-white/[0.06]";
const SERIF = "font-[family-name:var(--font-display)]";
const MONO = "font-[family-name:var(--font-geist-mono)] tabular-nums";

// Lucide defaults to strokeWidth=2 which reads as "tech-ish" rather than
// editorial. Pin every icon on this page to 1.5 for an ultra-light precision
// line that pairs with the Young_Serif display face.
const ICON_STROKE = 1.5 as const;

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
      <AuroraBackground>
        <ListSkeleton />
      </AuroraBackground>
    );
  }

  const isEmpty = pinned.length === 0;

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-32 font-[family-name:var(--font-geist-sans)]">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="mb-14 sm:mb-20"
        >
          <span className={PILL_EYEBROW}>
            <span className="size-1 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(110,231,183,0.6)]" />
            Your application cycle
          </span>
          <h1
            className={`${SERIF} mt-5 text-[clamp(2.75rem,6vw,4.75rem)] leading-[0.95] tracking-tight text-zinc-100`}
          >
            The list, graded.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            A second-opinion read on tier balance, ED leverage, financial mix,
            geographic spread, and major fit — calibrated against the same
            chance model that powers the rest of AdmitEdge.
          </p>
        </motion.header>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-14 sm:space-y-20">
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
    </AuroraBackground>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────
//
// Editorial-shape skeleton instead of a generic centred spinner. Matches the
// masthead's actual layout (eyebrow, oversized letter block, sub-stats, then
// numbered reasons) so first paint communicates the same hierarchy that lands
// after data resolves. `animate-pulse` is Tailwind's built-in.

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-white/[0.05] ${className}`} />;
}

function ListSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading your list"
      className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)] animate-pulse"
    >
      <div className="mb-12 sm:mb-16">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="mt-4 h-12 w-3/4 max-w-2xl" />
        <SkeletonBar className="mt-5 h-3 w-full max-w-xl" />
        <SkeletonBar className="mt-2 h-3 w-2/3 max-w-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-8 md:gap-x-8">
        <div className="md:col-span-7 flex items-end gap-6">
          <SkeletonBar className="h-[clamp(7rem,18vw,13rem)] w-[clamp(6rem,14vw,10rem)]" />
          <div className="pb-2 sm:pb-4 space-y-3 flex-1">
            <SkeletonBar className="h-7 w-32" />
            <SkeletonBar className="h-3 w-44" />
            <SkeletonBar className="h-3 w-44" />
          </div>
        </div>
        <div className="md:col-span-5 space-y-4">
          <SkeletonBar className="h-3 w-32" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`grid grid-cols-[2.25rem_1fr] gap-2 pt-3 ${HAIRLINE}`}>
              <SkeletonBar className="h-3 w-6" />
              <SkeletonBar className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    // Double-bezel: outer shell (machined frame) + inner core (the actual
    // panel). The 1.5px gap between rings reads like a physical mat board
    // around a print, not a flat card on a flat background.
    <div className="rounded-[2rem] border border-white/[0.05] bg-white/[0.015] p-1.5">
      <div
        className="rounded-[calc(2rem-0.375rem)] border border-white/[0.04] bg-[#0a0a14]/55 px-8 sm:px-14 py-14 sm:py-20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      >
        <span className={PILL_EYEBROW}>
          <span className="size-1 rounded-full bg-zinc-400" />
          No schools pinned
        </span>
        <h2 className={`${SERIF} mt-5 text-3xl sm:text-4xl text-zinc-100 leading-tight tracking-tight`}>
          Start by pinning a few schools.
        </h2>
        <p className="mt-4 max-w-md text-[14px] text-zinc-400 leading-relaxed">
          We grade the list on tier balance, count, ED leverage, financial mix,
          geographic diversity, and major fit. Aim for 8–12 schools across reach,
          target, likely, and safety.
        </p>
        <Link
          href="/colleges"
          className="group/cta mt-8 inline-flex items-center gap-2.5 rounded-full bg-zinc-100 hover:bg-white pl-5 pr-1.5 py-1.5 text-[13px] font-medium text-zinc-950 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
        >
          Browse colleges
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-zinc-950/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-[1px]">
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
          </span>
        </Link>
      </div>
    </div>
  );
}

// ── Hero: oversized letter + tabular numerics ─────────────────────────────

function GradeMasthead({ grade }: { grade: GradeResult }) {
  const tone = LETTER_TONE[grade.letter];
  return (
    <section aria-labelledby="grade-masthead">
      <p className={EYEBROW} id="grade-masthead">
        Official grade
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-x-10">
        {/* The letter — masthead-scale, display serif, single tone */}
        <div className="md:col-span-7 flex items-end gap-5 sm:gap-7">
          <span
            aria-label={`Grade: ${grade.letter}`}
            className={`${SERIF} ${tone} leading-none text-[clamp(7rem,18vw,13rem)] tracking-[-0.04em]`}
          >
            {grade.letter}
          </span>
          <div className="pb-2 sm:pb-4">
            <div className={`${MONO} text-3xl sm:text-4xl text-zinc-100 leading-none`}>
              {grade.officialScore.toFixed(1)}
              <span className="text-zinc-600"> / 100</span>
            </div>
            <div className="mt-4 space-y-1.5 text-[12px] text-zinc-500">
              <div className="flex items-baseline gap-3">
                <span className="w-16 text-zinc-600">Balance</span>
                <span className={`${MONO} text-zinc-200 w-14`}>
                  {grade.balanceScore.toFixed(1)}
                </span>
                <span className="text-zinc-600">/ 100</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="w-16 text-zinc-600">Major</span>
                <span className={`${MONO} text-zinc-200 w-14`}>
                  {grade.majorScore.toFixed(1)}
                </span>
                <span className="text-zinc-600">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Why this grade — numbered editorial reasons */}
        <div className="md:col-span-5">
          <p className={EYEBROW}>Why this grade</p>
          <ol className="mt-5 space-y-4">
            {grade.reasons.slice(0, 5).map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.06, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className={`grid grid-cols-[2.25rem_1fr] gap-2 pt-3 ${HAIRLINE}`}
              >
                <span className={`${MONO} text-[11px] text-zinc-500 mt-0.5 tabular-nums`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] text-zinc-300 leading-relaxed">{r}</span>
              </motion.li>
            ))}
          </ol>
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
    <section aria-labelledby="grade-breakdown">
      <div className="flex items-baseline justify-between mb-6">
        <p className={EYEBROW} id="grade-breakdown">
          Breakdown
        </p>
        <p className="text-[11px] text-zinc-600 max-w-[20ch] text-right">
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
      <div className="flex items-baseline justify-between pb-3 mb-1 border-b border-white/[0.08]">
        <h3 className={`${SERIF} text-2xl text-zinc-100 leading-none`}>{title}</h3>
        <div className={`${MONO} text-[14px] text-zinc-200 tabular-nums`}>
          {total.toFixed(1)}
          <span className="text-zinc-600"> / {totalOut}</span>
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600 mb-5">{weight}</p>
      <div className="divide-y divide-white/[0.04]">
        {rows.map((r, i) => {
          const pct = Math.max(0, Math.min(100, (r.score / r.out) * 100));
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] gap-x-4 py-4">
              <div className="min-w-0">
                <div className="text-[13px] text-zinc-200">{r.label}</div>
                <p className="mt-1 text-[12px] text-zinc-500 leading-relaxed max-w-[55ch]">
                  {r.note}
                </p>
              </div>
              <div className="text-right">
                <div className={`${MONO} text-[13px] text-zinc-200 tabular-nums`}>
                  {r.score.toFixed(1)}
                  <span className="text-zinc-600"> / {r.out}</span>
                </div>
                {/* Thin meter — deliberately minimal */}
                <div className="mt-2 h-px w-24 bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full bg-zinc-200/70 transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
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
    <section aria-labelledby="tier-strip">
      <div className="flex items-baseline justify-between mb-4">
        <p className={EYEBROW} id="tier-strip">
          Tier distribution
        </p>
        <span className={`${MONO} text-[11px] text-zinc-500`}>
          {counts.total} pinned
        </span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-5 sm:gap-y-0 sm:gap-x-1.5">
        {TIER_KEYS.map((tier) => {
          const n = counts[tier];
          const pct = n / denom;
          return (
            <div key={tier} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-zinc-400">{TIER_LABEL[tier]}</span>
                <span className={`${MONO} text-[11px] text-zinc-300 tabular-nums`}>{n}</span>
              </div>
              <div className="h-px bg-white/[0.06]">
                <div
                  className={`h-full ${TIER_DOT[tier]} transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                  style={{ width: `${pct * 100}%`, minWidth: n > 0 ? "12%" : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Subtle reminder of segmenting — no big legend */}
      <p className="mt-4 text-[11px] text-zinc-600">
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
          <span className={`${MONO} text-[11px] text-zinc-500`}>
            ·  {sorted.length}
          </span>
        </div>
        <Link
          href="/colleges"
          className="group/link inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] pl-3.5 pr-1 py-1 text-[12px] font-medium text-zinc-300 hover:text-zinc-50 hover:border-white/[0.12] transition-[color,border-color,background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
        >
          Browse more
          <span className="flex items-center justify-center size-6 rounded-full bg-white/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/link:translate-x-0.5 group-hover/link:-translate-y-[1px]">
            <ArrowRight className="w-3 h-3" strokeWidth={ICON_STROKE} />
          </span>
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
          <p className={`${SERIF} mt-3 text-2xl sm:text-3xl text-zinc-100 max-w-2xl leading-tight`}>
            Your list is solid.
          </p>
          <p className="mt-3 max-w-md text-[13px] text-zinc-400 leading-relaxed">
            No clear improvements to suggest right now. The breakdown above
            shows what's driving your score — refine those if you want a
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
    <section aria-labelledby="recs-heading">
      <div className="flex items-baseline justify-between mb-6">
        <p className={EYEBROW} id="recs-heading">
          Engine suggestions
        </p>
        <span className="text-[11px] text-zinc-600">{mode}</span>
      </div>
      <ol className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
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
      className="group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[3rem_1fr_auto_auto] gap-4 sm:gap-6 py-5 items-baseline transition-colors duration-200 hover:bg-white/[0.015]"
    >
      <span className={`${MONO} text-[12px] text-zinc-600`}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className={`${SERIF} text-xl sm:text-2xl text-zinc-100 leading-tight`}>
            {rec.college.name}
          </h3>
          {rec.kind === "swap" && rec.replaces && (
            <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
              <X className="w-3 h-3" strokeWidth={ICON_STROKE} /> {rec.replaces}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] text-zinc-400 leading-relaxed max-w-[70ch]">
          {rec.rationale}
        </p>
      </div>
      <div className="text-right">
        <div className={`${MONO} text-[12px] text-zinc-400 tabular-nums transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-zinc-200`}>
          +{rec.gradeDelta.toFixed(1)}
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          grade
        </div>
      </div>
      {/* Desktop: nested icon-circle pill (button-in-button) */}
      <button
        type="button"
        onClick={apply}
        aria-label={rec.kind === "swap" ? `Swap in ${rec.college.name}` : `Pin ${rec.college.name}`}
        className="group/cta hidden sm:inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] pl-3.5 pr-1 py-1 text-[12px] font-medium text-zinc-200 hover:text-zinc-50 hover:border-white/[0.14] hover:bg-white/[0.04] transition-[color,border-color,background-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
      >
        {rec.kind === "swap" ? "Swap in" : "Pin"}
        <span className="flex items-center justify-center size-6 rounded-full bg-white/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-[1px]">
          {rec.kind === "swap" ? (
            <RefreshCw className="w-3 h-3" strokeWidth={ICON_STROKE} />
          ) : (
            <Plus className="w-3 h-3" strokeWidth={ICON_STROKE} />
          )}
        </span>
      </button>
      {/* Mobile: full-row CTA, same architecture */}
      <button
        type="button"
        onClick={apply}
        className="group/cta sm:hidden col-span-3 mt-3 inline-flex items-center justify-between gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] pl-5 pr-1.5 py-1.5 text-[13px] font-medium text-zinc-100 transition-[background-color,border-color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.05] active:scale-[0.98]"
      >
        <span className="truncate">
          {rec.kind === "swap" ? `Swap in ${rec.college.name}` : `Pin ${rec.college.name}`}
        </span>
        <span className="flex items-center justify-center size-7 rounded-full bg-white/[0.06] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5">
          {rec.kind === "swap" ? (
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
          ) : (
            <Plus className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
          )}
        </span>
      </button>
    </motion.li>
  );
}

// Make the unused symbol from the type imports tree-shake cleanly.
void Bookmark;
