"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  Compass,
  GraduationCap,
  School,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { StrategyCard } from "@/components/StrategyCard";
import { DreamSchoolSelector } from "@/components/DreamSchoolSelector";
import { SectionNav } from "@/components/SectionNav";
import { StrategyShareButton } from "@/components/StrategyShareButton";
import { StrategyAtlas } from "@/components/strategy/StrategyAtlas";
import { SnapshotBody } from "@/components/strategy/SnapshotCard";
import { DreamSchoolBody } from "@/components/strategy/DreamSchoolCard";
import { ActionPlanCard } from "@/components/strategy/ActionPlanCard";
import { SpikeBody } from "@/components/strategy/SpikeCard";
import { GapsBody } from "@/components/strategy/GapsCard";
import { SchoolListBody } from "@/components/strategy/SchoolListCard";
import { MajorRecommendationsBody } from "@/components/strategy/MajorRecommendationsCard";
import { DeadlinesCard } from "@/components/strategy/DeadlinesCard";
import {
  EmptyState,
  FooterBar,
  GenerateBar,
  MissingDataBanner,
  PreGenerationHint,
} from "@/components/strategy/Chrome";
import {
  EC_LABEL,
  PERCENTILE_LABEL,
  TIER_LABEL,
  gapsStrength,
  majorRecsHeadline,
  majorRecsStrength,
  schoolListStrength,
  snapshotStrength,
  spikeStrength,
  urgencyToneStrength,
} from "@/components/strategy/helpers";
import { useStrategy } from "@/hooks/useStrategy";
import { useDreamSchool } from "@/hooks/useDreamSchool";
import { useCollegePins } from "@/hooks/useCollegePins";
import { computeDeadlines } from "@/lib/deadlines";
import type { StrategyShareSnapshot } from "@/lib/strategy-share-types";

