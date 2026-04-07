"use client";

import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { ChanceForm } from "@/components/ChanceForm";
import { ChanceResultDisplay } from "@/components/ChanceResult";
import { useChanceCalculator } from "@/hooks/useChanceCalculator";

export default function ChancesPage() {
  const { inputs, updateInput, resetInputs, college, result, colleges } = useChanceCalculator();

  return (
    <AuroraBackground>
      {/* Hero scroll */}
      <ContainerScroll
        titleComponent={
          <div className="mb-4">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-5">
              <span className="text-gradient">Chance Calculator</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
              Estimate your admission chances at any school in our database.
            </p>
          </div>
        }
      >
        {/* Mock chance result preview */}
        <div className="h-full w-full bg-[#0a0a14] p-6 flex flex-col items-center justify-center gap-6 overflow-hidden">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Your chances at Stanford University</p>
          <div className="px-8 py-4 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <span className="text-4xl font-bold text-amber-400">Possible</span>
          </div>
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-[9px] text-zinc-600 uppercase tracking-wider mb-1">
              <span>Very Low</span><span>Low</span><span>Possible</span><span>Competitive</span><span>Strong</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full rounded-full bg-amber-500" style={{ width: "45%" }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-2">
            <div>
              <p className="text-xs text-emerald-400 font-semibold mb-1">Strengths</p>
              <p className="text-[10px] text-zinc-500">+ UW GPA above average</p>
              <p className="text-[10px] text-zinc-500">+ SAT within range</p>
            </div>
            <div>
              <p className="text-xs text-red-400 font-semibold mb-1">Improve</p>
              <p className="text-[10px] text-zinc-500">! Extremely selective (4%)</p>
              <p className="text-[10px] text-zinc-500">! CS is competitive here</p>
            </div>
          </div>
        </div>
      </ContainerScroll>

      <main className="mx-auto max-w-3xl px-4 -mt-32 pb-16 font-[family-name:var(--font-geist-sans)]">
        {/* Form */}
        <ScrollReveal delay={0.1}>
          <ChanceForm inputs={inputs} colleges={colleges} onUpdate={updateInput} onReset={resetInputs} />
        </ScrollReveal>

        {/* Result */}
        {result && college && (
          <div className="mt-8">
            <ScrollReveal delay={0.15}>
              <ChanceResultDisplay result={result} collegeName={college.name} />
            </ScrollReveal>
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
