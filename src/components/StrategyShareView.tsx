"use client";

// Read-only public view of a shared strategy snapshot.
// Reuses StrategyCard (the card shell + expand/collapse). Section bodies
// mirror /strategy's structure but strip interactive pieces (action
// checklist, re-run button, dream-school picker, missing-data CTAs).

import React from "react";
import {
  Compass,
  Target,
  Star,
  TrendingUp,
  AlertTriangle,
  GraduationCap,
  School,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { StrategyCard } from "./StrategyCard";
import type { StrategyShareSnapshot } from "@/lib/strategy-share-types";
import type {
  AcademicTier,
  ECStrengthTier,
  EdVerdict,
} from "@/lib/strategy-types";
import type { Classification } from "@/lib/college-types";
import { APPLICATION_PLAN_LABELS } from "@/lib/college-types";
import { computeDeadlines } from "@/lib/deadlines";

const TIER_LABEL: Record<AcademicTier, string> = {
  elite: "Elite",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
};

const EC_LABEL: Record<ECStrengthTier, string> = {
  exceptional: "Exceptional",
  strong: "Strong",
  solid: "Solid",
  developing: "Developing",
  limited: "Limited",
  missing: "No data",
};

const PERCENTILE_LABEL: Record<string, string> = {
  "top-10": "Top 10%",
  "top-25": "Top 25%",
  "top-50": "Top 50%",
  "bottom-50": "Bottom 50%",
};

const CLASSIFICATION_TEXT: Record<Classification, string> = {
  safety: "text-emerald-300",
  likely: "text-blue-300",
  target: "text-amber-300",
  reach: "text-orange-300",
  unlikely: "text-red-300",
};

export interface StrategyShareViewProps {
  readonly snapshot: StrategyShareSnapshot;
  readonly expiresAt: string;
}

export const StrategyShareView: React.FC<StrategyShareViewProps> = ({
  snapshot,
  expiresAt,
}) => {
  const { result, analysis, profileMeta, capturedAt } = snapshot;

  const capturedDate = new Date(capturedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const expires = new Date(expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Deadlines: derive from the captured pinned list + plans. Static once
  // rendered — this is a snapshot, not a live view — but we still compute
  // days-away relative to "today" so rolling / upcoming labels stay meaningful.
  const deadlineEntries = profileMeta.pinnedNames
    .map((name) => ({
      name,
      pinnedAt: 0,
      applicationPlan: profileMeta.pinnedPlans[name] as
        | "RD" | "EA" | "REA" | "SCEA" | "ED" | "ED2" | "Rolling" | undefined,
    }))
    .filter((p) => p.applicationPlan);

  const deadlines = computeDeadlines(deadlineEntries, new Date());

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)]">
      {/* Banner */}
      <div className="mb-6 rounded-xl border border-white/[0.08] bg-[#0c0c1a]/80 p-4 flex items-start gap-3">
        <Compass className="w-4 h-4 text-blue-300 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-zinc-200 font-semibold">
            Shared strategy briefing — snapshot from {capturedDate}.{" "}
            <span className="text-zinc-500 font-normal">Not live.</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Link expires {expires}.
            {profileMeta.intendedMajor
              ? ` Intended major: ${profileMeta.intendedMajor}.`
              : ""}
            {profileMeta.graduationYear
              ? ` Class of ${profileMeta.graduationYear}.`
              : ""}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Snapshot */}
        <StrategyCard
          icon={<Target className="w-4 h-4" />}
          title="Snapshot"
          strength="neutral"
          headline={`${TIER_LABEL[analysis.academic.tier]} academics · ${EC_LABEL[analysis.ec.tier]} ECs · ${PERCENTILE_LABEL[analysis.positioning.percentileEstimate] ?? ""}`}
          defaultExpanded
        >
          <div className="space-y-4 pt-3">
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
              {result.profileSummary.body}
            </p>
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1">
                Competitiveness Positioning
              </p>
              <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.competitiveness.body}
              </p>
            </div>
          </div>
        </StrategyCard>

        {/* Dream School — only if snapshot captured one */}
        {result.dreamSchool && (
          <StrategyCard
            icon={<Star className="w-4 h-4" />}
            title="Dream School"
            strength="neutral"
            headline={result.dreamSchool.schoolName}
            emphasize
            defaultExpanded
          >
            <div className="space-y-4 pt-3">
              <EdVerdictBlock
                verdict={result.dreamSchool.edVerdict}
                headline={result.dreamSchool.verdictHeadline}
              />
              <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
                {result.dreamSchool.reasoning}
              </p>
              {result.dreamSchool.whatWouldChangeThis.length > 0 && (
                <ul className="space-y-2">
                  {result.dreamSchool.whatWouldChangeThis.map((lever, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed">
                      <span className="text-blue-300 mt-0.5 shrink-0">→</span>
                      <span>{lever}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </StrategyCard>
        )}

        {/* Spike */}
        <StrategyCard
          icon={<TrendingUp className="w-4 h-4" />}
          title="Spike Analysis"
          strength="neutral"
          headline={
            analysis.spike.primary
              ? `${analysis.spike.primary} · ${analysis.spike.clarity}`
              : "No clear spike"
          }
        >
          <div className="space-y-3 pt-3">
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
              {result.spikeAnalysis.body}
            </p>
            {analysis.spike.signals.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysis.spike.signals.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </StrategyCard>

        {/* Gaps */}
        <StrategyCard
          icon={<AlertTriangle className="w-4 h-4" />}
          title="Gaps"
          strength="neutral"
          headline={`${analysis.weaknesses.length} flagged`}
        >
          <div className="space-y-2 pt-3">
            {result.weaknessDiagnosis.body && (
              <p className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line">
                {result.weaknessDiagnosis.body}
              </p>
            )}
            {analysis.weaknesses.map((w) => (
              <div
                key={w.code}
                className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2"
              >
                <p className="text-[13px] text-zinc-200 font-semibold">{w.label}</p>
                <p className="text-[12px] text-zinc-500 leading-snug">{w.detail}</p>
              </div>
            ))}
          </div>
        </StrategyCard>

        {/* Major recommendations */}
        {(analysis.majorRecommendations.intendedMajor ||
          analysis.majorRecommendations.intendedInterest) && (
          <StrategyCard
            icon={<GraduationCap className="w-4 h-4" />}
            title="Recommended for Your Major"
            strength="neutral"
            headline={
              analysis.majorRecommendations.intendedMajor ??
              analysis.majorRecommendations.intendedInterest ??
              ""
            }
          >
            <div className="space-y-4 pt-3">
              <RecGroup
                label="Safety"
                color="text-emerald-400"
                items={analysis.majorRecommendations.fromPinned.safeties}
              />
              <RecGroup
                label="Target"
                color="text-amber-400"
                items={analysis.majorRecommendations.fromPinned.targets}
              />
              <RecGroup
                label="Reach"
                color="text-orange-400"
                items={analysis.majorRecommendations.fromPinned.reaches}
              />
              {analysis.majorRecommendations.toConsider.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-2">
                    Worth considering
                  </p>
                  <div className="space-y-1.5">
                    {analysis.majorRecommendations.toConsider.map((c) => (
                      <p key={c.college.name} className="text-[13px] text-zinc-200">
                        {c.college.name}{" "}
                        <span className="text-zinc-500 text-[11px]">
                          · {c.college.acceptanceRate}% accept
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </StrategyCard>
        )}

        {/* School list */}
        <StrategyCard
          icon={<School className="w-4 h-4" />}
          title="School List Strategy"
          strength="neutral"
          headline={`${analysis.schoolList.total} pinned · ${analysis.schoolList.balance}`}
        >
          <div className="space-y-2 pt-3">
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
              {result.schoolListStrategy.body}
            </p>
            {analysis.schoolList.warnings.length > 0 && (
              <ul className="mt-2 space-y-1">
                {analysis.schoolList.warnings.map((w, i) => (
                  <li key={i} className="text-[12px] text-amber-300/90">
                    · {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </StrategyCard>

        {/* Application strategy */}
        <StrategyCard
          icon={<ArrowRight className="w-4 h-4" />}
          title="Application Strategy"
          strength="neutral"
          headline={`${analysis.earlyStrategy.length} schools · per-school plan`}
        >
          <div className="space-y-2 pt-3">
            <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
              {result.applicationStrategy.body}
            </p>
            {result.applicationStrategy.bullets &&
              result.applicationStrategy.bullets.length > 0 && (
                <ul className="space-y-1.5">
                  {result.applicationStrategy.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed"
                    >
                      <span className="text-zinc-500 mt-0.5 shrink-0">→</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </StrategyCard>

        {/* Deadlines */}
        <StrategyCard
          icon={<CalendarClock className="w-4 h-4" />}
          title="Upcoming Deadlines"
          strength="neutral"
          headline={
            deadlines.length === 0
              ? "No plans set"
              : `${deadlines.length} upcoming`
          }
        >
          <div className="pt-3">
            {deadlines.length === 0 ? (
              <p className="text-[13px] text-zinc-400 leading-relaxed">
                No application plans were set on pinned schools at the time of
                this snapshot.
              </p>
            ) : (
              <ul className="space-y-2">
                {deadlines.map((e, i) => (
                  <li
                    key={`${e.schoolName}-${e.plan}-${i}`}
                    className="flex items-baseline justify-between gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-zinc-200 font-semibold truncate">
                        {e.schoolName}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {APPLICATION_PLAN_LABELS[e.plan]}
                      </p>
                    </div>
                    {e.isRolling ? (
                      <span className="text-[11px] text-zinc-500 text-right shrink-0">
                        Rolling
                      </span>
                    ) : (
                      <span className="text-[12px] font-mono tabular-nums text-zinc-400 shrink-0">
                        {e.date!.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </StrategyCard>
      </div>

      <p className="mt-8 text-center text-[11px] text-zinc-600">
        Shared via AdmitEdge.
        {" "}Want your own briefing?{" "}
        <a href="/" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2">
          Start here.
        </a>
      </p>
    </main>
  );
};

// Reused from strategy/page.tsx's EdVerdictBlock — duplicated here so the
// share view has no dependency on that local symbol. Kept minimal.
const EDV_STYLES: Record<
  EdVerdict,
  { bg: string; ring: string; text: string; icon: React.ElementType; label: string }
> = {
  yes: { bg: "bg-emerald-500/[0.08]", ring: "ring-emerald-400/40", text: "text-emerald-200", icon: CheckCircle2, label: "ED: YES" },
  conditional: { bg: "bg-amber-500/[0.08]", ring: "ring-amber-400/40", text: "text-amber-200", icon: AlertTriangle, label: "ED: CONDITIONAL" },
  no: { bg: "bg-red-500/[0.08]", ring: "ring-red-400/40", text: "text-red-200", icon: XCircle, label: "ED: NO" },
};

function EdVerdictBlock({ verdict, headline }: { verdict: EdVerdict; headline: string }) {
  const s = EDV_STYLES[verdict];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl ${s.bg} ring-1 ${s.ring} p-4 flex items-center gap-3`}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/[0.04]">
        <Icon className={`w-5 h-5 ${s.text}`} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-[0.18em] font-bold ${s.text} mb-0.5`}>
          {s.label}
        </p>
        <p className="text-[14px] text-zinc-100 font-semibold leading-snug">{headline}</p>
      </div>
    </div>
  );
}

function RecGroup({
  label,
  color,
  items,
}: {
  label: string;
  color: string;
  items: ReadonlyArray<{ college: { name: string; acceptanceRate: number }; classification: Classification; matchReason?: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className={`text-[10px] uppercase tracking-[0.12em] font-semibold ${color} mb-1.5`}>
        {label}
      </p>
      <div className="space-y-1.5">
        {items.map((c) => (
          <div
            key={c.college.name}
            className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5 flex items-baseline justify-between gap-2"
          >
            <span className="text-[13px] text-zinc-200 font-semibold truncate">
              {c.college.name}
            </span>
            <span
              className={`text-[11px] font-mono tabular-nums shrink-0 ${CLASSIFICATION_TEXT[c.classification]}`}
            >
              {c.college.acceptanceRate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