export default function StrategyPage() {
  const { profile, analysis, result, loading, error, generate, refresh } = useStrategy();
  const { dreamSchool, setDreamSchool } = useDreamSchool();
  const { pinned } = useCollegePins();

  // Deadlines from pinned schools' applicationPlan. Recomputed on every
  // render but cheap (≤ pinned count). `today` snapshotted per render so
  // daysAway stays accurate.
  const deadlineEntries = useMemo(
    () => computeDeadlines(pinned, new Date()),
    [pinned],
  );
  const hasUrgentDeadline = deadlineEntries.some(
    (e) => !e.isRolling && e.daysAway <= 7,
  );

  // When the dream school changes, refresh the profile snapshot so the cache
  // key regenerates and the UI reflects the new selection.
  const onDreamSchoolChange = (name: string | null) => {
    setDreamSchool(name);
    setTimeout(refresh, 0);
  };

  const isEmpty = !profile || !profile.hasPinnedSchools;

  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-bg-surface border border-border-strong px-3 py-1 mb-4">
          <Compass className="w-3.5 h-3.5 text-accent-text" />
          <span className="text-[11px] uppercase tracking-[0.08em] text-text-secondary font-medium">
            Strategy Engine
          </span>
        </div>
        <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04]">
          Your Strategic Briefing
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary mx-auto">
          A live decision tool — not a static report. Pick a dream school, review your gaps, and check off action items as you improve.
        </p>
      </motion.div>

      {isEmpty ? (
        <ScrollReveal delay={0.08}>
          <EmptyState />
        </ScrollReveal>
      ) : (
        <>
          <ScrollReveal delay={0.08}>
            <div className="mb-6">
              <DreamSchoolSelector
                dreamSchool={dreamSchool}
                onChange={onDreamSchoolChange}
              />
            </div>
          </ScrollReveal>

          {analysis && analysis.missingDataRanked.length > 0 && !result && (
            <ScrollReveal delay={0.1}>
              <MissingDataBanner items={analysis.missingDataRanked} />
            </ScrollReveal>
          )}

          <ScrollReveal delay={0.12}>
            <GenerateBar
              loading={loading}
              hasResult={result != null}
              generatedAt={result?.generatedAt ?? null}
              onGenerate={() => generate({ bypassCache: result != null })}
              shareSlot={
                result && analysis ? (
                  <StrategyShareButton
                    getSnapshot={(): StrategyShareSnapshot | null => ({
                      result,
                      analysis,
                      profileMeta: {
                        graduationYear: profile?.basicInfo?.graduationYear ?? null,
                        intendedMajor: profile?.intendedMajor || null,
                        pinnedNames: pinned.map((p) => p.name),
                        pinnedPlans: Object.fromEntries(
                          pinned.map((p) => [p.name, p.applicationPlan]),
                        ),
                      },
                      capturedAt: Date.now(),
                    })}
                  />
                ) : null
              }
            />
          </ScrollReveal>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-6">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {!result && !loading && !error && (
            <ScrollReveal delay={0.15}>
              <PreGenerationHint hasDreamSchool={dreamSchool != null} />
            </ScrollReveal>
          )}

          <AnimatePresence mode="wait">
            {result && analysis && (
              <motion.div
                key={result.generatedAt}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="space-y-8"
              >
                <SectionNav
                  sections={[
                    { id: "section-profile-readout", label: "Profile" },
                    { id: "section-recommendation", label: "Recommendation" },
                    { id: "section-plan", label: "Plan" },
                    { id: "section-atlas", label: "Atlas" },
                  ]}
                />

                <section
                  id="section-profile-readout"
                  aria-labelledby="strategy-profile-heading"
                  className="space-y-3 scroll-mt-32"
                >
                  <h2 id="strategy-profile-heading" className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Profile readout
                  </h2>
                  <StrategyCard
                    icon={<Target className="w-4 h-4" />}
                    title="Snapshot"
                    strength={snapshotStrength(analysis)}
                    headline={`${TIER_LABEL[analysis.academic.tier]} academics · ${EC_LABEL[analysis.ec.tier]} ECs · ${PERCENTILE_LABEL[analysis.positioning.percentileEstimate]}`}
                    defaultExpanded
                  >
                    <SnapshotBody result={result} analysis={analysis} />
                  </StrategyCard>
                </section>

                <section
                  id="section-recommendation"
                  aria-labelledby="strategy-recommendation-heading"
                  className="space-y-3 scroll-mt-32"
                >
                  <h2 id="strategy-recommendation-heading" className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Recommendation
                  </h2>
                  <StrategyCard
                    icon={<Star className="w-4 h-4" />}
                    title="Dream School"
                    strength={urgencyToneStrength(result.dreamSchool?.urgencyTone ?? null)}
                    headline={
                      result.dreamSchool?.schoolName ??
                      (dreamSchool ? `${dreamSchool} · pending re-run` : "No dream school selected")
                    }
                    defaultExpanded
                    emphasize
                  >
                    <DreamSchoolBody result={result} analysis={analysis} dreamSchool={dreamSchool} />
                  </StrategyCard>
                  <ActionPlanCard result={result} />
                </section>

                <section
                  id="section-plan"
                  aria-labelledby="strategy-plan-heading"
                  className="space-y-3 scroll-mt-32"
                >
                  <h2 id="strategy-plan-heading" className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Plan
                  </h2>
                  <StrategyCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    title="Spike Analysis"
                    strength={spikeStrength(analysis)}
                    headline={
                      analysis.spike.primary
                        ? `${analysis.spike.primary} · ${analysis.spike.clarity}`
                        : "No clear spike"
                    }
                  >
                    <SpikeBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {hasUrgentDeadline && (
                    <DeadlinesCard entries={deadlineEntries} hoisted />
                  )}

                  <StrategyCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    title="Gaps"
                    strength={gapsStrength(analysis)}
                    headline={`${analysis.weaknesses.length} flagged`}
                  >
                    <GapsBody result={result} analysis={analysis} />
                  </StrategyCard>

                  {!hasUrgentDeadline && (
                    <DeadlinesCard entries={deadlineEntries} hoisted={false} />
                  )}

                  <StrategyCard
                    icon={<GraduationCap className="w-4 h-4" />}
                    title="Recommended for Your Major"
                    strength={majorRecsStrength(analysis.majorRecommendations)}
                    headline={majorRecsHeadline(analysis.majorRecommendations)}
                  >
                    <MajorRecommendationsBody
                      recs={analysis.majorRecommendations}
                      onMajorSaved={refresh}
                    />
                  </StrategyCard>
                </section>

                <section
                  id="section-atlas"
                  aria-labelledby="strategy-atlas-heading"
                  className="space-y-3 scroll-mt-32"
                >
                  <h2 id="strategy-atlas-heading" className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
                    Atlas
                  </h2>
                  <StrategyCard
                    icon={<School className="w-4 h-4" />}
                    title="School List Strategy"
                    strength={schoolListStrength(analysis)}
                    headline={`${analysis.schoolList.total} pinned · ${analysis.schoolList.balance}`}
                  >
                    <SchoolListBody result={result} analysis={analysis} />
                  </StrategyCard>
                  <StrategyCard
                    icon={<ArrowRight className="w-4 h-4" />}
                    title="Application Strategy"
                    strength="neutral"
                    headline={`${analysis.earlyStrategy.length} schools · per-school plan`}
                    defaultExpanded
                  >
                    <StrategyAtlas
                      result={result}
                      earlyStrategy={analysis.earlyStrategy}
                      pinnedSchools={profile?.pinnedSchools ?? []}
                      deadlineEntries={deadlineEntries}
                    />
                  </StrategyCard>
                </section>

                <FooterBar
                  generatedAt={result.generatedAt}
                  onRerun={() => generate({ bypassCache: true })}
                  loading={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </main>
  );
}
