"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CollegeFiltersPanel } from "@/components/CollegeFilters";
import { CollegeResults } from "@/components/CollegeResults";
import { CollegeSearchInput } from "@/components/CollegeSearchInput";
import { useCollegeFilter } from "@/hooks/useCollegeFilter";
import { useCollegePins } from "@/hooks/useCollegePins";
import { useCollegeListKeyboard } from "@/hooks/useCollegeListKeyboard";
import type { ClassifiedCollege } from "@/lib/college-types";

const COLLEGE_SEARCH_INPUT_ID = "colleges-search-input";

const TIERS = [
  { label: "Safety", color: "bg-emerald-500", textColor: "text-emerald-400", chance: "70%+", description: "Estimated chance of admission is 70% or higher. Your profile lines up well with the school's typical admit." },
  { label: "Likely", color: "bg-blue-500", textColor: "text-blue-400", chance: "40–69%", description: "Estimated chance is 40–69%. A strong match but not guaranteed. Schools under 15% acceptance cannot classify here regardless of profile — top schools have institutional uncertainty (hooked-applicant slots, class composition needs) that prevents unhooked applicants from being 'likely'." },
  { label: "Target", color: "bg-amber-500", textColor: "text-amber-400", chance: "20–39%", description: "Estimated chance is 20–39%. Realistic but competitive. Final outcomes depend on essays, recommendations, and demonstrated interest in addition to stats." },
  { label: "Reach", color: "bg-orange-500", textColor: "text-orange-400", chance: "5–19%", description: "Estimated chance is 5–19%. Admission is possible with a strong qualitative profile. Schools with under 10% acceptance always cap here, even with elite stats — outcomes are not predictable at that selectivity." },
  { label: "Unlikely", color: "bg-red-500", textColor: "text-red-500", chance: "<5%", description: "Estimated chance is below 5%. Would require exceptional circumstances. Elite-profile applicants (4.0 UW, 1540+ SAT or 35+ ACT, 6+ APs) never land here — the chance model floors at 'reach' for that profile." },
  { label: "Insufficient Data", color: "bg-zinc-500", textColor: "text-zinc-400", chance: "—", description: "We don't have enough of your profile to ground a chance estimate. Add a GPA or test score to unlock per-school chances." },
];

