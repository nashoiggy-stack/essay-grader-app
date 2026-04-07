"use client";

import { motion } from "motion/react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useProfile } from "@/hooks/useProfile";
import { computeSATComposite, computeACTComposite } from "@/lib/profile-types";
import { EC_BAND_LABELS } from "@/lib/extracurricular-types";

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all";
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-blue-400/70 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-blue-400" />
      {source}
    </span>
  );
}

export default function ProfilePage() {
  const { profile, computed, loaded, updateField, updateSAT, updateACT, resetToComputed } = useProfile();

  if (!loaded) {
    return (
      <AuroraBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-6 w-6 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      </AuroraBackground>
    );
  }

  const satComposite = computeSATComposite(profile.sat);
  const actComposite = computeACTComposite(profile.act);

  return (
    <AuroraBackground>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16 font-[family-name:var(--font-geist-sans)]">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gradient">Your Profile</span>
          </h1>
          <p className="text-zinc-400 max-w-xl text-lg leading-relaxed">
            Your scores and stats auto-fill from the tools you&apos;ve used. Edit anything here — it will be used across all tools.
          </p>
        </div>

        {/* Reset Button */}
        <ScrollReveal delay={0.05}>
          <div className="flex justify-end mb-6">
            <button
              onClick={resetToComputed}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-white/[0.06] rounded-lg px-3 py-1.5 hover:bg-white/[0.04] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.87"/></svg>
              Reset to calculated values
            </button>
          </div>
        </ScrollReveal>

        {/* GPA Section */}
        <ScrollReveal delay={0.1}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">GPA</h2>
              {computed?.gpaUW && <SourceBadge source="GPA Calculator" />}
            </div>
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
                />
              </div>
              <div>
                <label className={labelClass}>Weighted GPA</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5.0"
                  placeholder="e.g. 4.52"
                  value={profile.gpaW}
                  onChange={(e) => updateField("gpaW", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className={labelClass}>Course Rigor</label>
              <select
                value={profile.rigor}
                onChange={(e) => updateField("rigor", e.target.value as "low" | "medium" | "high")}
                className={`${inputClass} appearance-none cursor-pointer`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* SAT Section */}
        <ScrollReveal delay={0.15}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">SAT</h2>
              {satComposite !== null && (
                <span className="text-sm font-mono text-zinc-300">
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
                  value={profile.sat.readingWriting}
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
                  value={profile.sat.math}
                  onChange={(e) => updateSAT("math", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ACT Section */}
        <ScrollReveal delay={0.2}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">ACT</h2>
              {actComposite !== null && (
                <span className="text-sm font-mono text-zinc-300">
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
                  value={profile.act.english}
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
                  value={profile.act.math}
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
                  value={profile.act.reading}
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
                  value={profile.act.science}
                  onChange={(e) => updateACT("science", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Essay Scores */}
        <ScrollReveal delay={0.25}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Essay Scores</h2>
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
                <label className={labelClass}>VSPICE Composite (0-4)</label>
                <input
                  type="number"
                  min="0"
                  max="4"
                  step="0.1"
                  placeholder="e.g. 3.2"
                  value={profile.essayVspice}
                  onChange={(e) => updateField("essayVspice", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Extracurriculars */}
        <ScrollReveal delay={0.3}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06] mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Extracurriculars</h2>
              {computed?.ecBand && <SourceBadge source="EC Evaluator" />}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>EC Band</label>
                <div className={`${inputClass} flex items-center`}>
                  {profile.ecBand ? (
                    <span className="text-zinc-200 capitalize">
                      {(EC_BAND_LABELS as Record<string, string>)[profile.ecBand] ?? profile.ecBand}
                    </span>
                  ) : (
                    <span className="text-zinc-600">Not evaluated yet</span>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>EC Strength</label>
                <select
                  value={profile.ecStrength}
                  onChange={(e) => updateField("ecStrength", e.target.value as "low" | "medium" | "high")}
                  className={`${inputClass} appearance-none cursor-pointer`}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Summary Card */}
        <ScrollReveal delay={0.35}>
          <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06]">
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider mb-4">Auto-Fill Summary</h2>
            <p className="text-xs text-zinc-500 mb-4">
              These values auto-fill into the College List Builder and Chance Calculator.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryItem label="UW GPA" value={profile.gpaUW || "—"} />
              <SummaryItem label="W GPA" value={profile.gpaW || "—"} />
              <SummaryItem label="SAT" value={satComposite !== null ? String(satComposite) : "—"} />
              <SummaryItem label="ACT" value={actComposite !== null ? String(actComposite) : "—"} />
              <SummaryItem label="Essay" value={profile.essayCommonApp ? `${profile.essayCommonApp}/100` : "—"} />
              <SummaryItem label="VSPICE" value={profile.essayVspice ? `${profile.essayVspice}/4` : "—"} />
              <SummaryItem label="ECs" value={profile.ecBand ? (EC_BAND_LABELS as Record<string, string>)[profile.ecBand] ?? profile.ecBand : "—"} />
              <SummaryItem label="Rigor" value={profile.rigor.charAt(0).toUpperCase() + profile.rigor.slice(1)} />
            </div>
          </div>
        </ScrollReveal>
      </main>
    </AuroraBackground>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const isEmpty = value === "—";
  return (
    <div className="text-center">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold font-mono ${isEmpty ? "text-zinc-700" : "text-zinc-200"}`}>{value}</p>
    </div>
  );
}
