"use client";

import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ChanceForm } from "@/components/ChanceForm";
import { ChanceResultDisplay } from "@/components/ChanceResult";
import { CollegeMap } from "@/components/ui/college-map";
import { useChanceCalculator } from "@/hooks/useChanceCalculator";
import { EditorialAtmosphere } from "@/components/editorial/EditorialAtmosphere";
import { AtlasHero } from "@/components/editorial/AtlasHero";

export default function ChancesPage() {
  const { inputs, updateInput, resetInputs, college, result, colleges } = useChanceCalculator();

  return (
    <AuroraBackground>
      <EditorialAtmosphere />
      <main className="editorial-luxury mx-auto max-w-3xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
        <AtlasHero
          eyebrow="Single school"
          title="Your odds,"
          accent="weighed."
          lede="Estimate your admission chances at any school in our database. Enter your profile, pick a college, and see the chance model lay out the math."
        />

        {/* Always-visible disclaimer per final calibration spec. */}
        <div className="mb-8 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.15] px-4 py-3">
          <p className="text-[12px] text-amber-200/80 leading-relaxed">
            <span className="font-semibold text-amber-200">Estimates only.</span>{" "}
            Chance estimates use data-informed multipliers calibrated against published research.
            Use as a strategic framework, not a prediction. Your essays, recommendations, and specific
            application context matter more than this number. Estimates may be inaccurate for:
            state-residency-dependent schools, program-specific admissions, schools where data is sparse.{" "}
            <a
              href="/methodology"
              className="font-semibold text-amber-100 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-50"
            >
              Read our methodology →
            </a>
          </p>
        </div>

        {/* Form */}
        <ScrollReveal delay={0.1}>
          <ChanceForm inputs={inputs} colleges={colleges} onUpdate={updateInput} onReset={resetInputs} />
        </ScrollReveal>

        {/* Map + Result */}
        {college && (
          <div className="mt-8 space-y-6">
            <ScrollReveal delay={0.12}>
              <CollegeMap college={college} className="h-[280px] sm:h-[320px]" />
            </ScrollReveal>

            {result && (
              <ScrollReveal delay={0.15}>
                <ChanceResultDisplay
                  result={result}
                  collegeName={college.name}
                  college={college}
                  applicationPlan={inputs.applicationPlan}
                  userStats={{
                    gpaWeighted: parseFloat(inputs.gpaW) || null,
                    sat: parseInt(inputs.sat, 10) || null,
                    act: parseInt(inputs.act, 10) || null,
                  }}
                />
              </ScrollReveal>
            )}
          </div>
        )}

        {!college && (
          <div className="mt-8 glass rounded-2xl p-12 ring-1 ring-white/[0.06] text-center">
            <p className="text-zinc-500">Select a college above to see your estimated chances</p>
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}
