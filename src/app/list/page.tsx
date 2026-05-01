"use client";

import { useMemo, useDeferredValue } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Plus, ArrowRight, RefreshCw, X } from "lucide-react";
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

// ── Reusable typographic tokens (editorial-luxury direction) ───────────────
//
// Champagne accent + warm-ink palette in dark mode, scoped to /list via the
// `list-editorial` wrapper class on <main>. Paper-grain noise + radial gold
// gradients sit beneath the content for atmosphere without competing with it.
//
// Tokens read CSS variables defined in the <style> block below so the palette
// is centralised — change one --ink-X value and every text class follows.

const EYEBROW =
  "font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[var(--ink-60)] font-normal";
const PILL_EYEBROW =
  "inline-flex items-center gap-[10px] font-[family-name:var(--font-geist-mono)] text-[10.5px] uppercase tracking-[0.24em] text-[var(--ink-60)] font-normal";
const HAIRLINE = "border-t border-[var(--bg-rule)]";
const SERIF = "font-[family-name:var(--font-display)]";
const MONO = "font-[family-name:var(--font-geist-mono)] tabular-nums";

// Lucide defaults to strokeWidth=2 which reads as "tech-ish" rather than
// editorial. Pin every icon on this page to 1.4 for an ultra-light precision
// line that pairs with the serif display face.
const ICON_STROKE = 1.4 as const;

// ── Editorial-luxury atmosphere (palette + paper grain + gold gradients) ──
//
// Scoped to <main class="list-editorial"> so the rest of the app keeps its
// existing tone. The CSS-vars cascade (ink-100..ink-30, accent, bg-rule,
// tier-*) drives every text class on the page; change a value here, every
// element updates. Paper grain is a fixed pseudo-element (`pointer-events-
// none`, GPU-cheap), the radial gold blooms are painted on the wrapper.

