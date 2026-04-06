"use client";

import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CollegeFiltersPanel } from "@/components/CollegeFilters";
import { CollegeResults } from "@/components/CollegeResults";
import { useCollegeFilter } from "@/hooks/useCollegeFilter";

export default function CollegesPage() {
  const { filters, updateFilter, resetFilters, results, sortedBy } = useCollegeFilter();

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            <span className="text-gradient">College List Builder</span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
            Find your reach, target, and safety schools based on your academic profile and preferences.
          </p>
        </motion.div>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <CollegeFiltersPanel
            filters={filters}
            onUpdate={updateFilter}
            onReset={resetFilters}
            resultCount={results.length}
          />
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
