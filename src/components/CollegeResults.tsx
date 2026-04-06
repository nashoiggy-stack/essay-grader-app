"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import type { ClassifiedCollege, Classification } from "@/lib/college-types";
import { CollegeCard } from "./CollegeCard";

interface CollegeResultsProps {
  readonly results: ClassifiedCollege[];
  readonly sortedBy: (key: "acceptanceRate" | "fit") => ClassifiedCollege[];
}

const GROUPS: { key: Classification; label: string; color: string }[] = [
  { key: "safety", label: "Safety", color: "text-emerald-400" },
  { key: "likely", label: "Likely", color: "text-blue-400" },
  { key: "target", label: "Target", color: "text-amber-400" },
  { key: "reach", label: "Reach", color: "text-orange-400" },
  { key: "unlikely", label: "Unlikely", color: "text-red-500" },
];

export const CollegeResults: React.FC<CollegeResultsProps> = ({ results, sortedBy }) => {
  const [sort, setSort] = useState<"acceptanceRate" | "fit">("acceptanceRate");

  const sorted = sort === "fit" ? sortedBy("fit") : results;

  if (results.length === 0) {
    return (
      <div className="glass rounded-2xl p-12 ring-1 ring-white/[0.06] text-center">
        <p className="text-zinc-500 text-lg mb-2">No schools match your filters</p>
        <p className="text-zinc-600 text-sm">Try broadening your criteria — remove a filter or widen the acceptance rate range.</p>
      </div>
    );
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: sorted.filter((r) => r.classification === g.key),
  }));

  return (
    <div className="space-y-8">
      {/* Sort controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Sort by:</span>
        {(["acceptanceRate", "fit"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`text-xs px-3 py-1 rounded-lg transition-all ${
              sort === key
                ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30"
                : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {key === "acceptanceRate" ? "Acceptance Rate" : "Fit Score"}
          </button>
        ))}
      </div>

      {/* Grouped results */}
      {grouped.map((group) => {
        if (group.items.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="flex items-center gap-3 mb-4">
              <h3 className={`text-sm font-bold uppercase tracking-wider ${group.color}`}>
                {group.label}
              </h3>
              <span className="text-xs text-zinc-600">({group.items.length})</span>
              <div className="flex-1 h-px bg-white/[0.04]" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.items.map((item, i) => (
                <CollegeCard key={item.college.name} item={item} index={i} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
