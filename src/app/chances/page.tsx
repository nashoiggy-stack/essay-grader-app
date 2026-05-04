"use client";

import { motion } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ChanceForm } from "@/components/ChanceForm";
import { ChanceResultDisplay } from "@/components/ChanceResult";
import { CollegeMap } from "@/components/ui/college-map";
import { useChanceCalculator } from "@/hooks/useChanceCalculator";

export default function ChancesPage() {
  const { inputs, updateInput, resetInputs, college, result, colleges } = useChanceCalculator();

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04]">
            <span className="text-gradient">Chance Calculator</span>
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary mx-auto">
            Estimate your admission chances at any school in our database.
            Enter your profile and select a college.
          </p>
        </motion.div>

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
            <p className="text-text-muted">Select a college above to see your estimated chances</p>
          </div>
        )}
      </main>
    </>
  );
}
