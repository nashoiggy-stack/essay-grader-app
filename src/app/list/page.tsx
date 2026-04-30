"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, ArrowRight, Bookmark, Sparkles, X, RefreshCw } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CollegeCard } from "@/components/CollegeCard";
import { useCollegePins } from "@/hooks/useCollegePins";
import { useProfile } from "@/hooks/useProfile";
import { COLLEGES } from "@/data/colleges";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import { gradeList, type ListGraderProfile, type GradeResult, type Letter } from "@/lib/list-grader";
import { recommendForList, type RecommendationResult } from "@/lib/list-recommender";
import { classifyCollege } from "@/lib/admissions";
import type { ClassifiedCollege, Classification } from "@/lib/college-types";

// ── Build a ListGraderProfile from the user's profile state ───────────────

function toGraderProfile(profile: ReturnType<typeof useProfile>["profile"]): ListGraderProfile {
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

// ── Color tokens ───────────────────────────────────────────────────────────

const LETTER_TONE: Record<Letter, string> = {
  "A+": "text-emerald-300",
  "A":  "text-emerald-400",
  "A-": "text-emerald-400",
  "B+": "text-blue-300",
  "B":  "text-blue-400",
  "B-": "text-blue-400",
  "C+": "text-amber-300",
  "C":  "text-amber-400",
  "C-": "text-amber-400",
  "D":  "text-orange-400",
  "F":  "text-red-400",
};

const TIER_COLOR: Record<"reach" | "target" | "likely" | "safety" | "unlikely" | "insufficient", string> = {
  unlikely:     "bg-red-500",
  reach:        "bg-orange-500",
  target:       "bg-amber-500",
  likely:       "bg-blue-500",
  safety:       "bg-emerald-500",
  insufficient: "bg-zinc-500",
};

const TIER_LABEL: Record<"reach" | "target" | "likely" | "safety" | "unlikely" | "insufficient", string> = {
  unlikely:     "Unlikely",
  reach:        "Reach",
  target:       "Target",
  likely:       "Likely",
  safety:       "Safety",
  insufficient: "Insufficient",
};

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

  const recommendations = useMemo<readonly RecommendationResult[]>(
    () => recommendForList(pinned, COLLEGES, graderProfile),
    [pinned, graderProfile],
  );

  // Resolve the pinned list to ClassifiedCollege so we can reuse the
  // standard CollegeCard. Same call signature as /colleges uses.
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
        <div className="min-h-dvh flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </AuroraBackground>
    );
  }

  const isEmpty = pinned.length === 0;

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Your College List</span>
          </h1>
          <p className="mt-3 text-zinc-400 max-w-xl text-base sm:text-lg leading-relaxed">
            A graded view of your pinned schools — balance across tiers, fit with your major,
            and where the early-round leverage lies.
          </p>
        </motion.div>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            <ScrollReveal delay={0.05}>
              <GradeCard grade={grade} />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <TierBar counts={grade.tierCounts} />
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <PinnedSection
                items={pinnedClassified}
                isPinned={isPinned}
                onTogglePin={togglePin}
              />
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <RecommendationsSection
                recommendations={recommendations}
                listSize={pinned.length}
              />
            </ScrollReveal>
          </>
        )}
      </main>
    </AuroraBackground>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="glass rounded-2xl ring-1 ring-white/[0.06] p-10 sm:p-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/15 ring-1 ring-blue-500/25 flex items-center justify-center mb-5">
        <Bookmark className="w-5 h-5 text-blue-300" />
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-2">
        Pin a few schools to get started
      </h2>
      <p className="text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
        Your list is graded on tier balance, count, ED leverage, financial mix, geographic
        diversity, and major fit. Aim for 8–12 schools across reach, target, likely, and safety.
      </p>
      <Link
        href="/colleges"
        className="inline-flex items-center gap-2 rounded-full bg-blue-500/15 hover:bg-blue-500/25 ring-1 ring-blue-500/30 px-5 py-2.5 text-sm font-semibold text-blue-200 transition-[background-color] duration-200"
      >
        Browse colleges <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function GradeCard({ grade }: { grade: GradeResult }) {
  const tone = LETTER_TONE[grade.letter];
  return (
    <div className="glass rounded-2xl ring-1 ring-white/[0.06] p-6 sm:p-8 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 font-medium">
            Official grade
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <span className={`text-6xl sm:text-7xl font-bold tracking-tight ${tone}`}>
              {grade.letter}
            </span>
            <span className="text-2xl sm:text-3xl font-mono tabular-nums text-zinc-300">
              {grade.officialScore.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:items-end gap-1">
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Components
          </div>
          <div className="flex gap-3 text-[12px]">
            <span className="text-zinc-400">
              Balance <span className="text-zinc-100 font-mono">{grade.balanceScore.toFixed(1)}</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">
              Major <span className="text-zinc-100 font-mono">{grade.majorScore.toFixed(1)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Why this grade */}
      <div className="mb-6 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold mb-2">
          Why this grade
        </h3>
        <ul className="space-y-1.5">
          {grade.reasons.map((r, i) => (
            <li key={i} className="text-[13px] text-zinc-300 leading-relaxed flex gap-2">
              <span className="text-zinc-600 shrink-0">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Always-expanded breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BreakdownColumn
          title="Balance"
          score={grade.balanceScore}
          rows={[
            { label: "Tier distribution", out: 40, ...grade.balanceBreakdown.tierDistribution },
            { label: "Total count",        out: 25, ...grade.balanceBreakdown.count },
            { label: "ED leverage",        out: 20, ...grade.balanceBreakdown.edLeverage },
            { label: "Financial fit",      out: 10, ...grade.balanceBreakdown.financialFit },
            { label: "Geographic diversity", out: 5, ...grade.balanceBreakdown.geoDiversity },
          ]}
        />
        <BreakdownColumn
          title="Major fit"
          score={grade.majorScore}
          rows={[
            { label: "Average major-fit (70%)", out: 100, ...grade.majorBreakdown.avgFit },
            { label: "Program-strong schools (30%)", out: 100, ...grade.majorBreakdown.programStrong },
          ]}
        />
      </div>
    </div>
  );
}

interface BreakdownRow {
  readonly label: string;
  readonly out: number;
  readonly score: number;
  readonly note: string;
}

function BreakdownColumn({
  title, score, rows,
}: {
  title: string;
  score: number;
  rows: readonly BreakdownRow[];
}) {
  return (
    <div className="rounded-xl bg-[#0a0a14]/60 border border-white/[0.04] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-semibold">
          {title}
        </h3>
        <span className="text-[12px] font-mono tabular-nums text-zinc-300">
          {score.toFixed(1)}<span className="text-zinc-600"> / 100</span>
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => {
          const pct = Math.max(0, Math.min(100, (r.score / r.out) * 100));
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] text-zinc-300">{r.label}</span>
                <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                  {r.score.toFixed(1)}<span className="text-zinc-700"> / {r.out}</span>
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-400/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500 leading-snug">{r.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TierBar({ counts }: { counts: GradeResult["tierCounts"] }) {
  const denom = counts.total || 1;
  type Tier = keyof typeof TIER_COLOR;
  const segments: { tier: Tier; n: number }[] = (
    [
      { tier: "safety",       n: counts.safety },
      { tier: "likely",       n: counts.likely },
      { tier: "target",       n: counts.target },
      { tier: "reach",        n: counts.reach },
      { tier: "unlikely",     n: counts.unlikely },
      { tier: "insufficient", n: counts.insufficient },
    ] satisfies { tier: Tier; n: number }[]
  ).filter((s) => s.n > 0);

  return (
    <div className="glass rounded-2xl ring-1 ring-white/[0.06] p-5 sm:p-6 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">
          Tier distribution
        </h3>
        <span className="text-[12px] text-zinc-500">{counts.total} pinned</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.04]">
        {segments.map((s) => (
          <div
            key={s.tier}
            className={TIER_COLOR[s.tier]}
            style={{ width: `${(s.n / denom) * 100}%` }}
            aria-label={`${TIER_LABEL[s.tier]}: ${s.n}`}
            title={`${TIER_LABEL[s.tier]}: ${s.n}`}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        {segments.map((s) => (
          <span key={s.tier} className="inline-flex items-center gap-1.5 text-zinc-400">
            <span className={`inline-block w-2 h-2 rounded-full ${TIER_COLOR[s.tier]}`} />
            {TIER_LABEL[s.tier]} <span className="text-zinc-600">({s.n})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PinnedSection({
  items, isPinned, onTogglePin,
}: {
  items: readonly ClassifiedCollege[];
  isPinned: (name: string) => boolean;
  onTogglePin: (name: string) => void;
}) {
  // Sort by chance midpoint descending — highest chance first, mirrors
  // /colleges default sort.
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.chance.mid - a.chance.mid),
    [items],
  );
  return (
    <section className="mb-8">
      <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold mb-4">
        Pinned schools
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

function RecommendationsSection({
  recommendations, listSize,
}: {
  recommendations: readonly RecommendationResult[];
  listSize: number;
}) {
  if (recommendations.length === 0) {
    if (listSize >= 8 && listSize <= 12) {
      return (
        <div className="rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.15] px-4 py-4 text-[13px] text-emerald-200/85 leading-relaxed">
          <span className="font-semibold text-emerald-200">Your list is solid.</span>{" "}
          No clear improvements to suggest right now. The grade card breakdown shows what's
          driving your score.
        </div>
      );
    }
    return null;
  }

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-zinc-400 font-semibold">
          Recommendations
        </h2>
        <span className="text-[11px] text-zinc-600">
          {listSize >= 12 ? "Swap-only mode" : listSize >= 8 ? "Targeted swaps" : "Filling toward 8–12"}
        </span>
      </div>
      <ul className="space-y-3">
        {recommendations.map((rec, i) => (
          <RecommendationRow key={`${rec.kind}-${rec.college.name}-${rec.replaces ?? ""}`} rec={rec} index={i} />
        ))}
      </ul>
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
  const Icon = rec.kind === "swap" ? RefreshCw : Plus;
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className="rounded-xl bg-[#0f0f1c] border border-white/[0.06] p-4 sm:p-5 flex items-start gap-3"
    >
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-blue-300" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-semibold text-zinc-100">
            {rec.college.name}
          </p>
          <span className="text-[11px] text-zinc-500 shrink-0">
            +{rec.gradeDelta.toFixed(1)} grade
          </span>
        </div>
        <p className="text-[12px] text-zinc-400 mt-0.5 leading-relaxed">{rec.rationale}</p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (rec.kind === "swap" && rec.replaces) {
                togglePin(rec.replaces); // unpin the school being replaced
              }
              togglePin(rec.college.name); // add the recommendation
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 hover:bg-blue-500/25 ring-1 ring-blue-500/30 px-3 py-1.5 text-[11px] font-semibold text-blue-200 transition-[background-color] duration-150"
          >
            {rec.kind === "swap" ? (
              <>
                <RefreshCw className="w-3 h-3" /> Swap in
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" /> Pin school
              </>
            )}
          </button>
          {rec.kind === "swap" && rec.replaces && (
            <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
              <X className="w-3 h-3" /> {rec.replaces}
            </span>
          )}
          <Sparkles className="w-3 h-3 text-zinc-700 ml-auto" />
        </div>
      </div>
    </motion.li>
  );
}