export default function CollegesPage() {
  const { filters, updateFilter, resetFilters, results, sortedBy } = useCollegeFilter();
  const { pinned, isPinned, togglePin } = useCollegePins();
  const [showGuide, setShowGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Search is layered on top of useCollegeFilter — it doesn't touch filter
  // state, just narrows the visible slice by name/alias substring.
  const searchedResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return results;
    return results.filter((r: ClassifiedCollege) => {
      if (r.college.name.toLowerCase().includes(q)) return true;
      const aliases = r.college.aliases ?? [];
      return aliases.some((a) => a.toLowerCase().includes(q));
    });
  }, [results, searchQuery]);

  // Wrap sortedBy so per-key sorts run AFTER the search narrowing — otherwise
  // sorting would still reference the unfiltered list.
  const searchedSortedBy: typeof sortedBy = (key) => {
    const sorted = sortedBy(key);
    if (!searchQuery.trim()) return sorted;
    const visible = new Set(searchedResults.map((r) => r.college.name));
    return sorted.filter((r) => visible.has(r.college.name));
  };

  // Mirror of the flat sorted slice CollegeResults is currently rendering —
  // the keyboard hook needs this so "P" can resolve flat-index → college name
  // for togglePin, and so the count is right whether sort is by acceptance,
  // fit, or major match.
  const [keyboardSlice, setKeyboardSlice] = useState<readonly ClassifiedCollege[]>([]);
  const handleSortedChange = useCallback(
    (sorted: readonly ClassifiedCollege[]) => setKeyboardSlice(sorted),
    [],
  );

  const handleKeyboardTogglePin = useCallback(
    (index: number) => {
      const item = keyboardSlice[index];
      if (item) togglePin(item.college.name);
    },
    [keyboardSlice, togglePin],
  );

  const { focusedIndex } = useCollegeListKeyboard({
    count: keyboardSlice.length,
    onTogglePin: handleKeyboardTogglePin,
    searchInputId: COLLEGE_SEARCH_INPUT_ID,
  });

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-5xl px-4 py-16 sm:py-28 font-[family-name:var(--font-geist-sans)]">
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
            Find your safety, likely, target, reach, and unlikely schools based on your academic profile.
          </p>

          <button
            onClick={() => setShowGuide(!showGuide)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
            </svg>
            {showGuide ? "Hide" : "What do these tiers mean?"}
          </button>
        </motion.div>

        {/* Always-visible disclaimer per final calibration spec. Sits above
            the fold so it's read alongside the chance numbers, not buried. */}
        <div className="mb-6 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.15] px-4 py-3">
          <p className="text-[12px] text-amber-200/80 leading-relaxed">
            <span className="font-semibold text-amber-200">Estimates only.</span>{" "}
            Chance estimates use data-informed multipliers but are not empirically validated against real
            outcomes. Use as a strategic framework, not a prediction. Your essays, recommendations, and specific
            application context matter more than this number. Estimates may be inaccurate for:
            state-residency-dependent schools, program-specific admissions, schools where data is sparse.
          </p>
        </div>

        {/* Guide — canonical legend for tiers + chance estimates. Opened by
            the "What do these tiers mean?" button above AND by the "?" icon
            next to the Chance sort control in CollegeResults. */}
        <AnimatePresence>
          {showGuide && (
            <motion.div id="fit-score-guide" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
              <div className="rounded-2xl bg-[#12121f] border border-white/[0.08] p-6">
                <h3 className="text-sm font-bold text-zinc-200 mb-4">Classification Tiers & Chance Estimates</h3>
                <div className="space-y-3 mb-6">
                  {TIERS.map((t) => (
                    <div key={t.label} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0 w-32">
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className={`text-sm font-semibold ${t.textColor}`}>{t.label}</span>
                      </div>
                      <span className="text-xs text-zinc-600 font-mono shrink-0 w-16">{t.chance}</span>
                      <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">How are chances calculated?</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Each school&apos;s estimate starts from its <span className="text-zinc-300">published acceptance rate</span> (school-specific ED/EA rate when available, else a conservative fallback) and is scaled by where your <span className="text-zinc-300">GPA and test scores</span> sit relative to the school&apos;s 25th&ndash;75th percentile band. We use the <span className="text-zinc-300">weaker</span> of the two stats — uneven profiles don&apos;t get the high-stat benefit. EC band and essay scores apply small additional multipliers.
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                    The displayed range (e.g. &ldquo;8&ndash;14%&rdquo;) is the real signal — a wider range means lower confidence (test-optional with no test, missing CDS data, or sparse profile inputs). Yield-protective schools cap top-quartile applicants at 1.0&times; in RD; the &ldquo;may consider demonstrated interest&rdquo; note flags those.
                  </p>
                  <p className="text-xs text-zinc-600 mt-2">A balanced list: 2&ndash;3 safeties/likelies, 3&ndash;5 targets, 2&ndash;3 reaches.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search (layered on top of filter results — does not narrow the
            underlying filter pool, just the visible slice). */}
        <ScrollReveal delay={0.08}>
          <CollegeSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            inputId={COLLEGE_SEARCH_INPUT_ID}
          />
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.1}>
          <CollegeFiltersPanel filters={filters} onUpdate={updateFilter} onReset={resetFilters} resultCount={searchedResults.length} />
        </ScrollReveal>

        {/* Results */}
        <div className="mt-8">
          <ScrollReveal delay={0.15}>
            <CollegeResults
              results={searchedResults}
              sortedBy={searchedSortedBy}
              pinnedCount={pinned.length}
              isPinned={isPinned}
              onTogglePin={togglePin}
              focusedFlatIndex={focusedIndex}
              onSortedChange={handleSortedChange}
              hasMajorPreference={
                filters.activeMajors.length > 0 ||
                filters.activeInterests.some((i) => i.trim().length > 0)
              }
              onShowGuide={() => {
                setShowGuide(true);
                // Defer to the next frame so the panel is in the DOM before
                // we scroll — otherwise the browser can't find the target.
                requestAnimationFrame(() => {
                  document
                    .getElementById("fit-score-guide")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                });
              }}
            />
          </ScrollReveal>
        </div>
      </main>
    </AuroraBackground>
  );
}
