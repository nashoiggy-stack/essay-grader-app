"use client";

import React, { useEffect, useState } from "react";
import type { ChanceInputs, ApplicationPlan } from "@/lib/college-types";
import type { College } from "@/lib/college-types";
// UNDO [application-plan]: remove APPLICATION_PLAN_LABELS and getApplicationOptions imports
import { APPLICATION_PLAN_LABELS } from "@/lib/college-types";
import { getApplicationOptions } from "@/lib/admissions";
import type { AdvancedCourseworkRow } from "@/lib/profile-types";
import { MajorSelect } from "./MajorSelect";

interface ChanceFormProps {
  readonly inputs: ChanceInputs;
  readonly colleges: readonly College[];
  readonly onUpdate: <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => void;
  readonly onReset: () => void;
}

const inputClass =
  "w-full rounded-lg bg-[#0c0c1a]/90 border border-white/[0.06] px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 focus:outline-none transition-[border-color,box-shadow] duration-200";
const selectClass = `${inputClass} appearance-none cursor-pointer`;
const labelClass = "block text-xs font-medium text-zinc-400 mb-1";

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
      try {
        const raw = window.localStorage.getItem("admitedge-profile");
        if (!raw) return;
        const p = JSON.parse(raw);
        // Prefer new advancedCoursework; fall back to legacy apScores so users
        // with old data still see their courses listed.
        if (Array.isArray(p?.advancedCoursework) && p.advancedCoursework.length > 0) {
          setProfileCoursework(p.advancedCoursework);
        } else if (Array.isArray(p?.apScores)) {
          setProfileCoursework(
            p.apScores.map((a: { subject: string; score: 1 | 2 | 3 | 4 | 5 }) => ({
              type: "AP" as const,
              name: a.subject,
              score: a.score,
            })),
          );
        } else {
          setProfileCoursework([]);
        }
        if (p?.advancedCourseworkAvailable === "all" || p?.advancedCourseworkAvailable === "limited" || p?.advancedCourseworkAvailable === "none") {
          setProfileAvailability(p.advancedCourseworkAvailable);
        }
      } catch {
        /* ignore */
      }
    };
    sync();
    // Refresh when storage changes (e.g. user opens /profile in another tab).
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
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

      {/* UNDO [application-plan]: remove this entire block (the plan selector). */}
      {inputs.collegeIndex !== null && (() => {
        const selectedCollege = colleges[inputs.collegeIndex];
        if (!selectedCollege) return null;
        const options = getApplicationOptions(selectedCollege);
        if (options.length <= 1) {
          // Single option — render as a static chip rather than a dropdown.
          const only = options[0];
          return (
            <div className="col-span-2 sm:col-span-3">
              <label className={labelClass}>Application Plan</label>
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-zinc-300">
                <span>{APPLICATION_PLAN_LABELS[only.type]}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                  only option
                </span>
              </div>
            </div>
          );
        }
        const bindingNote = options.some((o) => o.binding);
        return (
          <div className="col-span-2 sm:col-span-3">
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
              <p className="mt-1 text-[10px] text-zinc-600">
                Binding plans require you to attend if admitted.
              </p>
            )}
          </div>
        );
      })()}
      {/* end UNDO [application-plan] */}

      {/* GPA-scale note spans both columns. Surfaces the 5.0-scale
          assumption that the Academic Index depends on; users with
          differently weighted scales (4.5/6.0/100-pt) need to convert
          via the GPA Calculator first. */}
      <div className="col-span-2 sm:col-span-3">
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
          <p className="mt-1 text-[10px] text-rose-400 leading-snug">
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
          <p className="mt-1 text-[10px] text-rose-400 leading-snug">
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
        <p className="text-[10px] text-zinc-600 mt-1">Not included in composite</p>
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
        <p className="mt-1 text-[10px] text-zinc-500">
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
        <p className="mt-1 text-[10px] text-zinc-500">Auto-fills from EC Evaluator.</p>
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
    <div className="mt-5 pt-5 border-t border-white/[0.06]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-zinc-300">Advanced Coursework</h4>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {profileAvailability === "none"
              ? "Marked as no AP/IB available — rigor signal waived."
              : profileCoursework.length === 0
                ? "Add AP / IB-HL / IB-SL scores in your profile to refine the rigor signal."
                : `Pulled from your profile (${profileCoursework.length} ${profileCoursework.length === 1 ? "course" : "courses"}). Edit in profile.`}
          </p>
        </div>
        <a
          href="/profile"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors"
        >
          {profileCoursework.length === 0 ? "Add in profile" : "Edit in profile"}
        </a>
      </div>

      {profileCoursework.length > 0 && profileAvailability !== "none" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {profileCoursework.map((row, i) => {
            const tone =
              row.score == null
                ? "text-zinc-500"
                : row.type === "AP"
                  ? row.score >= 4
                    ? "text-emerald-400"
                    : row.score === 3
                      ? "text-amber-400"
                      : "text-zinc-500"
                  : row.score >= 6
                    ? "text-emerald-400"
                    : row.score >= 4
                      ? "text-amber-400"
                      : "text-zinc-500";
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5"
              >
                <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 w-12 shrink-0">
                  {row.type}
                </span>
                <span className="flex-1 text-xs text-zinc-300 truncate">{row.name}</span>
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
    <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/[0.18] px-4 py-3 flex items-start gap-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 text-blue-400 shrink-0"
        aria-hidden="true"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="12" y2="14" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-blue-200 leading-snug">
          Use the 5.0 normalized scale
        </p>
        <p className="text-[11px] text-blue-200/70 mt-0.5 leading-relaxed">
          If your school uses a different weighted scale (4.5, 6.0, 100-point, etc.),
          convert your GPA first.
        </p>
        <a
          href="/gpa"
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300 hover:text-blue-200 underline decoration-blue-500/40 underline-offset-2 transition-colors"
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
