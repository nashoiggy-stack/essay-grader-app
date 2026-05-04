"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { SectionNav } from "@/components/SectionNav";
import { SaveIndicator } from "@/components/SaveIndicator";
import { useProfile } from "@/hooks/useProfile";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import { EC_BAND_LABELS } from "@/lib/extracurricular-types";
import { MajorSelect } from "@/components/MajorSelect";
import { TranscriptUpload } from "@/components/TranscriptUpload";
import { Plus, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-lg bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary placeholder-zinc-600 focus:border-blue-500/50 focus: focus:ring-accent-line focus:outline-none transition-[border-color,box-shadow] duration-200";
const labelClass = "block text-xs font-medium text-text-secondary mb-1";

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-accent-text/70 bg-accent-soft border border-accent-line rounded-full px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-blue-400" />
      {source}
    </span>
  );
}

export default function ProfilePage() {
  const { profile, computed, loaded, updateField, updateSAT, updateACT, updateBasicInfo, resetToComputed } = useProfile();
  const bi = profile.basicInfo ?? { name: "", email: "", phone: "", school: "", graduationYear: "", address: "" };

  if (!loaded) {
    return (
      <>
        <div className="min-h-dvh flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </>
    );
  }

  // Defensive: useProfile normalizes on load, but guard here against any
  // path that hydrates state without normalizing.
  const satComposite = profile.sat ? computeSATComposite(profile.sat) : null;
  const actComposite = profile.act ? computeACTComposite(profile.act) : null;

  // Completeness: 5 sections, each 0/1.
  // APs and Coursework used to be separate chips that both satisfied on
  // advancedCoursework[] — so a single advancedCoursework entry double-
  // lit two chips for the same signal. Merged into one "Coursework" chip
  // (availability === "none" also satisfies, since the model waives the
  // rigor signal in that case). The legacy apScores[] field is
  // deprecated and only kept for round-tripping old saved data.
  const sections = [
    { key: "GPA", done: !!profile.gpaUW },
    { key: "Test", done: satComposite !== null || actComposite !== null },
    {
      key: "Coursework",
      done:
        profile.advancedCourseworkAvailable === "none" ||
        (profile.advancedCoursework?.length ?? 0) > 0 ||
        profile.apScores.length > 0,
    },
    { key: "Essay", done: !!profile.essayCommonApp || (profile.essayScores?.length ?? 0) > 0 },
    { key: "ECs", done: !!profile.ecBand },
  ];
  const completed = sections.filter((s) => s.done).length;
  const total = sections.length;
  const pct = Math.round((completed / total) * 100);
  const completeMessage =
    completed === total
      ? "Your profile is complete. Every tool will use this data."
      : completed >= 4
      ? "Almost there — a few more fields for the best chance estimates."
      : completed >= 2
      ? "You're making progress. Keep filling sections as you go."
      : "Start with the basics — GPA and a test score unlock the most tools.";

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">
        {/* Masthead */}
        <header className="mb-8 sm:mb-10 animate-fade-in">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">
              Tools / Your Profile
            </p>
            <SaveIndicator storageKey={PROFILE_STORAGE_KEY} />
          </div>
          <h1 className="mt-3 text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">
            Your Profile
          </h1>
          <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-text-secondary">
            Every tool reads from this profile. Drop in a transcript to auto-fill
            GPA + coursework, or edit any section by hand. Changes save instantly.
          </p>
        </header>

        <SectionNav
          sections={[
            { id: "profile-basic", label: "Basic" },
            { id: "profile-gpa", label: "GPA", complete: !!computed?.gpaUW },
            { id: "profile-sat", label: "SAT", complete: satComposite !== null },
            { id: "profile-act", label: "ACT", complete: actComposite !== null },
            { id: "profile-ec", label: "ECs", complete: !!computed?.ecBand },
            { id: "profile-essay", label: "Essay", complete: !!computed?.essayCommonApp },
            { id: "profile-major", label: "Major" },
            { id: "profile-summary", label: "Summary" },
          ]}
        />

        {/* Transcript upload — primary on-ramp for new users. Mounted on
            /profile per CRITIQUE.md (was only on /gpa, hidden from
            users who started with the profile). */}
        <ScrollReveal delay={0.02}>
          <div className="mb-8">
            <TranscriptUpload />
          </div>
        </ScrollReveal>

        {/* Completeness Meter */}
        <ScrollReveal delay={0.03}>
          <div className="mb-8 rounded-md bg-bg-surface border border-border-strong p-5 sm:p-6">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.08em] text-text-muted font-medium mb-1">Profile completeness</p>
                <p className="text-sm text-text-primary">{completeMessage}</p>
              </div>
              <p className="font-mono tabular-nums text-2xl font-semibold text-white leading-none">
                {completed}<span className="text-text-faint">/{total}</span>
              </p>
            </div>
            <div className="h-1.5 rounded-full bg-bg-surface overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sections.map((s, i) => (
                <motion.span
                  key={s.key}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: 0.4 + i * 0.05,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className={`text-[10px] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded-full transition-[background-color,color] duration-300 ${
                    s.done
                      ? "bg-accent-soft text-accent-text ring-1 ring-accent-line"
                      : "bg-bg-surface text-text-faint border border-border-hair"
                  }`}
                >
                  {s.done ? "✓ " : ""}{s.key}
                </motion.span>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Reset Button */}
        <ScrollReveal delay={0.05}>
          <div className="flex justify-end mb-6">
            <button
              onClick={resetToComputed}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary border border-border-hair rounded-lg px-3 py-1.5 hover:bg-bg-surface transition-[background-color,color] duration-200"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.87"/></svg>
              Reset to calculated values
            </button>
          </div>
        </ScrollReveal>

        {/* Form-level wrapper. onSubmit prevents the implicit submit when
            a user hits Enter inside an input — the page is fully
            controlled (every change writes to cloud-storage), no submit
            target. Each section is a <fieldset> with a sr-only <legend>
            so AT users hear the section grouping that sighted users see
            visually via the H2. */}
        <form onSubmit={(e) => e.preventDefault()}>
        {/* Basic Info — shared across resume + future tools */}
        <ScrollReveal delay={0.08}>
          <fieldset
            id="profile-basic"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">Basic Info</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">Basic Info</h2>
              <span className="text-[10px] text-text-muted">Used in Resume Helper</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={bi.name}
                  onChange={(e) => updateBasicInfo({ name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={bi.email}
                  onChange={(e) => updateBasicInfo({ email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  placeholder="(555) 555-5555"
                  value={bi.phone}
                  onChange={(e) => updateBasicInfo({ phone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address (optional)</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={bi.address}
                  onChange={(e) => updateBasicInfo({ address: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>School</label>
                <input
                  type="text"
                  placeholder="e.g. Lincoln High School"
                  value={bi.school}
                  onChange={(e) => updateBasicInfo({ school: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Graduation year</label>
                <input
                  type="text"
                  placeholder="e.g. 2026"
                  value={bi.graduationYear}
                  onChange={(e) => updateBasicInfo({ graduationYear: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* GPA Section */}
        <ScrollReveal delay={0.1}>
          <fieldset
            id="profile-gpa"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">GPA</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">GPA</h2>
              {computed?.gpaUW && <SourceBadge source="GPA Calculator" />}
            </div>

            {/* Weighted-scale note — informational, sits above the inputs.
                Surfaces the 5.0-scale assumption that the chance model's
                Academic Index depends on. Schools that weight differently
                (4.5/6.0/100-pt) need conversion via the GPA Calculator. */}
            <GpaScaleNote />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Unweighted GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.0"
                  placeholder="e.g. 3.85"
                  value={profile.gpaUW}
                  onChange={(e) => updateField("gpaUW", e.target.value)}
                  className={inputClass}
                  aria-invalid={isOverScale(profile.gpaUW, 4.0) ? true : undefined}
                />
                {isOverScale(profile.gpaUW, 4.0) && (
                  <p className="mt-1.5 text-[11px] text-rose-400 leading-snug">
                    Unweighted GPA exceeds the 4.0 scale. Use the GPA calculator to
                    convert your school&rsquo;s scale to the standard 4.0 unweighted scale.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>Weighted GPA (5.0 scale)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5.0"
                  placeholder="e.g. 4.52"
                  value={profile.gpaW}
                  onChange={(e) => updateField("gpaW", e.target.value)}
                  className={inputClass}
                  aria-invalid={isOverScale(profile.gpaW, 5.0) ? true : undefined}
                />
                {isOverScale(profile.gpaW, 5.0) && (
                  <p className="mt-1.5 text-[11px] text-rose-400 leading-snug">
                    Weighted GPA exceeds 5.0 scale. Use the GPA calculator to convert
                    your school&rsquo;s scale to the normalized 5.0 scale.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Advanced Coursework Availability</label>
              <select
                value={profile.advancedCourseworkAvailable ?? "all"}
                onChange={(e) =>
                  updateField(
                    "advancedCourseworkAvailable",
                    e.target.value as "all" | "limited" | "none",
                  )
                }
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="all">My school offers a full AP/IB menu</option>
                <option value="limited">Limited offerings (a few APs)</option>
                <option value="none">School doesn&rsquo;t offer AP/IB</option>
              </select>
              <p className="mt-1 text-[10px] text-text-muted leading-relaxed">
                The chance model uses this to interpret your coursework. &lsquo;None&rsquo;
                waives the rigor signal entirely (no penalty for not having APs).
              </p>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* Advanced Coursework — replaces the old single rigor dropdown */}
        <ScrollReveal delay={0.18}>
          <AdvancedCourseworkSection
            rows={profile.advancedCoursework ?? []}
            available={profile.advancedCourseworkAvailable ?? "all"}
            onUpdate={(rows) => updateField("advancedCoursework", rows)}
          />
        </ScrollReveal>

        {/* SAT Section */}
        <ScrollReveal delay={0.15}>
          <fieldset
            id="profile-sat"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">SAT</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">SAT</h2>
              {satComposite !== null && (
                <span className="text-sm font-mono text-text-secondary">
                  Composite: <span className="text-white font-bold">{satComposite}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Reading & Writing (200-800)</label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="e.g. 720"
                  value={profile.sat?.readingWriting ?? ""}
                  onChange={(e) => updateSAT("readingWriting", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Math (200-800)</label>
                <input
                  type="number"
                  min="200"
                  max="800"
                  step="10"
                  placeholder="e.g. 780"
                  value={profile.sat?.math ?? ""}
                  onChange={(e) => updateSAT("math", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* ACT Section */}
        <ScrollReveal delay={0.2}>
          <fieldset
            id="profile-act"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">ACT</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">ACT</h2>
              {actComposite !== null && (
                <span className="text-sm font-mono text-text-secondary">
                  Composite: <span className="text-white font-bold">{actComposite}</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>English (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 34"
                  value={profile.act?.english ?? ""}
                  onChange={(e) => updateACT("english", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Math (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 33"
                  value={profile.act?.math ?? ""}
                  onChange={(e) => updateACT("math", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Reading (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 35"
                  value={profile.act?.reading ?? ""}
                  onChange={(e) => updateACT("reading", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Science (1-36)</label>
                <input
                  type="number"
                  min="1"
                  max="36"
                  placeholder="e.g. 32"
                  value={profile.act?.science ?? ""}
                  onChange={(e) => updateACT("science", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* Extracurriculars */}
        <ScrollReveal delay={0.25}>
          <fieldset
            id="profile-ec"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">Extracurriculars</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">Extracurriculars</h2>
              {computed?.ecBand && <SourceBadge source="EC Evaluator" />}
            </div>
            <div>
              <label className={labelClass}>EC Band</label>
              <select
                value={profile.ecBand}
                onChange={(e) => updateField("ecBand", e.target.value)}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="">Not evaluated yet</option>
                <option value="limited">Limited — few or inactive</option>
                <option value="developing">Developing — building depth</option>
                <option value="solid">Solid — active + some leadership</option>
                <option value="strong">Strong — clear theme + impact</option>
                <option value="exceptional">Exceptional — national/major impact</option>
              </select>
              <p className="mt-1.5 text-[10px] text-text-muted">
                Auto-fills from EC Evaluator. You can also set this manually.
              </p>
            </div>

            {/* Distinguished EC flags. Triggers the 'exceptional' band override
                in the chance model and unlocks the holistic-elite distinguished
                maxed multiplier (3.5×). Check only what's true; these are
                tier-defining signals (not "I led a club"). */}
            <div className="mt-5 pt-5 border-t border-border-hair">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-2">
                Distinguished signals
              </div>
              <p className="text-[11px] text-text-muted mb-3 leading-relaxed">
                Tier-defining accomplishments only. Each box, when checked, promotes your EC band to
                &ldquo;exceptional&rdquo; and unlocks the holistic-elite distinguished-maxed multiplier
                (top schools).
              </p>
              <div className="space-y-2">
                <FlagCheckbox
                  label="First-author research publication at a recognized venue"
                  checked={profile.firstAuthorPublication === true}
                  onChange={(v) => updateField("firstAuthorPublication", v)}
                />
                <FlagCheckbox
                  label="National or international competition placement"
                  checked={profile.nationalCompetitionPlacement === true}
                  onChange={(v) => updateField("nationalCompetitionPlacement", v)}
                />
                <FlagCheckbox
                  label="Founded a business with measurable users or revenue"
                  checked={profile.founderWithUsers === true}
                  onChange={(v) => updateField("founderWithUsers", v)}
                />
                <FlagCheckbox
                  label="Selective summer program admit (RSI, TASP, MITES, SSP, Telluride)"
                  checked={profile.selectiveProgram === true}
                  onChange={(v) => updateField("selectiveProgram", v)}
                />
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* Essay Scores — moved to follow ECs per the new order
            Basics → GPA → Coursework → Tests → ECs → Essays → Major. */}
        <ScrollReveal delay={0.3}>
          <fieldset
            id="profile-essay"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">Essay Scores</legend>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">Essay Scores</h2>
              {computed?.essayCommonApp && <SourceBadge source="Essay Grader" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Common App Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 82"
                  value={profile.essayCommonApp}
                  onChange={(e) => updateField("essayCommonApp", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>VSPICE Composite (0-24)</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  placeholder="e.g. 18"
                  value={profile.essayVspice}
                  onChange={(e) => updateField("essayVspice", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* Academic Interests — moved to the end (after academics + ECs +
            essays) since "what I want to study" is downstream of "what
            I've actually done." */}
        <ScrollReveal delay={0.32}>
          <fieldset
            id="profile-major"
            className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6 scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">Academic Interests</legend>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">
                  Academic Interests
                </h2>
                <p className="text-[10px] text-text-faint mt-0.5">
                  Used to badge strong-fit schools, surface major-tailored picks, and tune chance estimates.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Intended major</label>
                <MajorSelect
                  value={profile.intendedMajor ?? ""}
                  onChange={(v) =>
                    updateField("intendedMajor", v === "Any" ? "" : v)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>
                  Specific interest <span className="text-text-faint">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. quant trading, climate policy"
                  value={profile.intendedInterest ?? ""}
                  onChange={(e) => updateField("intendedInterest", e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-[10px] text-text-muted">
                  A niche or theme inside your major. Helps the matcher find adjacent-fit schools.
                </p>
              </div>
            </div>
          </fieldset>
        </ScrollReveal>

        {/* Summary Card */}
        <ScrollReveal delay={0.35}>
          <fieldset
            id="profile-summary"
            className="bg-bg-surface rounded-md p-6 border border-border-hair scroll-mt-32 min-w-0"
          >
            <legend className="sr-only">Auto-Fill Summary</legend>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em] mb-4">Auto-Fill Summary</h2>
            <p className="text-xs text-text-muted mb-4">
              These values auto-fill into the College List Builder and Chance Calculator.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="UW GPA" value={profile.gpaUW || "—"} />
              <SummaryItem label="W GPA" value={profile.gpaW || "—"} />
              <SummaryItem label="SAT" value={satComposite !== null ? String(satComposite) : "—"} />
              <SummaryItem label="ACT" value={actComposite !== null ? String(actComposite) : "—"} />
              <SummaryItem label="Essay" value={profile.essayCommonApp ? `${profile.essayCommonApp}/100` : "—"} />
              <SummaryItem label="VSPICE" value={profile.essayVspice ? `${profile.essayVspice}/24` : "—"} />
              <SummaryItem label="ECs" value={profile.ecBand ? (EC_BAND_LABELS as Record<string, string>)[profile.ecBand] ?? profile.ecBand : "—"} />
              <SummaryItem
                label="Coursework"
                value={
                  profile.advancedCourseworkAvailable === "none"
                    ? "n/a"
                    : `${(profile.advancedCoursework ?? []).length} courses`
                }
              />
              <SummaryItem label="Major" value={profile.intendedMajor || "—"} />
              <SummaryItem label="Interest" value={profile.intendedInterest || "—"} />
            </div>
          </fieldset>
        </ScrollReveal>
        </form>
      </main>
    </>
  );
}

function AdvancedCourseworkSection({
  rows,
  available,
  onUpdate,
}: {
  rows: import("@/lib/profile-types").AdvancedCourseworkRow[];
  available: "all" | "limited" | "none";
  onUpdate: (rows: import("@/lib/profile-types").AdvancedCourseworkRow[]) => void;
}) {
  const [type, setType] = useState<"AP" | "IB-HL" | "IB-SL">("AP");
  const [name, setName] = useState("");
  const [score, setScore] = useState<string>("");
  const [expanded, setExpanded] = useState(rows.length > 0);

  const maxScore = type === "AP" ? 5 : 7;
  const addRow = () => {
    if (!name.trim()) return;
    const s = score ? parseInt(score, 10) : undefined;
    if (s !== undefined && (s < 1 || s > maxScore)) return;
    onUpdate([...rows, { type, name: name.trim(), score: s }]);
    setName("");
    setScore("");
  };
  const removeRow = (index: number) => onUpdate(rows.filter((_, i) => i !== index));

  if (available === "none") {
    return (
      <div className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em] mb-2">
          Advanced Coursework
        </h2>
        <p className="text-[12px] text-text-muted leading-relaxed">
          You marked your school as not offering AP/IB. The chance model
          waives the rigor requirement — no penalty for not having scores.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg-surface rounded-md p-6 border border-border-hair mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-[0.08em]">
            Advanced Coursework
          </h2>
          <p className="text-[10px] text-text-faint mt-0.5">
            AP / IB-HL / IB-SL courses with scores. DE excluded. The chance
            model derives a 6-tier rigor signal from these.
          </p>
        </div>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1.5 text-xs text-accent-text hover:text-accent-text transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>

      {expanded && (
        <>
          {rows.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {rows.map((row, i) => {
                const tone =
                  row.score == null
                    ? "text-text-muted"
                    : row.type === "AP"
                      ? row.score >= 4
                        ? "text-emerald-400"
                        : row.score === 3
                          ? "text-amber-400"
                          : "text-text-muted"
                      : row.score >= 6
                        ? "text-emerald-400"
                        : row.score >= 4
                          ? "text-amber-400"
                          : "text-text-muted";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-bg-surface border border-border-hair px-3 py-1.5"
                  >
                    <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted w-16">
                      {row.type}
                    </span>
                    <span className="flex-1 text-xs text-text-secondary truncate">{row.name}</span>
                    <span className={`text-xs font-bold ${tone}`}>
                      {row.score == null ? "in progress" : row.score}
                    </span>
                    <button
                      onClick={() => removeRow(i)}
                      className="text-text-faint hover:text-red-400 transition-colors p-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-12 gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "AP" | "IB-HL" | "IB-SL")}
              className={`${inputClass} col-span-3 appearance-none cursor-pointer`}
            >
              <option value="AP">AP</option>
              <option value="IB-HL">IB-HL</option>
              <option value="IB-SL">IB-SL</option>
            </select>
            <input
              type="text"
              placeholder={type === "AP" ? "AP subject…" : "IB course…"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRow();
                }
              }}
              className={`${inputClass} col-span-5`}
            />
            <input
              type="number"
              min={1}
              max={maxScore}
              placeholder={`/${maxScore}`}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className={`${inputClass} col-span-2`}
            />
            <button
              onClick={addRow}
              disabled={!name.trim()}
              className="col-span-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add
            </button>
          </div>
          <p className="mt-2 text-[10px] text-text-faint leading-relaxed">
            Score optional — leave blank for in-progress courses.
          </p>
        </>
      )}
    </div>
  );
}

function FlagCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer text-[12px] text-text-secondary hover:text-text-primary transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-bg-surface text-accent-text focus:ring-blue-500/40 focus:ring-offset-0"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <div className="text-center">
      <p className="text-[10px] text-text-faint uppercase tracking-[0.08em] mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${isEmpty ? "text-zinc-700" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

// Weighted-scale advisory card. Sits above the GPA inputs to surface the
// 5.0-scale assumption that the Academic Index relies on. Tone is
// informational, not warning — most students don't need to convert.
function GpaScaleNote() {
  return (
    <div className="mb-4 rounded-xl bg-blue-500/[0.05] border border-blue-500/[0.18] px-4 py-3 flex items-start gap-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 text-accent-text shrink-0"
        aria-hidden="true"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="12" y2="14" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-accent-text leading-snug">
          Use the 5.0 normalized scale
        </p>
        <p className="text-[11px] text-accent-text/70 mt-0.5 leading-relaxed">
          If your school uses a different weighted scale (4.5, 6.0, 100-point, etc.),
          convert your GPA first.
        </p>
        <a
          href="/gpa"
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-text hover:text-accent-text underline decoration-accent-line underline-offset-2 transition-colors"
        >
          Open GPA Calculator
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// Soft-validation: returns true when the input parses to a number above the
// stated ceiling. Empty string and unparsable inputs are not flagged — the
// type=number input plus max attribute already constrain typical entry.
function isOverScale(raw: string, ceiling: number): boolean {
  if (!raw || raw.trim() === "") return false;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return false;
  return n > ceiling;
}
