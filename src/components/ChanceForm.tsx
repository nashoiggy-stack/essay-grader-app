"use client";

import React, { useEffect, useState } from "react";
import type { ChanceInputs, ApplicationPlan } from "@/lib/college-types";
import type { College } from "@/lib/college-types";
// UNDO [application-plan]: remove APPLICATION_PLAN_LABELS and getApplicationOptions imports
import { APPLICATION_PLAN_LABELS } from "@/lib/college-types";
import { getApplicationOptions } from "@/lib/admissions";
import type { AdvancedCourseworkRow } from "@/lib/profile-types";
import { getCachedJson } from "@/lib/cloud-storage";
import { MajorSelect } from "./MajorSelect";
import { CollegeCombobox } from "./CollegeCombobox";

interface ChanceFormProps {
  readonly inputs: ChanceInputs;
  readonly colleges: readonly College[];
  readonly onUpdate: <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => void;
  readonly onReset: () => void;
}

const inputClass =
  "w-full rounded-sm bg-bg-inset border border-border-hair px-3 py-2 text-sm text-text-primary placeholder-text-faint focus:border-[var(--accent)] focus:ring-1 focus:ring-accent-line focus:outline-none transition-[border-color,box-shadow] duration-200";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-text-secondary mb-1";

export const ChanceForm: React.FC<ChanceFormProps> = ({ inputs, colleges, onUpdate, onReset }) => {
  // Read advancedCoursework / advancedCourseworkAvailable from the saved
  // profile so the chance form mirrors what /profile shows. The chance model
  // already reads these directly via useChanceCalculator — this is purely
  // for display so users can see their entered courses without leaving the
  // page. Source of truth stays /profile.
  const [profileCoursework, setProfileCoursework] = useState<AdvancedCourseworkRow[]>([]);
  const [profileAvailability, setProfileAvailability] = useState<"all" | "limited" | "none">("all");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = (): void => {
      type ProfileSlice = {
        advancedCoursework?: AdvancedCourseworkRow[];
        apScores?: { subject: string; score: 1 | 2 | 3 | 4 | 5 }[];
        advancedCourseworkAvailable?: "all" | "limited" | "none";
      };
      const p = getCachedJson<ProfileSlice>("admitedge-profile") ?? {};
      if (Array.isArray(p.advancedCoursework) && p.advancedCoursework.length > 0) {
        setProfileCoursework(p.advancedCoursework);
      } else if (Array.isArray(p.apScores)) {
        setProfileCoursework(
          p.apScores.map((a) => ({
            type: "AP" as const,
            name: a.subject,
            score: a.score,
          })),
        );
      } else {
        setProfileCoursework([]);
      }
      if (
        p.advancedCourseworkAvailable === "all" ||
        p.advancedCourseworkAvailable === "limited" ||
        p.advancedCourseworkAvailable === "none"
      ) {
        setProfileAvailability(p.advancedCourseworkAvailable);
      }
    };
    sync();
    // Refresh when storage changes (other tab, cloud reconcile, same-tab write).
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (ce.detail?.key === "admitedge-profile") sync();
    };
    window.addEventListener("storage", sync);
    window.addEventListener("cloud-storage-changed", onChange);
    window.addEventListener("cloud-storage-reconciled", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("cloud-storage-changed", onChange);
      window.removeEventListener("cloud-storage-reconciled", sync);
    };
  }, []);

  return (
  <div className="bg-bg-surface rounded-md p-6 border border-border-hair">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-bold text-text-primary">Your Profile</h3>
      <button onClick={onReset} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
        Reset
      </button>
    </div>
    {(inputs.gpaUW || inputs.essayCommonApp) && (
      <p className="text-xs text-accent-text/70 mb-4">
        {inputs.gpaUW ? "GPA auto-filled from GPA Calculator. " : ""}
        {inputs.essayCommonApp ? "Essay scores auto-filled from Essay Grader." : ""}
      </p>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {/* College selector — typeahead combobox so picking a school is "type 3
          letters" instead of "scroll through 120 options". */}
      <div className="col-span-1 sm:col-span-2 md:col-span-3">
        <label className={labelClass}>Select a College</label>
        <CollegeCombobox
          colleges={colleges}
          value={inputs.collegeIndex}
          onChange={(idx) => onUpdate("collegeIndex", idx)}
        />
      </div>

      {/* UNDO [application-plan]: remove this entire block (the plan selector). */}
      {inputs.collegeIndex !== null && (() => {
        const selectedCollege = colleges[inputs.collegeIndex];
        if (!selectedCollege) return null;
        const options = getApplicationOptions(selectedCollege);
        if (options.length <= 1) {
          // Single option — render as a static chip rather than a dropdown.
          const only = options[0];
          return (
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <label className={labelClass}>Application Plan</label>
              <div className="inline-flex items-center gap-2 rounded-lg bg-bg-surface border border-border-hair px-3 py-2 text-sm text-text-secondary">
                <span>{APPLICATION_PLAN_LABELS[only.type]}</span>
                <span className="text-[10px] uppercase tracking-[0.08em] text-text-faint">
                  only option
                </span>
              </div>
            </div>
          );
        }
        const bindingNote = options.some((o) => o.binding);
        return (
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <label className={labelClass}>Application Plan</label>
            <select
              className={selectClass}
              value={inputs.applicationPlan}
              onChange={(e) => onUpdate("applicationPlan", e.target.value as ApplicationPlan)}
            >
              {options.map((o) => (
                <option key={o.type} value={o.type}>
                  {APPLICATION_PLAN_LABELS[o.type]}
                  {o.binding ? " — binding" : ""}
                </option>
              ))}
            </select>
            {bindingNote && (
              <p className="mt-1 text-[10px] text-text-faint">
                Binding plans require you to attend if admitted.
              </p>
            )}
          </div>
        );
      })()}
      {/* end UNDO [application-plan] */}

      {/* Residency selector — visible only when the selected school has a
          residency-specific admit rate set (UNC, UVA, GT, UCB). For most
          schools (MIT, Stanford, etc.) it would be irrelevant clutter. */}
      {inputs.collegeIndex !== null && (() => {
        const selectedCollege = colleges[inputs.collegeIndex];
        if (!selectedCollege) return null;
        const hasResidencyData =
          typeof selectedCollege.oosAcceptanceRate === "number" ||
          typeof selectedCollege.inStateAcceptanceRate === "number";
        if (!hasResidencyData) return null;
        const stateLabel = selectedCollege.state;
        return (
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <label className={labelClass}>Residency for {selectedCollege.name}</label>
            <div className="inline-flex rounded-sm bg-bg-inset border border-border-hair p-0.5">
              {(["in-state", "oos", "international"] as const).map((opt) => {
                const active = inputs.residency === opt;
                const label =
                  opt === "in-state" ? `In-state (${stateLabel})`
                  : opt === "oos" ? "Out-of-state"
                  : "International";
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onUpdate("residency", opt)}
                    className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${
                      active
                        ? "bg-bg-surface text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-text-faint">
              {selectedCollege.name} has a residency-dependent admit rate. Picking the wrong option produces a misleading chance.
            </p>
          </div>
        );
      })()}

      {/* GPA-scale note spans both columns. Surfaces the 5.0-scale
          assumption that the Academic Index depends on; users with
          differently weighted scales (4.5/6.0/100-pt) need to convert
          via the GPA Calculator first. */}
      <div className="col-span-1 sm:col-span-2 md:col-span-3">
        <GpaScaleNote />
      </div>

      {/* Stats */}
      <div>
        <label className={labelClass}>Unweighted GPA (4.0)</label>
        <input type="number" step="0.01" min="0" max="4.0" placeholder="e.g. 3.8"
          className={inputClass} value={inputs.gpaUW}
          aria-invalid={isOverScale(inputs.gpaUW, 4.0) ? true : undefined}
          onChange={(e) => onUpdate("gpaUW", e.target.value)} />
        {isOverScale(inputs.gpaUW, 4.0) && (
          <p className="mt-1 text-[10px] text-tier-unlikely-fg leading-snug">
            Exceeds 4.0 scale — convert via GPA calculator.
          </p>
        )}
      </div>
      <div>
        <label className={labelClass}>Weighted GPA (5.0)</label>
        <input type="number" step="0.01" min="0" max="5.0" placeholder="e.g. 4.3"
          className={inputClass} value={inputs.gpaW}
          aria-invalid={isOverScale(inputs.gpaW, 5.0) ? true : undefined}
          onChange={(e) => onUpdate("gpaW", e.target.value)} />
        {isOverScale(inputs.gpaW, 5.0) && (
          <p className="mt-1 text-[10px] text-tier-unlikely-fg leading-snug">
            Exceeds 5.0 scale — convert via GPA calculator.
          </p>
        )}
      </div>
      <div>
        <label className={labelClass}>SAT (optional)</label>
        <input type="number" min="400" max="1600" placeholder="e.g. 1400"
          className={inputClass} value={inputs.sat}
          onChange={(e) => onUpdate("sat", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Composite (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 32"
          className={inputClass} value={inputs.act}
          onChange={(e) => onUpdate("act", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>ACT Science (optional)</label>
        <input type="number" min="1" max="36" placeholder="e.g. 30"
          className={inputClass} value={inputs.actScience}
          onChange={(e) => onUpdate("actScience", e.target.value)} />
        <p className="text-[10px] text-text-faint mt-1">Not included in composite</p>
      </div>

      {/* Course rigor moved to /profile.advancedCoursework. The dropdown was
          removed to avoid two competing inputs. AP entry stays inline below;
          IB scores live in /profile (linked from the AP Exam Scores header). */}
      <div>
        <label className={labelClass}>Intended Major</label>
        <MajorSelect
          value={inputs.major}
          onChange={(v) => onUpdate("major", v)}
          ariaLabel="Intended major for chance calculation"
        />
        <p className="mt-1 text-[10px] text-text-muted">
          Synced with your college list &amp; strategy.
        </p>
      </div>
      <div>
        <label className={labelClass}>Extracurricular Band</label>
        <select className={selectClass} value={inputs.ecBand}
          onChange={(e) => onUpdate("ecBand", e.target.value as ChanceInputs["ecBand"])}>
          <option value="">Not set</option>
          <option value="limited">Limited — few or inactive</option>
          <option value="developing">Developing — building depth</option>
          <option value="solid">Solid — active + some leadership</option>
          <option value="strong">Strong — clear theme + impact</option>
          <option value="exceptional">Exceptional — national/major impact</option>
        </select>
        <p className="mt-1 text-[10px] text-text-muted">Auto-fills from EC Evaluator.</p>
      </div>
      <div>
        <label className={labelClass}>Common App Score (0-100)</label>
        <input type="number" min="0" max="100" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayCommonApp}
          onChange={(e) => onUpdate("essayCommonApp", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>VSPICE Score (0-24)</label>
        <input type="number" step="1" min="0" max="24" placeholder="From Essay Grader"
          className={inputClass} value={inputs.essayVspice}
          onChange={(e) => onUpdate("essayVspice", e.target.value)} />
      </div>
    </div>

    {/* Advanced Coursework — read-only summary pulled from /profile.
        Editing happens in /profile so there's exactly one source of truth.
        The chance model reads advancedCoursework[] directly from the saved
        profile via useChanceCalculator. */}
    <div className="mt-5 pt-5 border-t border-border-hair">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-text-secondary">Advanced Coursework</h4>
          <p className="text-[10px] text-text-faint mt-0.5">
            {profileAvailability === "none"
              ? "Marked as no AP/IB available — rigor signal waived."
              : profileCoursework.length === 0
                ? "Add AP / IB-HL / IB-SL scores in your profile to refine the rigor signal."
                : `Pulled from your profile (${profileCoursework.length} ${profileCoursework.length === 1 ? "course" : "courses"}). Edit in profile.`}
          </p>
        </div>
        <a
          href="/profile"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border-strong bg-bg-surface px-3 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-surface hover:text-white transition-colors"
        >
          {profileCoursework.length === 0 ? "Add in profile" : "Edit in profile"}
        </a>
      </div>

      {profileCoursework.length > 0 && profileAvailability !== "none" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {profileCoursework.map((row, i) => {
            const tone =
              row.score == null
                ? "text-text-muted"
                : row.type === "AP"
                  ? row.score >= 4
                    ? "text-tier-safety-fg"
                    : row.score === 3
                      ? "text-tier-target-fg"
                      : "text-text-muted"
                  : row.score >= 6
                    ? "text-tier-safety-fg"
                    : row.score >= 4
                      ? "text-tier-target-fg"
                      : "text-text-muted";
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-bg-surface border border-border-hair px-3 py-1.5"
              >
                <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted w-12 shrink-0">
                  {row.type}
                </span>
                <span className="flex-1 text-xs text-text-secondary truncate">{row.name}</span>
                <span className={`text-xs font-bold ${tone}`}>
                  {row.score == null ? "—" : row.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  );
};

// Weighted-scale advisory card. Mirrors the /profile version — surfaces the
// 5.0-scale assumption the Academic Index depends on with a quick deep-link
// to the GPA Calculator for students whose schools use a different scale.
function GpaScaleNote() {
  return (
    <div className="rounded-md bg-accent-soft border border-accent-line px-4 py-3 flex items-start gap-3">
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

function isOverScale(raw: string, ceiling: number): boolean {
  if (!raw || raw.trim() === "") return false;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return false;
  return n > ceiling;
}
