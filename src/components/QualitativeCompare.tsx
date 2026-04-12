"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { College } from "@/lib/college-types";

// ── Types ──────────────────────────────────────────────────────────────────

interface QualField {
  readonly key: string;
  readonly label: string;
  readonly getTag: (c: College) => string | null;       // compact tag for collapsed view
  readonly getDetail: (c: College) => string | null;    // expanded description
}

// ── Campus fields ──────────────────────────────────────────────────────────

const CAMPUS_FIELDS: QualField[] = [
  {
    key: "socialScene",
    label: "Social Scene",
    getTag: (c) => {
      if (c.campusDetails?.socialScene) return c.socialScene === "high" ? "Active" : c.socialScene === "low" ? "Quiet" : "Moderate";
      return c.socialScene ? c.socialScene.charAt(0).toUpperCase() + c.socialScene.slice(1) : null;
    },
    getDetail: (c) => c.campusDetails?.socialScene ?? null,
  },
  {
    key: "greekLife",
    label: "Greek Life",
    getTag: (c) => {
      if (c.greekLifePct != null) return `${c.greekLifePct}%`;
      return c.greekLifePresence ? c.greekLifePresence.charAt(0).toUpperCase() + c.greekLifePresence.slice(1) : null;
    },
    getDetail: (c) => c.campusDetails?.greekLife ?? null,
  },
  {
    key: "sportsCulture",
    label: "Sports Culture",
    getTag: (c) => {
      if (c.sportsCulture === "high") return "Game Day School";
      if (c.sportsCulture === "low") return "Minimal";
      return c.sportsCulture ? "Moderate" : null;
    },
    getDetail: (c) => c.campusDetails?.sportsCulture ?? null,
  },
  {
    key: "housing",
    label: "Housing",
    getTag: (c) => c.campusCohesion === "high" ? "Strong Residential" : c.campusCohesion === "low" ? "Commuter-Friendly" : "Mixed",
    getDetail: (c) => c.campusDetails?.housing ?? null,
  },
  {
    key: "environment",
    label: "Campus Feel",
    getTag: (c) => c.setting ? c.setting.charAt(0).toUpperCase() + c.setting.slice(1) : null,
    getDetail: (c) => c.campusDetails?.environment ?? null,
  },
];

const CULTURE_FIELDS: QualField[] = [
  {
    key: "vibe",
    label: "Vibe",
    getTag: (c) => c.vibeTags?.slice(0, 2).join(", ") ?? null,
    getDetail: (c) => c.cultureDetails?.vibe ?? null,
  },
  {
    key: "collaboration",
    label: "Collaboration",
    getTag: (c) => {
      if (c.cultureDetails?.collaboration) return c.academicIntensity === "high" ? "Intense + Collaborative" : "Collaborative";
      return null;
    },
    getDetail: (c) => c.cultureDetails?.collaboration ?? null,
  },
  {
    key: "studentType",
    label: "Student Profile",
    getTag: (c) => c.vibeTags?.[0] ?? null,
    getDetail: (c) => c.cultureDetails?.studentType ?? null,
  },
  {
    key: "academicCulture",
    label: "Academic Culture",
    getTag: (c) => c.academicIntensity === "high" ? "Intense" : c.academicIntensity === "low" ? "Relaxed" : "Balanced",
    getDetail: (c) => c.cultureDetails?.academicCulture ?? null,
  },
];

const LOCATION_FIELDS: QualField[] = [
  {
    key: "cityIntegration",
    label: "City Integration",
    getTag: (c) => {
      if (c.distanceToCityMiles != null) {
        if (c.distanceToCityMiles <= 5) return "In the city";
        if (c.distanceToCityMiles <= 20) return "Near city";
        return "Rural / remote";
      }
      return c.proximityToCity ? c.proximityToCity.charAt(0).toUpperCase() + c.proximityToCity.slice(1) : null;
    },
    getDetail: (c) => c.locationDetails?.cityIntegration ?? null,
  },
  {
    key: "internshipAccess",
    label: "Internship Access",
    getTag: (c) => c.internshipStrength === "high" ? "Strong" : c.internshipStrength === "low" ? "Limited" : "Moderate",
    getDetail: (c) => c.locationDetails?.internshipAccess ?? null,
  },
  {
    key: "surroundings",
    label: "Surroundings",
    getTag: (c) => c.weather ?? c.setting ?? null,
    getDetail: (c) => c.locationDetails?.surroundings ?? null,
  },
];

