"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import type { CollegeFilters } from "@/lib/college-types";
import { REGIONS } from "@/lib/college-types";
import { MAX_MAJORS, MAX_INTERESTS } from "@/hooks/useCollegeFilter";
import { MajorSelect } from "./MajorSelect";

interface CollegeFiltersProps {
  readonly filters: CollegeFilters;
  readonly onUpdate: <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => void;
  readonly onReset: () => void;
  readonly resultCount: number;
}

const inputClass =
  "w-full rounded-lg bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary placeholder-zinc-600 focus:border-blue-500/50 focus: focus:ring-accent-line focus:outline-none transition-[border-color,box-shadow] duration-200";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-text-secondary mb-1";

export const CollegeFiltersPanel: React.FC<CollegeFiltersProps> = ({
  filters, onUpdate, onReset, resultCount,
}) => {
  // Pending text for the interest input — commit on Enter or Add button.
  // The committed list lives on filters.intendedInterests; this is just the
  // current keystroke buffer.
  const [pendingInterest, setPendingInterest] = useState("");

  // ── Major chip handlers ─────────────────────────────────────────────────
  const addMajor = (m: string) => {
    if (!m || m === "Any") return;
    if (filters.intendedMajors.includes(m)) return;
    if (filters.intendedMajors.length >= MAX_MAJORS) return;
    const nextSaved = [...filters.intendedMajors, m];
    const nextActive = [...filters.activeMajors, m]; // newly added is active by default
    onUpdate("intendedMajors", nextSaved);
    onUpdate("activeMajors", nextActive);
  };
  const toggleMajor = (m: string) => {
    const isActive = filters.activeMajors.includes(m);
    const nextActive = isActive
      ? filters.activeMajors.filter((x) => x !== m)
      : [...filters.activeMajors, m];
    onUpdate("activeMajors", nextActive);
  };
  const removeMajor = (m: string) => {
    onUpdate("intendedMajors", filters.intendedMajors.filter((x) => x !== m));
    onUpdate("activeMajors", filters.activeMajors.filter((x) => x !== m));
  };

  // ── Interest chip handlers ──────────────────────────────────────────────
  const addInterest = () => {
    const trimmed = pendingInterest.trim();
    if (!trimmed) return;
    if (filters.intendedInterests.includes(trimmed)) {
      setPendingInterest("");
      return;
    }
    if (filters.intendedInterests.length >= MAX_INTERESTS) return;
    onUpdate("intendedInterests", [...filters.intendedInterests, trimmed]);
    onUpdate("activeInterests", [...filters.activeInterests, trimmed]);
    setPendingInterest("");
  };
  const toggleInterest = (i: string) => {
    const isActive = filters.activeInterests.includes(i);
    const nextActive = isActive
      ? filters.activeInterests.filter((x) => x !== i)
      : [...filters.activeInterests, i];
    onUpdate("activeInterests", nextActive);
  };
  const removeInterest = (i: string) => {
    onUpdate("intendedInterests", filters.intendedInterests.filter((x) => x !== i));
    onUpdate("activeInterests", filters.activeInterests.filter((x) => x !== i));
  };

  return (
  <details className="bg-bg-surface rounded-md border border-border-hair group">
    {/* Collapsed-by-default disclosure — was a 14-field always-open panel
        that pushed the first card below the fold. The summary stays
        visible (with a one-line "active filters" hint) so users can
        always see what's filtered without expanding. */}
    <summary className="flex items-center justify-between px-6 py-3 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-center gap-3">
        <h3 className="text-[14px] font-semibold tracking-[-0.012em] text-text-primary">Filters</h3>
        <span className="text-[11px] text-text-faint group-open:hidden">click to expand</span>
        <span className="text-[11px] text-text-faint hidden group-open:inline">click to collapse</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); onReset(); }}
          className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          Reset all
        </button>
        <span className="text-text-muted transition-transform duration-200 group-open:rotate-90">›</span>
      </div>
    </summary>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 px-6 pb-6 pt-2">
      {/* Stats */}
      <div>
        <label className={labelClass}>Unweighted GPA (4.0)</label>
        <input type="number" step="0.01" min="0" max="4.0" placeholder="e.g. 3.8"
          className={inputClass} value={filters.gpaUW}
          onChange={(e) => onUpdate("gpaUW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Weighted GPA (5.0)</label>
        <input type="number" step="0.01" min="0" max="5.0" placeholder="e.g. 4.3"
          className={inputClass} value={filters.gpaW}
          onChange={(e) => onUpdate("gpaW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>SAT (optional)</label>
        <input type="number" min="400" max="1600" placeholder="e.g. 1400"
          className={inputClass} value={filters.sat}
          onChange={(e) => onUpdate("sat", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Composite (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 32"
          className={inputClass} value={filters.act}
          onChange={(e) => onUpdate("act", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Science (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 30"
          className={inputClass} value={filters.actScience}
          onChange={(e) => onUpdate("actScience", e.target.value)} />
        <p className="text-[10px] text-text-faint mt-1">Not included in composite</p>
      </div>
      {/* Majors — multi-select chip pattern. Selected majors render as chips
          below the dropdown. Click a chip to toggle active/inactive (saved
          but not filtering). The "×" removes from the list entirely. */}
      <div className="col-span-2 sm:col-span-3 lg:col-span-4">
        <label className={labelClass}>
          What do you want to study? Add up to {MAX_MAJORS}.
        </label>
        <MajorSelect
          value=""
          onChange={(v) => addMajor(v)}
          disabled={filters.intendedMajors.length >= MAX_MAJORS}
          placeholder={
            filters.intendedMajors.length >= MAX_MAJORS
              ? "Cap reached — remove a chip first"
              : "Pick a major to add…"
          }
        />
        {filters.intendedMajors.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filters.intendedMajors.map((m) => {
              const active = filters.activeMajors.includes(m);
              return (
                <span
                  key={m}
                  className={`inline-flex items-center gap-1 rounded-full text-[11px] pl-2.5 pr-1 py-0.5  transition-[background-color,color] duration-200 ${
                    active
                      ? "bg-emerald-500/15 ring-emerald-500/30 text-emerald-200"
                      : "bg-transparent ring-white/[0.12] text-text-secondary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMajor(m)}
                    aria-label={`${active ? "Deactivate" : "Activate"} ${m}`}
                    aria-pressed={active}
                    className="font-semibold"
                  >
                    {m}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMajor(m)}
                    aria-label={`Remove ${m}`}
                    className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5"
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-text-faint mt-1.5">
          {filters.activeMajors.length > 0
            ? `Filtering on: ${filters.activeMajors.join(", ")} · click a chip to toggle, × to remove`
            : filters.intendedMajors.length > 0
              ? "All majors inactive — click a chip to filter on it"
              : "Add majors to flag strong-fit schools — doesn't filter others out"}
          {filters.intendedMajors.length === MAX_MAJORS && (
            <span className="text-amber-400/80 ml-1">· {MAX_MAJORS}/{MAX_MAJORS} used</span>
          )}
        </p>
      </div>
      {/* Interests — same chip pattern, free-text input. Press Enter or
          click Add to commit a chip. */}
      <div className="col-span-2 sm:col-span-3 lg:col-span-4">
        <label className={labelClass}>
          Specific interests (optional). Add up to {MAX_INTERESTS}.
        </label>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. sustainability, quant trading"
            className={`${inputClass} flex-1`}
            value={pendingInterest}
            onChange={(e) => setPendingInterest(e.target.value)}
            disabled={filters.intendedInterests.length >= MAX_INTERESTS}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pendingInterest.trim()) {
                e.preventDefault();
                addInterest();
              }
            }}
          />
          <button
            type="button"
            onClick={addInterest}
            disabled={!pendingInterest.trim() || filters.intendedInterests.length >= MAX_INTERESTS}
            aria-label="Add interest"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-accent-soft hover:bg-accent-soft disabled:bg-bg-surface disabled:text-text-faint text-accent-text px-3 text-xs font-semibold transition-colors"
          >
            Add
          </button>
        </div>
        {filters.intendedInterests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {filters.intendedInterests.map((i) => {
              const active = filters.activeInterests.includes(i);
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-full text-[11px] pl-2.5 pr-1 py-0.5  transition-[background-color,color] duration-200 ${
                    active
                      ? "bg-emerald-500/15 ring-emerald-500/30 text-emerald-200"
                      : "bg-transparent ring-white/[0.12] text-text-secondary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleInterest(i)}
                    aria-label={`${active ? "Deactivate" : "Activate"} ${i}`}
                    aria-pressed={active}
                    className="font-semibold truncate max-w-[160px]"
                  >
                    {i}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeInterest(i)}
                    aria-label={`Remove ${i}`}
                    className="text-current opacity-60 hover:opacity-100 transition-opacity p-0.5"
                  >
                    <X className="w-3 h-3" strokeWidth={2.5} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-text-faint mt-1.5">
          {filters.activeInterests.length > 0
            ? `Filtering on: ${filters.activeInterests.join(", ")}`
            : filters.intendedInterests.length > 0
              ? "All interests inactive — click a chip to filter on it"
              : "Niches and themes; matched fuzzily against college tags"}
          {filters.intendedInterests.length === MAX_INTERESTS && (
            <span className="text-amber-400/80 ml-1">· {MAX_INTERESTS}/{MAX_INTERESTS} used</span>
          )}
        </p>
      </div>

      {/* Preferences */}
      <div>
        <label className={labelClass}>Region</label>
        <select className={selectClass} value={filters.region}
          onChange={(e) => onUpdate("region", e.target.value)}>
          {REGIONS.map((r) => <option key={r} value={r}>{r === "any" ? "Any Region" : r}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>School Size</label>
        <select className={selectClass} value={filters.size}
          onChange={(e) => onUpdate("size", e.target.value)}>
          <option value="any">Any Size</option>
          <option value="small">Small (&lt;5k)</option>
          <option value="medium">Medium (5-15k)</option>
          <option value="large">Large (15k+)</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Setting</label>
        <select className={selectClass} value={filters.setting}
          onChange={(e) => onUpdate("setting", e.target.value)}>
          <option value="any">Any Setting</option>
          <option value="urban">Urban</option>
          <option value="suburban">Suburban</option>
          <option value="rural">Rural</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Type</label>
        <select className={selectClass} value={filters.type}
          onChange={(e) => onUpdate("type", e.target.value)}>
          <option value="any">Public &amp; Private</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* Advanced */}
      <div>
        <label className={labelClass}>Acceptance Rate Min %</label>
        <input type="number" min="0" max="100" placeholder="0"
          className={inputClass} value={filters.acceptanceRateMin}
          onChange={(e) => onUpdate("acceptanceRateMin", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Acceptance Rate Max %</label>
        <input type="number" min="0" max="100" placeholder="100"
          className={inputClass} value={filters.acceptanceRateMax}
          onChange={(e) => onUpdate("acceptanceRateMax", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Test Policy</label>
        <select className={selectClass} value={filters.testPolicy}
          onChange={(e) => onUpdate("testPolicy", e.target.value)}>
          <option value="any">Any Policy</option>
          <option value="required">Required</option>
          <option value="optional">Test Optional</option>
          <option value="blind">Test Blind</option>
        </select>
      </div>

      {/* Essay scores */}
      <div>
        <label className={labelClass}>Common App Score (0-100)</label>
        <input type="number" min="0" max="100" placeholder="From Essay Grader"
          className={inputClass} value={filters.essayCommonApp}
          onChange={(e) => onUpdate("essayCommonApp", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>VSPICE Score (0-24)</label>
        <input type="number" step="1" min="0" max="24" placeholder="From Essay Grader"
          className={inputClass} value={filters.essayVspice}
          onChange={(e) => onUpdate("essayVspice", e.target.value)} />
      </div>
    </div>

    <div className="mx-6 mt-2 mb-6 pt-4 border-t border-border-hair">
      <p className="text-sm text-text-muted">
        <span className="text-accent-text font-semibold">{resultCount}</span> schools match your filters
      </p>
    </div>
  </details>
  );
};
