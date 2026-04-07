"use client";

import React from "react";
import type { ChanceInputs } from "@/lib/college-types";
import type { College } from "@/lib/college-types";

interface ChanceFormProps {
  readonly inputs: ChanceInputs;
  readonly colleges: readonly College[];
  readonly onUpdate: <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => void;
  readonly onReset: () => void;
}

const inputClass =
  "w-full rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-all";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

export const ChanceForm: React.FC<ChanceFormProps> = ({ inputs, colleges, onUpdate, onReset }) => (
  <div className="glass rounded-2xl p-6 ring-1 ring-white/[0.06]">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-bold text-zinc-200">Your Profile</h3>
      <button onClick={onReset} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        Reset
      </button>
    </div>
    {(inputs.gpaUW || inputs.essayCommonApp) && (
      <p className="text-xs text-blue-400/70 mb-4">
        {inputs.gpaUW ? "GPA auto-filled from GPA Calculator. " : ""}
        {inputs.essayCommonApp ? "Essay scores auto-filled from Essay Grader." : ""}
      </p>
    )}

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {/* College selector */}
      <div className="col-span-2 sm:col-span-3">
        <label className={labelClass}>Select a College</label>
        <select
          className={selectClass}
          value={inputs.collegeIndex ?? ""}
          onChange={(e) => onUpdate("collegeIndex", e.target.value ? parseInt(e.target.value) : null)}
        >
          <option value="">Choose a school...</option>
          {colleges.map((c, i) => (
            <option key={c.name} value={i}>
              {c.name} — {c.state} ({c.acceptanceRate}%)
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div>
        <label className={labelClass}>Unweighted GPA (4.0)</label>
        <input type="number" step="0.01" min="0" max="4.0" placeholder="e.g. 3.8"
          className={inputClass} value={inputs.gpaUW}
          onChange={(e) => onUpdate("gpaUW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Weighted GPA (5.0)</label>
        <input type="number" step="0.01" min="0" max="5.0" placeholder="e.g. 4.3"
          className={inputClass} value={inputs.gpaW}
          onChange={(e) => onUpdate("gpaW", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>SAT (optional)</label>
        <input type="number" min="400" max="1600" placeholder="e.g. 1400"
          className={inputClass} value={inputs.sat}
          onChange={(e) => onUpdate("sat", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 32"
          className={inputClass} value={inputs.act}
          onChange={(e) => onUpdate("act", e.target.value)} />
      </div>

      {/* Qualitative */}
      <div>
        <label className={labelClass}>Course Rigor</label>
        <select className={selectClass} value={inputs.rigor}
          onChange={(e) => onUpdate("rigor", e.target.value as ChanceInputs["rigor"])}>
          <option value="low">Basic / On-level</option>
          <option value="medium">Some Honors/AP</option>
          <option value="high">Mostly AP/IB/DE</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Extracurricular Strength</label>
        <select className={selectClass} value={inputs.ecStrength}
          onChange={(e) => onUpdate("ecStrength", e.target.value as ChanceInputs["ecStrength"])}>
          <option value="low">Low — few activities</option>
          <option value="medium">Medium — active involvement</option>
          <option value="high">High — leadership &amp; impact</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Common App Score (0-100)</label>
        <input type="number" min="0" max="100" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayCommonApp}
          onChange={(e) => onUpdate("essayCommonApp", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>VSPICE Score (0-4)</label>
        <input type="number" step="0.1" min="0" max="4" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayVspice}
          onChange={(e) => onUpdate("essayVspice", e.target.value)} />
      </div>
    </div>
  </div>
);