function EditorialAtmosphere() {
  return (
    <style>{`
      .list-editorial {
        --bg-rule: rgba(255, 255, 255, 0.07);
        --bg-rule-strong: rgba(255, 255, 255, 0.14);
        --ink-100: #f4f1ea;
        --ink-80:  #d9d4ca;
        --ink-60:  #a09a90;
        --ink-40:  #6b665e;
        --ink-30:  #4d4943;
        --ink-20:  #34322e;
        --accent:        #c9a96a;
        --accent-soft:   rgba(201, 169, 106, 0.14);
        --accent-strong: #d8bb7e;
        --tier-safety:   #8fb89a;
        --tier-likely:   #88a4c4;
        --tier-target:   #c9a96a;
        --tier-reach:    #c98a5c;
        --tier-unlikely: #b8675b;
        --tier-insuf:    #5a5750;
        position: relative;
      }
      .list-editorial::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        background:
          radial-gradient(1200px 700px at 8% -10%, rgba(201,169,106,0.06), transparent 55%),
          radial-gradient(900px 600px at 110% 20%, rgba(201,169,106,0.03), transparent 60%),
          radial-gradient(800px 500px at 50% 110%, rgba(255,255,255,0.02), transparent 60%);
      }
      .list-editorial::after {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>");
        opacity: 0.35;
        mix-blend-mode: overlay;
      }
      .list-editorial > * { position: relative; z-index: 2; }

      /* Engraved letter — gold-leaf gradient text fill */
      .grade-letter-gold {
        background: linear-gradient(180deg, #f4f1ea 0%, #c9a96a 70%, #8a7340 100%);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 0 60px rgba(201, 169, 106, 0.15);
      }

      /* Corner-bracketed frame */
      .corner-frame {
        position: relative;
        border: 1px solid var(--bg-rule);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0)),
          rgba(13, 13, 19, 0.55);
      }
      .corner-frame::before,
      .corner-frame::after {
        content: "";
        position: absolute;
        width: 12px;
        height: 12px;
        border: 1px solid var(--accent);
        opacity: 0.55;
      }
      .corner-frame::before {
        top: -1px;
        left: -1px;
        border-right: 0;
        border-bottom: 0;
      }
      .corner-frame::after {
        bottom: -1px;
        right: -1px;
        border-left: 0;
        border-top: 0;
      }

      /* Sub-score gradient meter — overflows the 1px hairline 3px above and
         below for an engraved gold-foil look. */
      .sub-meter {
        position: relative;
        height: 1px;
        background: var(--bg-rule);
        overflow: hidden;
      }
      .sub-meter::after {
        content: "";
        position: absolute;
        top: -3px;
        bottom: -3px;
        left: 0;
        width: var(--w, 0%);
        height: 7px;
        background: linear-gradient(90deg, transparent, var(--accent));
        transition: width 1.2s cubic-bezier(0.32, 0.72, 0, 1);
      }
    `}</style>
  );
}

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
      <EditorialAtmosphere />
      <main className="list-editorial mx-auto max-w-[1100px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vw,96px)] pb-32 font-[family-name:var(--font-geist-sans)] text-[var(--ink-80)]">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
          className="mb-[clamp(56px,9vw,96px)] border-t border-[var(--bg-rule)] pt-7 grid gap-6"
        >
          <span className={PILL_EYEBROW}>
            <span className="size-[5px] rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(201,169,106,0.6)]" />
            Your application cycle
          </span>
          <h1
            className={`${SERIF} text-[clamp(48px,8.5vw,96px)] font-light leading-[1.08] tracking-[-0.025em] text-[var(--ink-100)] m-0 pb-[0.22em]`}
          >
            The list,
            <br />
            <em className="not-italic [font-style:italic] font-normal text-[var(--accent)]">graded.</em>
          </h1>
          <p className="mt-14 max-w-[56ch] text-[15px] leading-[1.65] text-[var(--ink-60)] font-light">
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
      className="list-editorial mx-auto max-w-[1100px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vw,96px)] pb-32 font-[family-name:var(--font-geist-sans)] animate-pulse"
    >
      <div className="mb-[clamp(56px,9vw,96px)] border-t border-[var(--bg-rule)] pt-7">
        <SkeletonBar className="h-[18px] w-44 rounded-full" />
        <SkeletonBar className="mt-6 h-[72px] w-3/4 max-w-2xl" />
        <SkeletonBar className="mt-14 h-3 w-full max-w-xl" />
        <SkeletonBar className="mt-2 h-3 w-2/3 max-w-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-y-10 md:gap-x-10">
        <div className="md:col-span-7 flex items-end gap-5 sm:gap-7">
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
    <div className="corner-frame rounded-[4px] px-8 sm:px-14 py-14 sm:py-20">
      <span className={PILL_EYEBROW}>
        <span className="size-[5px] rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(201,169,106,0.6)]" />
        No schools pinned
      </span>
      <h2 className={`${SERIF} mt-5 text-[clamp(28px,4.5vw,40px)] font-light text-[var(--ink-100)] leading-[1.08] tracking-[-0.02em]`}>
        Start by pinning a few schools.
      </h2>
      <p className="mt-4 max-w-md text-[14px] text-[var(--ink-60)] leading-[1.65] font-light">
        We grade the list on tier balance, count, ED leverage, financial mix,
        geographic diversity, and major fit. Aim for 8–12 schools across reach,
        target, likely, and safety.
      </p>
      <Link
        href="/colleges"
        className="group/cta mt-8 inline-flex items-center gap-2.5 rounded-full border border-[var(--bg-rule-strong)] bg-white/[0.02] pl-4 pr-1 py-1 text-[12.5px] font-medium text-[var(--ink-100)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-[color,border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
      >
        Browse colleges
        <span className="flex items-center justify-center size-6 rounded-full bg-[var(--accent)] text-[#1a1410] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5">
          <ArrowRight className="w-3 h-3" strokeWidth={ICON_STROKE} />
        </span>
      </Link>
    </div>
  );
}

// ── Hero: corner-bracketed frame + gold-leaf letter + reasons ─────────────

