"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Target,
  TrendingUp,
  Bookmark,
} from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useStrategy } from "@/hooks/useStrategy";
import type { StrategyResultSection, WeaknessSeverity } from "@/lib/strategy-types";

const SEVERITY_STYLES: Record<WeaknessSeverity, { text: string; bg: string; ring: string }> = {
  critical: { text: "text-red-300", bg: "bg-red-500/10", ring: "ring-red-500/30" },
  high: { text: "text-orange-300", bg: "bg-orange-500/10", ring: "ring-orange-500/30" },
  medium: { text: "text-amber-300", bg: "bg-amber-500/10", ring: "ring-amber-500/30" },
  low: { text: "text-blue-300", bg: "bg-blue-500/10", ring: "ring-blue-500/30" },
};

export default function StrategyPage() {
  const { profile, analysis, result, loading, error, generate } = useStrategy();

  const hasEnoughData = profile?.hasPinnedSchools && profile?.hasGpa;
  const isEmpty = !profile || !profile.hasPinnedSchools;

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-4xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        {/* ── Header ─────────────────────────────────────────────── */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] border border-white/[0.08] px-3 py-1 mb-4">
            <Compass className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[11px] uppercase tracking-[0.15em] text-zinc-400 font-medium">
              Strategy Engine
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">Your Strategic Briefing</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            A top-tier consultant's read of your full profile — specific, direct, and actionable.
          </p>
        </motion.div>

        {/* ── Empty state: no pinned schools ─────────────────────── */}
        {isEmpty && (
          <ScrollReveal delay={0.1}>
            <EmptyState />
          </ScrollReveal>
        )}

        {/* ── Main state: has enough to generate ─────────────────── */}
        {!isEmpty && (
          <>
            {/* Missing-data banner */}
            {analysis && analysis.missingData.length > 0 && !result && (
              <ScrollReveal delay={0.1}>
                <MissingDataBanner items={analysis.missingData} />
              </ScrollReveal>
            )}

            {/* Generate / Re-run button */}
            <ScrollReveal delay={0.12}>
              <div className="flex items-center justify-center gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => generate({ bypassCache: result != null })}
                  disabled={loading || !hasEnoughData}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating strategy...
                    </>
                  ) : result ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Re-run with latest data
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Strategy
                    </>
                  )}
                </button>
              </div>
            </ScrollReveal>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-8">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Pre-generation hint */}
            {!result && !loading && !error && (
              <ScrollReveal delay={0.15}>
                <PreGenerationHint />
              </ScrollReveal>
            )}

            {/* Result */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div
                  key={result.generatedAt}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className="space-y-5"
                >
                  {/* Deterministic weakness chips — ground truth */}
                  {analysis && analysis.weaknesses.length > 0 && (
                    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-sm font-semibold text-zinc-200">
                          Flagged weaknesses
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.weaknesses.slice(0, 8).map((w) => {
                          const s = SEVERITY_STYLES[w.severity];
                          return (
                            <span
                              key={w.code}
                              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ring-1 ${s.bg} ${s.text} ${s.ring}`}
                              title={w.detail}
                            >
                              {w.severity}
                              <span className="text-zinc-500">·</span>
                              {w.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <SectionCard icon={<Target className="w-4 h-4" />} section={result.profileSummary} />
                  <SectionCard icon={<TrendingUp className="w-4 h-4" />} section={result.spikeAnalysis} />
                  <SectionCard icon={<AlertTriangle className="w-4 h-4" />} section={result.weaknessDiagnosis} />
                  <SectionCard icon={<Bookmark className="w-4 h-4" />} section={result.schoolListStrategy} />
                  <SectionCard icon={<ArrowRight className="w-4 h-4" />} section={result.applicationStrategy} />
                  <SectionCard
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    section={result.actionPlan}
                    emphasize
                  />
                  <SectionCard icon={<Compass className="w-4 h-4" />} section={result.competitiveness} />

                  <p className="text-center text-[11px] text-zinc-600 pt-4">
                    Generated {new Date(result.generatedAt).toLocaleString()} · Based on your pinned list, GPA, test
                    scores, and any EC/essay data. Re-run after changes.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>
    </AuroraBackground>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
        <Bookmark className="w-6 h-6 text-blue-300" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">
        Pin your target schools first
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
        The Strategy Engine analyzes <em>your</em> pinned college list — not a generic database.
        Head to the College List Builder, find the schools you're actually considering, and
        pin them with the bookmark icon.
      </p>
      <Link
        href="/colleges"
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
      >
        Go to College List Builder
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

function MissingDataBanner({ items }: { items: readonly string[] }) {
  return (
    <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-4 mb-8">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-amber-200 font-semibold mb-1">
            Missing data will weaken this analysis
          </p>
          <p className="text-[13px] text-zinc-400 leading-relaxed">
            For sharper output, add: {items.join(" · ")}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreGenerationHint() {
  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] p-8 text-center">
      <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
        Click <span className="text-zinc-200 font-semibold">Generate Strategy</span> above to run
        the analyzers and produce your consultant-style briefing. First generation takes 10–20
        seconds — subsequent runs are instant unless your profile changes.
      </p>
    </div>
  );
}

function SectionCard({
  section,
  icon,
  emphasize = false,
}: {
  section: StrategyResultSection;
  icon: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        emphasize
          ? "bg-blue-500/[0.03] border-blue-500/20"
          : "bg-[#0f0f1c] border-white/[0.06]"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            emphasize ? "bg-blue-500/15 text-blue-300" : "bg-white/[0.04] text-zinc-400"
          }`}
        >
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
          {section.title}
        </h3>
      </div>
      <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-line">
        {section.body}
      </p>
      {section.bullets && section.bullets.length > 0 && (
        <ul className="mt-4 space-y-2">
          {section.bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[13px] text-zinc-300 leading-relaxed"
            >
              <span
                className={`mt-0.5 shrink-0 ${
                  emphasize ? "text-blue-300" : "text-zinc-500"
                }`}
              >
                →
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
