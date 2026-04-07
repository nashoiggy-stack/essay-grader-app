"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import type { ClassifiedCollege } from "@/lib/college-types";
import type { ProfileSpike } from "@/lib/extracurricular-types";

const CLASS_COLORS = {
  unlikely: { bg: "bg-red-600/10", border: "border-red-600/20", text: "text-red-500", label: "Unlikely" },
  reach: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Reach" },
  target: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Target" },
  likely: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", label: "Likely" },
  safety: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Safety" },
} as const;

// Map EC spike categories to college tags for matching
const SPIKE_TAG_MAP: Record<string, string[]> = {
  "stem research": ["research", "tech", "stem"],
  "research": ["research"],
  "community service": ["service", "community", "collaborative"],
  "arts": ["arts", "creative"],
  "athletics": ["athletics"],
  "leadership": ["collaborative", "pre-professional"],
  "business": ["pre-professional", "business"],
  "entrepreneurship": ["pre-professional", "business"],
};

function getSpikeMatch(spikes: ProfileSpike[], tags: string[]): string | null {
  for (const spike of spikes) {
    const matchTags = SPIKE_TAG_MAP[spike.category.toLowerCase()] ?? [];
    const match = matchTags.find((t) => tags.some((tag) => tag.toLowerCase().includes(t)));
    if (match) return spike.category;
  }
  return null;
}

interface CollegeCardProps {
  readonly item: ClassifiedCollege;
  readonly index: number;
}

export const CollegeCard: React.FC<CollegeCardProps> = ({ item, index }) => {
  const { college: c, classification, reason, fitScore } = item;
  const colors = CLASS_COLORS[classification];

  const spikeMatch = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("ec-evaluator-result") : null;
      if (!raw) return null;
      const ecResult = JSON.parse(raw);
      if (!ecResult?.spikes?.length) return null;
      return getSpikeMatch(ecResult.spikes, c.tags);
    } catch {
      return null;
    }
  }, [c.tags]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-xl bg-[#12121f] border ${colors.border} p-4 hover:bg-[#16162a] transition-colors`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-zinc-200 truncate">{c.name}</h4>
          <p className="text-xs text-zinc-500">
            {c.state} &middot; {c.type === "public" ? "Public" : "Private"} &middot; {c.setting}
            {c.usNewsRank && <> &middot; <span className="text-blue-400">#{c.usNewsRank} US News</span></>}
          </p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} ring-1 ${colors.border}`}>
          {colors.label}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        <Stat label="Accept Rate" value={`${c.acceptanceRate}%`} />
        <Stat label="Avg UW GPA" value={c.avgGPAUW.toFixed(2)} />
        <Stat label="Avg W GPA" value={c.avgGPAW.toFixed(2)} />
        <Stat label="Fit Score" value={`${fitScore}`} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <Stat label="SAT Range" value={`${c.sat25}-${c.sat75}`} />
        <Stat label="ACT Range" value={`${c.act25}-${c.act75}`} />
      </div>

      <p className="mt-3 text-xs text-zinc-500 leading-relaxed">{reason}</p>

      {spikeMatch && (
        <p className="mt-2 text-[10px] text-blue-400/80 flex items-center gap-1">
          <span>⭐</span> Your {spikeMatch} profile aligns with this school
        </p>
      )}
    </motion.div>
  );
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-mono text-zinc-300">{value}</p>
    </div>
  );
}