// ── Expandable qualitative row ─────────────────────────────────────────────

function QualRow({
  field,
  colleges,
}: {
  field: QualField;
  colleges: readonly College[];
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-500 font-semibold mb-1.5">
        {field.label}
      </p>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
      >
        {colleges.map((c, i) => {
          const tag = field.getTag(c);
          const detail = field.getDetail(c);
          const isExpanded = expandedIdx === i;
          const hasDetail = detail != null && detail.length > 0;

          return (
            <div key={c.name} className="min-w-0">
              <button
                type="button"
                onClick={() => hasDetail && setExpandedIdx(isExpanded ? null : i)}
                disabled={!hasDetail}
                className={`w-full rounded-lg text-left transition-all duration-200 ${
                  hasDetail
                    ? "hover:bg-white/[0.04] cursor-pointer"
                    : "cursor-default"
                } ${
                  isExpanded
                    ? "bg-white/[0.03] ring-1 ring-white/[0.08]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                  <span className="text-[11px] text-zinc-200 font-medium truncate">
                    {tag ?? "—"}
                  </span>
                  {hasDetail && (
                    <ChevronDown
                      className={`w-3 h-3 text-zinc-600 shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                  )}
                </div>
              </button>
              <AnimatePresence initial={false}>
                {isExpanded && hasDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.2, ease: [0.23, 1, 0.32, 1] },
                      opacity: { duration: 0.15, ease: [0.23, 1, 0.32, 1] },
                    }}
                    className="overflow-hidden"
                  >
                    <p className="px-2.5 pb-2 text-[11px] text-zinc-400 leading-relaxed">
                      {detail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function QualSection({
  title,
  fields,
  colleges,
  defaultExpanded = true,
}: {
  title: string;
  fields: readonly QualField[];
  colleges: readonly College[];
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
      >
        <h3 className="text-[12px] font-bold text-zinc-200 uppercase tracking-[0.12em]">
          {title}
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
            expanded ? "" : "-rotate-90"
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.24, ease: [0.23, 1, 0.32, 1] },
              opacity: { duration: 0.18, ease: [0.23, 1, 0.32, 1] },
            }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/[0.04] pt-4">
              {/* Column headers */}
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
              >
                {colleges.map((c) => (
                  <p key={c.name} className="text-[10px] text-zinc-500 font-medium truncate px-2.5">
                    {c.name.length > 20 ? c.name.split(" ").slice(0, 2).join(" ") : c.name}
                  </p>
                ))}
              </div>
              {/* Rows */}
              {fields.map((f) => (
                <QualRow key={f.key} field={f} colleges={colleges} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Public tab components ───────────────────────────────────────────────────

export function CampusTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-4">
      <QualSection title="Social & Residential" fields={CAMPUS_FIELDS} colleges={colleges} />
      <QualSection title="Location & Surroundings" fields={LOCATION_FIELDS} colleges={colleges} />
    </div>
  );
}

export function CultureTab({ colleges }: { colleges: readonly College[] }) {
  return (
    <div className="space-y-4">
      <QualSection title="Culture & Atmosphere" fields={CULTURE_FIELDS} colleges={colleges} />
      {/* Vibe tags as pill cloud */}
      <div className="rounded-2xl bg-[#0f0f1c] border border-white/[0.06] px-5 py-4">
        <p className="text-[12px] font-bold text-zinc-200 uppercase tracking-[0.12em] mb-3">
          Vibe Tags
        </p>
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${colleges.length}, 1fr)` }}
        >
          {colleges.map((c) => (
            <div key={c.name} className="space-y-1">
              <p className="text-[10px] text-zinc-500 font-medium truncate">
                {c.name.length > 20 ? c.name.split(" ").slice(0, 2).join(" ") : c.name}
              </p>
              <div className="flex flex-wrap gap-1">
                {(c.vibeTags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] ring-1 ring-white/[0.06] text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