function GradeMasthead({ grade }: { grade: GradeResult }) {
  // Balance / Major scores feed the gradient sub-meters under the score.
  const balancePct = Math.max(0, Math.min(100, grade.balanceScore));
  const majorPct = Math.max(0, Math.min(100, grade.majorScore));
  const reasonsCount = Math.min(5, grade.reasons.length);
  return (
    <section aria-labelledby="grade-masthead">
      <SectionHead title="Official grade" aside="(balance + major) ÷ 2" id="grade-masthead" />
      <div className="mt-9 grid grid-cols-1 md:grid-cols-[1.05fr_1fr] gap-y-12 md:gap-x-[clamp(32px,6vw,80px)] items-stretch">
        {/* Engraved letter card with corner brackets */}
        <div className="corner-frame rounded-[4px] p-8 flex items-center">
          <div className="grid grid-cols-[auto_1fr] gap-8 items-center w-full">
            <span
              aria-label={`Grade: ${grade.letter}`}
              className={`${SERIF} grade-letter-gold font-light leading-[0.78] tracking-[-0.05em] text-[clamp(120px,18vw,180px)]`}
            >
              {grade.letter}
            </span>
            <div>
              <div className={`${MONO} text-[32px] font-normal leading-none tracking-[-0.02em] text-[var(--ink-100)]`}>
                {grade.officialScore.toFixed(1)}
                <span className="text-[var(--ink-40)]"> / 100</span>
              </div>
              <div className={`${MONO} mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--ink-40)]`}>
                Composite score
              </div>
              <div className="mt-6 grid gap-[10px] border-t border-[var(--bg-rule)] pt-4">
                <SubScoreRow label="Balance" value={grade.balanceScore} pct={balancePct} />
                <SubScoreRow label="Major fit" value={grade.majorScore} pct={majorPct} />
              </div>
            </div>
          </div>
        </div>

        {/* Why this grade — numbered editorial reasons */}
        <div>
          <div className="flex items-baseline justify-between pb-[14px] border-b border-[var(--bg-rule)] mb-1.5">
            <span className={`${MONO} text-[10.5px] uppercase tracking-[0.22em] text-[var(--ink-60)]`}>
              <em className={`${SERIF} not-italic [font-style:italic] font-light text-[var(--accent)] mr-1.5 normal-case tracking-normal`}>Why</em>
              this grade
            </span>
            <span className={`${MONO} text-[10.5px] uppercase tracking-[0.24em] text-[var(--ink-40)]`}>
              {String(reasonsCount).padStart(2, "0")}
            </span>
          </div>
          <ol className="list-none p-0 m-0">
            {grade.reasons.slice(0, 5).map((r, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 + i * 0.06, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="grid grid-cols-[36px_1fr] gap-4 py-[18px] border-b border-[var(--bg-rule)] last:border-b-0"
              >
                <span className={`${MONO} text-[11px] text-[var(--accent)]`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="m-0 text-[14px] leading-[1.55] text-[var(--ink-80)] font-light">{r}</p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function SubScoreRow({ label, value, pct }: { label: string; value: number; pct: number }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] gap-[14px] items-center">
      <span className={`${MONO} text-[10.5px] uppercase tracking-[0.18em] text-[var(--ink-60)] w-[70px]`}>
        {label}
      </span>
      <span className="sub-meter" style={{ ["--w" as string]: `${pct}%` }} />
      <span className={`${MONO} text-[12.5px] text-[var(--ink-100)] min-w-[56px] text-right`}>
        {value.toFixed(1)}
        <span className="text-[var(--ink-40)]"> / 100</span>
      </span>
    </div>
  );
}

function SectionHead({ title, aside, id }: { title: string; aside?: string; id?: string }) {
  return (
    <header className="flex items-baseline justify-between gap-5 mb-9 pb-[14px] border-b border-[var(--bg-rule)]">
      <span
        id={id}
        className={`${SERIF} font-light text-[26px] tracking-[-0.01em] text-[var(--ink-100)]`}
      >
        {title}
      </span>
      {aside && (
        <span className={`${MONO} text-[11px] uppercase tracking-[0.18em] text-[var(--ink-40)]`}>
          {aside}
        </span>
      )}
    </header>
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
      <SectionHead title="Breakdown" aside="Two columns" id="grade-breakdown" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[clamp(32px,5vw,64px)] gap-y-10">
        <BreakdownColumn title="Balance" weight="40 + 25 + 20 + 10 + 5 = 100" rows={balanceRows} />
        <BreakdownColumn
          title="Major fit"
          weight="70% avg-fit · 30% program-strong"
          rows={majorRows}
          endnote="A composite of not just acceptance probability, but the shape of the list itself — its proportions, its conviction, its readability."
        />
      </div>
    </section>
  );
}

function BreakdownColumn({
  title, weight, rows, endnote,
}: {
  title: string;
  weight: string;
  rows: readonly BreakdownRow[];
  endnote?: string;
}) {
  const total = rows.reduce((s, r) => s + r.score, 0);
  const totalOut = rows.reduce((s, r) => s + r.out, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between pb-3 mb-2.5 border-b border-[var(--bg-rule-strong)]">
        <h3 className={`${SERIF} font-light text-[22px] tracking-[-0.01em] text-[var(--ink-100)] leading-none`}>
          {title} <em className="not-italic [font-style:italic] text-[var(--ink-60)]">·</em>
        </h3>
        <div className={`${MONO} text-[14px] text-[var(--ink-100)]`}>
          {total.toFixed(1)}
          <span className="text-[var(--ink-40)]"> / {totalOut}</span>
        </div>
      </div>
      <p className={`${MONO} text-[10px] uppercase tracking-[0.18em] text-[var(--ink-40)] mt-1 mb-4`}>
        {weight}
      </p>
      <div>
        {rows.map((r, i) => {
          const pct = Math.max(0, Math.min(100, (r.score / r.out) * 100));
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] gap-x-[14px] py-[18px] border-b border-[var(--bg-rule)] last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] text-[var(--ink-100)]">{r.label}</div>
                <p className="mt-1.5 text-[12px] text-[var(--ink-60)] leading-[1.5] font-light max-w-[50ch]">
                  {r.note}
                </p>
              </div>
              <div className="text-right">
                <div className={`${MONO} text-[13px] text-[var(--ink-100)]`}>
                  {r.score.toFixed(1)}
                  <span className="text-[var(--ink-40)]"> / {r.out}</span>
                </div>
                <div className="mt-2.5 ml-auto w-[88px] h-px bg-[var(--bg-rule)] relative overflow-hidden">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-[var(--accent)] transition-[width] duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {endnote && (
        <p
          className={`${SERIF} mt-8 italic font-light text-[14px] leading-[1.6] text-[var(--ink-60)] max-w-[50ch]`}
        >
          {endnote}
        </p>
      )}
    </div>
  );
}

// ── Tier strip — fine 1px segments, tabular figures above ─────────────────

const TIER_VAR: Record<TierKey, string> = {
  safety: "var(--tier-safety)",
  likely: "var(--tier-likely)",
  target: "var(--tier-target)",
  reach: "var(--tier-reach)",
  unlikely: "var(--tier-unlikely)",
  insufficient: "var(--tier-insuf)",
};

function tierToleranceStatus(counts: GradeResult["tierCounts"]): string {
  const total = counts.total;
  if (total === 0) return "Awaiting pins";
  const reachShare = (counts.reach + counts.unlikely) / total;
  const safetyShare = (counts.safety + counts.likely) / total;
  if (reachShare > 0.55 || safetyShare > 0.45) return "Out of tolerance";
  if (reachShare < 0.2 || safetyShare < 0.1) return "Skew detected";
  return "Within tolerance";
}

function TierStrip({ counts }: { counts: GradeResult["tierCounts"] }) {
  const denom = counts.total || 1;
  const status = tierToleranceStatus(counts);
  return (
    <section aria-labelledby="tier-strip">
      <SectionHead title="Tier distribution" aside={`${counts.total} pinned`} id="tier-strip" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-[14px] gap-y-6 sm:gap-y-0 sm:gap-x-[18px]">
        {TIER_KEYS.map((tier) => {
          const n = counts[tier];
          const pct = n / denom;
          return (
            <div key={tier} className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between text-[12px] text-[var(--ink-80)]">
                <span>{TIER_LABEL[tier]}</span>
                <span className={`${MONO} text-[12px] text-[var(--ink-100)]`}>{n}</span>
              </div>
              <div className="h-px bg-[var(--bg-rule)] relative overflow-hidden">
                <div
                  className="absolute inset-0 transition-[width] duration-[1200ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
                  style={{
                    width: `${pct * 100}%`,
                    minWidth: n > 0 ? "12%" : 0,
                    background: TIER_VAR[tier],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-[22px] flex flex-wrap justify-between items-baseline gap-4">
        <span className={`${SERIF} italic text-[13.5px] text-[var(--ink-60)] font-light`}>
          Ideal target —{" "}
          <em className="not-italic [font-style:italic] text-[var(--accent)]">
            ~30% reach · 30% target · 25% likely · 15% safety
          </em>
        </span>
        <span className={`${MONO} text-[10.5px] uppercase tracking-[0.22em] text-[var(--ink-40)]`}>
          {status}
        </span>
      </div>
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
      <SectionHead
        title="Your pinned schools"
        aside={`${sorted.length} ${sorted.length === 1 ? "school" : "schools"}`}
        id="pinned-heading"
      />
      <div className="flex justify-end -mt-4 mb-6">
        <Link
          href="/colleges"
          className="group/link inline-flex items-center gap-2.5 rounded-full border border-[var(--bg-rule-strong)] bg-white/[0.02] pl-4 pr-1 py-1 text-[12.5px] font-medium text-[var(--ink-100)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-[color,border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
        >
          Browse more
          <span className="flex items-center justify-center size-6 rounded-full bg-[var(--accent)] text-[#1a1410] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/link:translate-x-0.5">
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
          <SectionHead title="Engine suggestions" aside="Within tolerance" />
          <p className={`${SERIF} text-[26px] sm:text-[30px] font-light text-[var(--ink-100)] max-w-2xl leading-tight tracking-[-0.01em]`}>
            Your list is <em className="not-italic [font-style:italic] text-[var(--accent)]">solid.</em>
          </p>
          <p className="mt-4 max-w-md text-[14px] text-[var(--ink-60)] leading-[1.6] font-light">
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
      ? "Swap-only"
      : listSize >= 8
      ? "Targeted swaps"
      : "Filling toward 8–12";

  return (
    <section aria-labelledby="recs-heading">
      <SectionHead title="Engine suggestions" aside={mode} id="recs-heading" />
      <ol className="border-t border-[var(--bg-rule)] list-none p-0 m-0">
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
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="group grid grid-cols-[40px_1fr] sm:grid-cols-[56px_1fr_auto_auto] gap-x-6 gap-y-3.5 px-2 py-6 items-baseline border-b border-[var(--bg-rule)] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.015]"
    >
      <span className={`${MONO} text-[11px] text-[var(--ink-40)] self-start pt-1.5`}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3.5 flex-wrap">
          <h4 className={`${SERIF} font-light text-[clamp(22px,2.4vw,28px)] leading-[1.05] tracking-[-0.015em] text-[var(--ink-100)] m-0`}>
            {rec.college.name}
          </h4>
          {rec.kind === "swap" && rec.replaces && (
            <span className={`${SERIF} italic text-[13px] text-[var(--ink-40)] inline-flex items-center gap-1.5`}>
              <X className="w-[11px] h-[11px]" strokeWidth={ICON_STROKE} />
              {rec.replaces}
            </span>
          )}
        </div>
        <p className="mt-2 text-[13.5px] text-[var(--ink-60)] leading-[1.6] font-light max-w-[64ch]">
          {rec.rationale}
        </p>
      </div>
      <div className="hidden sm:block text-right">
        <div className={`${MONO} text-[14px] text-[var(--accent)]`}>
          +{rec.gradeDelta.toFixed(1)}
        </div>
        <div className={`${MONO} text-[9.5px] uppercase tracking-[0.22em] text-[var(--ink-40)] mt-1`}>
          grade
        </div>
      </div>
      {/* Desktop: champagne CTA pill */}
      <button
        type="button"
        onClick={apply}
        aria-label={rec.kind === "swap" ? `Swap in ${rec.college.name}` : `Pin ${rec.college.name}`}
        className="group/cta hidden sm:inline-flex items-center gap-2.5 rounded-full border border-[var(--bg-rule-strong)] bg-white/[0.02] pl-4 pr-1 py-1 text-[12.5px] font-medium text-[var(--ink-100)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-[color,border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
      >
        {rec.kind === "swap" ? "Swap in" : "Pin"}
        <span className="flex items-center justify-center size-6 rounded-full bg-[var(--accent)] text-[#1a1410] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5">
          {rec.kind === "swap" ? (
            <RefreshCw className="w-3 h-3" strokeWidth={ICON_STROKE} />
          ) : (
            <Plus className="w-3 h-3" strokeWidth={ICON_STROKE} />
          )}
        </span>
      </button>
      {/* Mobile: full-row CTA — shows delta + champagne pill */}
      <div className="sm:hidden col-span-2 -mt-1 flex items-center justify-between gap-3">
        <div className="text-left">
          <span className={`${MONO} text-[14px] text-[var(--accent)]`}>+{rec.gradeDelta.toFixed(1)}</span>
          <span className={`${MONO} ml-2 text-[9.5px] uppercase tracking-[0.22em] text-[var(--ink-40)]`}>grade</span>
        </div>
        <button
          type="button"
          onClick={apply}
          aria-label={rec.kind === "swap" ? `Swap in ${rec.college.name}` : `Pin ${rec.college.name}`}
          className="group/cta inline-flex items-center gap-2.5 rounded-full border border-[var(--bg-rule-strong)] bg-white/[0.02] pl-4 pr-1 py-1 text-[12.5px] font-medium text-[var(--ink-100)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] transition-[color,border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.97]"
        >
          {rec.kind === "swap" ? "Swap in" : "Pin"}
          <span className="flex items-center justify-center size-6 rounded-full bg-[var(--accent)] text-[#1a1410] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/cta:translate-x-0.5">
            {rec.kind === "swap" ? (
              <RefreshCw className="w-3 h-3" strokeWidth={ICON_STROKE} />
            ) : (
              <Plus className="w-3 h-3" strokeWidth={ICON_STROKE} />
            )}
          </span>
        </button>
      </div>
    </motion.li>
  );
}

