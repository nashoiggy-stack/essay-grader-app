"use client";

import React from "react";
import { motion } from "motion/react";
import type { ClassifiedCollege } from "@/lib/college-types";

const CLASS_COLORS = {
  reach: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Reach" },
  target: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", label: "Target" },
  safety: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Safety" },
} as const;

interface CollegeCardProps {
  readonly item: ClassifiedCollege;
  readonly index: number;
}

export const CollegeCard: React.FC<CollegeCardProps> = ({ item, index }) => {
  const { college: c, classification, reason, fitScore } = item;
  const colors = CLASS_COLORS[classification];

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
            {c.usNewsRank && <> &middot; <span className="text-indigo-400">#{c.usNewsRank} US News</span></>}
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
        <Stat label="SAT Range" value={`${c.satRange[0]}-${c.satRange[1]}`} />
        <Stat label="ACT Range" value={`${c.actRange[0]}-${c.actRange[1]}`} />
      </div>

      <p className="mt-3 text-xs text-zinc-500 leading-relaxed">{reason}</p>
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
