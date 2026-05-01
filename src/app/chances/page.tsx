"use client";

import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ChanceForm } from "@/components/ChanceForm";
import { CollegeMap } from "@/components/ui/college-map";
import { useChanceCalculator } from "@/hooks/useChanceCalculator";
import { EditorialAtmosphere, EditorialHero } from "@/components/editorial/EditorialSystem";
import { EditorialChanceResult } from "@/components/editorial/EditorialChanceResult";

export default function ChancesPage() {
  const { inputs, updateInput, resetInputs, college, result, colleges } = useChanceCalculator();

  return (
    <AuroraBackground>
      <EditorialAtmosphere />
      <main className="editorial-luxury mx-auto max-w-[1100px] px-[clamp(20px,4vw,48px)] py-[clamp(48px,8vw,96px)] pb-32 font-[family-name:var(--font-geist-sans)]">
        <EditorialHero
          eyebrow="Single-school estimate"
          title="Your odds,"
          accent="weighed."
          lede="An honest read on your chances at one school — built from the same multiplier model that grades your full list. Each factor either lifts or lowers a base school admit rate; the running figure on the right is what we'd advise expecting."
        />

        {/* Always-visible disclaimer */}
        <div className="mb-10 border-y border-amber-500/[0.18] py-3">
          <p className="text-[12px] text-amber-200/85 leading-relaxed">
            <span className="font-semibold text-amber-200">Estimates only.</span>{" "}
            Chance estimates use data-informed multipliers calibrated against published research —
            a strategic framework, not a prediction. Your essays, recommendations, and specific
            application context matter more than this number.{" "}
            <a
              href="/methodology"
              className="font-semibold text-amber-100 underline decoration-amber-400/40 underline-offset-2 hover:text-amber-50"
            >
              Read our methodology →
            </a>
          </p>
        </div>

        {/* Form — kept exactly as-is */}
        <ScrollReveal delay={0.1}>
          <ChanceForm inputs={inputs} colleges={colleges} onUpdate={updateInput} onReset={resetInputs} />
        </ScrollReveal>

        {/* Map + Editorial Result */}
        {college && (
          <div className="mt-12 space-y-[clamp(32px,5vw,56px)]">
            <ScrollReveal delay={0.12}>
              <CollegeMap college={college} className="h-[280px] sm:h-[320px]" />
            </ScrollReveal>

            {result && (
              <ScrollReveal delay={0.15}>
                <EditorialChanceResult result={result} college={college} />
              </ScrollReveal>
            )}
          </div>
        )}

        {!college && (
          <div className="mt-12 ed-corner-frame rounded-[4px] p-12 text-center">
            <p className="font-[family-name:var(--font-display)] italic text-[18px] text-[var(--ink-60)] m-0">
              Select a college above to see your estimated chances
            </p>
          </div>
        )}
      </main>
    </AuroraBackground>
  );
}
