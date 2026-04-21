"use client";

import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import type { CollegeFilters } from "@/lib/college-types";
import { REGIONS } from "@/lib/college-types";
import { MajorSelect } from "./MajorSelect";

interface CollegeFiltersProps {
  readonly filters: CollegeFilters;
  readonly onUpdate: <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => void;
  readonly onReset: () => void;
  readonly resultCount: number;
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

export const CollegeFiltersPanel: React.FC<CollegeFiltersProps> = ({
  filters, onUpdate, onReset, resultCount,
}) => {
  // Interest uses a commit-on-Done model rather than every-keystroke so the
  // user gets explicit confirmation that their niche is applied. The typed
  // value lives in local state; `filters.intendedInterest` is the committed
  // one that downstream matchers consume.
  const [pendingInterest, setPendingInterest] = useState(filters.intendedInterest);

  // When the committed value changes externally (cross-page sync, reset),
  // mirror it into the pending text field so the input doesn't go stale.
  // This is the legitimate "sync from prop" pattern; the lint rule is a
  // blunt instrument here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingInterest(filters.intendedInterest);
  }, [filters.intendedInterest]);

  const committed = filters.intendedInterest.trim();
  const pending = pendingInterest.trim();
  const hasPendingChange = pending !== committed;

  const commitInterest = () => {
    onUpdate("intendedInterest", pendingInterest.trim());
  };
  const clearInterest = () => {
    setPendingInterest("");
    onUpdate("intendedInterest", "");
  };

  return (
  <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06]">
    <div className="flex items-center justify-between mb-5">
      <h3 className="text-lg font-bold text-zinc-200">Filters</h3>
      <button onClick={onReset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        Reset all
      </button>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <p className="text-[10px] text-zinc-600 mt-1">Not included in composite</p>
      </div>
      <div>
        <label className={labelClass}>What do you want to study?</label>
        <MajorSelect
          value={filters.major}
          onChange={(v) => onUpdate("major", v)}
        />
        <p className="text-[10px] text-zinc-600 mt-1">Flags strong matches &mdash; doesn&apos;t filter out others.</p>
      </div>
      <div>
        <label className={labelClass}>Specific interest (optional)</label>
        <div className="flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. sustainability, quant trading"
            className={`${inputClass} flex-1`}
            value={pendingInterest}
            onChange={(e) => setPendingInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hasPendingChange) {
                e.preventDefault();
                commitInterest();
              }
            }}
          />
          {hasPendingChange && (
            <button
              type="button"
              onClick={commitInterest}
              aria-label="Apply interest"
              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 px-2.5 text-xs font-semibold transition-colors"
            >
              Done
            </button>
          )}
        </div>
        {committed ? (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/25 px-2 py-0.5 text-[11px] text-emerald-300">
            <Check className="w-3 h-3" strokeWidth={3} />
            <span className="truncate max-w-[180px]">Applied: {committed}</span>
            <button
              type="button"
              onClick={clearInterest}
              aria-label="Clear interest"
              className="ml-0.5 text-emerald-400/70 hover:text-emerald-200 transition-colors"
            >
              <X className="w-3 h-3" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <p className="text-[10px] text-zinc-600 mt-1">
            Niche or theme. Press <span className="text-zinc-400">Done</span> to apply.
          </p>
        )}
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

    <div className="mt-4 pt-4 border-t border-white/[0.06]">
      <p className="text-sm text-zinc-500">
        <span className="text-blue-400 font-semibold">{resultCount}</span> schools match your filters
      </p>
    </div>
  </div>
  );
};
