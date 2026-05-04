"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
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
  { label: "Likely", color: "bg-blue-500", textColor: "text-accent-text", chance: "40–69%", description: "Estimated chance is 40–69%. A strong match but not guaranteed. Schools under 15% acceptance cannot classify here regardless of profile — top schools have institutional uncertainty (hooked-applicant slots, class composition needs) that prevents unhooked applicants from being 'likely'." },
  { label: "Target", color: "bg-amber-500", textColor: "text-amber-400", chance: "20–39%", description: "Estimated chance is 20–39%. Realistic but competitive. Final outcomes depend on essays, recommendations, and demonstrated interest in addition to stats." },
  { label: "Reach", color: "bg-orange-500", textColor: "text-orange-400", chance: "5–19%", description: "Estimated chance is 5–19%. Admission is possible with a strong qualitative profile. Schools with under 10% acceptance always cap here, even with elite stats — outcomes are not predictable at that selectivity." },
  { label: "Unlikely", color: "bg-red-500", textColor: "text-red-500", chance: "<5%", description: "Estimated chance is below 5%. Would require exceptional circumstances. Elite-profile applicants (4.0 UW, 1540+ SAT or 35+ ACT, 6+ APs) never land here — the chance model floors at 'reach' for that profile." },
  { label: "Insufficient Data", color: "bg-zinc-500", textColor: "text-text-secondary", chance: "—", description: "We don't have enough of your profile to ground a chance estimate. Add a GPA or test score to unlock per-school chances." },
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
    <>
      <main id="main-content" className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24 font-[family-name:var(--font-geist-sans)]">
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <motion.header
          className="mb-10 sm:mb-12"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-medium">
                Browse · Pin · Build your list
              </p>
              <h1 className="mt-2 text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">
                Colleges
              </h1>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-[12px] text-text-secondary hover:text-text-primary inline-flex items-center gap-1.5 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
              </svg>
              {showGuide ? "Hide tiers" : "What do these tiers mean?"}
            </button>
          </div>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-secondary">
            Sortable by chance, acceptance rate, or major fit. Pin schools to
            assemble your list, then head to{" "}
            <Link href="/list" className="text-text-primary underline decoration-white/15 underline-offset-2 hover:text-white">
              your graded list
            </Link>{" "}
            for the second-opinion read.
          </p>
        </motion.header>

        {/* Always-visible disclaimer — kept editorial, methodology one click away. */}
        <div className="mb-8 border-y border-amber-500/[0.30] dark:border-amber-500/[0.18] py-3">
          <p className="text-[12px] text-amber-900/85 dark:text-amber-200/85 leading-relaxed">
            <span className="font-semibold text-amber-900 dark:text-amber-200">Estimates only.</span>{" "}
            Chance estimates use data-informed multipliers calibrated against published research —
            a strategic framework, not a prediction. Estimates may be inaccurate for
            state-residency-dependent schools, program-specific admissions, and schools where
            data is sparse.{" "}
            <Link
              href="/methodology"
              className="font-semibold text-amber-950 dark:text-amber-100 underline decoration-amber-700/50 dark:decoration-amber-400/40 underline-offset-2 hover:text-amber-900 dark:hover:text-amber-50"
            >
              Read our methodology →
            </Link>
          </p>
        </div>

        {/* Guide — canonical legend for tiers + chance estimates. Opened by
            the "What do these tiers mean?" button above AND by the "?" icon
            next to the Chance sort control in CollegeResults. */}
        <AnimatePresence>
          {showGuide && (
            <motion.div id="fit-score-guide" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
              <div className="rounded-md bg-bg-inset border border-border-strong p-6">
                <h3 className="text-sm font-bold text-text-primary mb-4">Classification Tiers & Chance Estimates</h3>
                <div className="space-y-3 mb-6">
                  {TIERS.map((t) => (
                    <div key={t.label} className="flex items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0 w-32">
                        <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                        <span className={`text-sm font-semibold ${t.textColor}`}>{t.label}</span>
                      </div>
                      <span className="text-xs text-text-faint font-mono shrink-0 w-16">{t.chance}</span>
                      <p className="text-xs text-text-secondary leading-relaxed">{t.description}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border-hair pt-4">
                  <h4 className="text-xs font-semibold text-text-secondary mb-2">How are chances calculated?</h4>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Each school&apos;s estimate starts from its <span className="text-text-secondary">published acceptance rate</span> (school-specific ED/EA rate when available, else a conservative fallback) and is scaled by where your <span className="text-text-secondary">GPA and test scores</span> sit relative to the school&apos;s 25th&ndash;75th percentile band. We use the <span className="text-text-secondary">weaker</span> of the two stats — uneven profiles don&apos;t get the high-stat benefit. EC band and essay scores apply small additional multipliers.
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed mt-2">
                    The displayed range (e.g. &ldquo;8&ndash;14%&rdquo;) is the real signal — a wider range means lower confidence (test-optional with no test, missing CDS data, or sparse profile inputs). Yield-protective schools cap top-quartile applicants at 1.0&times; in RD; the &ldquo;may consider demonstrated interest&rdquo; note flags those.
                  </p>
                  <p className="text-xs text-text-faint mt-2">A balanced list: 2&ndash;3 safeties/likelies, 3&ndash;5 targets, 2&ndash;3 reaches.</p>
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
    </>
  );
}
