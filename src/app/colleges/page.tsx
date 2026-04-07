"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { CollegeFiltersPanel } from "@/components/CollegeFilters";
import { CollegeResults } from "@/components/CollegeResults";
import { useCollegeFilter } from "@/hooks/useCollegeFilter";

const TIERS = [
  { label: "Safety", color: "bg-emerald-500", textColor: "text-emerald-400", fit: "85-95", description: "Your stats are well above average and the school has a higher acceptance rate. You're very likely to be admitted." },
  { label: "Likely", color: "bg-blue-500", textColor: "text-blue-400", fit: "65-84", description: "Your stats are above the school's averages. Strong chance, but not guaranteed." },
  { label: "Target", color: "bg-amber-500", textColor: "text-amber-400", fit: "40-64", description: "Your stats are within the school's range. Realistic but not a given." },
  { label: "Reach", color: "bg-orange-500", textColor: "text-orange-400", fit: "15-39", description: "Your stats are below range. Possible with strong essays, ECs, and luck." },
  { label: "Unlikely", color: "bg-red-500", textColor: "text-red-500", fit: "5-14", description: "Stats significantly below. Would require exceptional circumstances." },
];

export default function CollegesPage() {
  const { filters, updateFilter, resetFilters, results, sortedBy } = useCollegeFilter();
  const [showGuide, setShowGuide] = useState(false);

  return (
    <AuroraBackground>
      {/* Hero scroll */}
      <ContainerScroll
        titleComponent={
          <div className="mb-4">
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-5">
              <span className="text-gradient">College List Builder</span>
            </h1>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg sm:text-xl leading-relaxed">
              Find your safety, likely, target, reach, and unlikely schools.
            </p>
          </div>
        }
      >
        {/* Mock college list preview */}
        <div className="h-full w-full bg-[#0a0a14] p-5 flex flex-col gap-3 overflow-hidden">
          {[
            { name: "MIT", rate: "4%", tag: "Reach", color: "text-orange-400", bgColor: "bg-orange-500/10" },
            { name: "Georgia Tech", rate: "17%", tag: "Target", color: "text-amber-400", bgColor: "bg-amber-500/10" },
            { name: "UC Berkeley", rate: "11%", tag: "Target", color: "text-amber-400", bgColor: "bg-amber-500/10" },
            { name: "Boston University", rate: "14%", tag: "Likely", color: "text-blue-400", bgColor: "bg-blue-500/10" },
            { name: "University of Florida", rate: "23%", tag: "Likely", color: "text-blue-400", bgColor: "bg-blue-500/10" },
            { name: "Ohio State", rate: "53%", tag: "Safety", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-4 py-3">
              <div>
                <p className="text-sm text-zinc-300">{s.name}</p>
                <p className="text-[10px] text-zinc-600">{s.rate} acceptance rate</p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${s.bgColor} ${s.color}`}>{s.tag}</span>
            </div>
          ))}
        </div>
      </ContainerScroll>

      <main className="mx-auto max-w-5xl px-4 -mt-32 pb-16 font-[family-name:var(--font-geist-sans)]">
        {/* Guide toggle */}
        <div className="text-center mb-6">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
            </svg>
            {showGuide ? "Hide" : "What do these tiers mean?"}
          </button>
        </div>

        {/* Guide */}
        <AnimatePresence>
          {showGuide && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
              <div className="rounded-2xl bg-[#12121f] border border-white/[0.08] p-6">
                <h3 className="text-sm font-bold text-zinc-200 mb-4">Classification Tiers & Fit Scores</h3>
                <div className="space-y-3 mb-6">
                  {TIERS.map((t) => (
                    <div key={t.label} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0 w-24">
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className={`text-sm font-semibold ${t.textColor}`}>{t.label}</span>
                      </div>
                      <span className="text-xs text-zinc-600 font-mono shrink-0 w-12">{t.fit}</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">What is Fit Score?</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Fit Score (0-95) measures how your academic stats compare to a school&apos;s admitted student averages. Higher = stronger match. It doesn&apos;t account for ECs, recommendations, or demonstrated interest.
                  </p>
                  <p className="text-xs text-zinc-600 mt-2">A balanced list: 2-3 safeties/likelies, 3-5 targets, 2-3 reaches.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <CollegeFiltersPanel filters={filters} onUpdate={updateFilter} onReset={resetFilters} resultCount={results.length} />
        </ScrollReveal>

        {/* Results */}
        <div className="mt-8">
          <ScrollReveal delay={0.15}>
            <CollegeResults results={results} sortedBy={sortedBy} />
          </ScrollReveal>
        </div>
      </main>
    </AuroraBackground>
  );
}
