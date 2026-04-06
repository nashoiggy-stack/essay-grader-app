"use client";

import React from "react";
import { motion } from "motion/react";
import type { ChanceResult, ChanceBand } from "@/lib/college-types";

const BAND_STYLES: Record<ChanceBand, { bg: string; text: string; bar: string; glow: string }> = {
  "very-low": { bg: "bg-red-500/10", text: "text-red-400", bar: "bg-red-500", glow: "shadow-red-500/20" },
  low: { bg: "bg-orange-500/10", text: "text-orange-400", bar: "bg-orange-500", glow: "shadow-orange-500/20" },
  possible: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500", glow: "shadow-amber-500/20" },
  competitive: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500", glow: "shadow-blue-500/20" },
  strong: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500", glow: "shadow-emerald-500/20" },
};

interface ChanceResultProps {
  readonly result: ChanceResult;
  readonly collegeName: string;
}

export const ChanceResultDisplay: React.FC<ChanceResultProps> = ({ result, collegeName }) => {
  const style = BAND_STYLES[result.band];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 sm:p-8 ring-1 ring-white/[0.06] space-y-6"
    >
      {/* Band display */}
      <div className="text-center">
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
          Your chances at {collegeName}
        </p>
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`inline-block px-6 py-3 rounded-xl ${style.bg} ${style.glow} shadow-lg ring-1 ring-white/[0.06]`}
        >
          <span className={`text-2xl sm:text-3xl font-bold ${style.text}`}>
            {result.bandLabel}
          </span>
        </motion.div>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">
          <span>Very Low</span>
          <span>Low</span>
          <span>Possible</span>
          <span>Competitive</span>
          <span>Strong</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${style.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${result.score}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl bg-[#12121f] border border-white/[0.08] p-4">
        <p className="text-sm text-zinc-300 leading-relaxed">{result.explanation}</p>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-emerald-400 mb-2">Strengths</h4>
          {result.strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {result.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-emerald-400 mt-0.5 shrink-0">+</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No notable strengths identified yet</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-red-400 mb-2">Areas to Improve</h4>
          {result.weaknesses.length > 0 ? (
            <ul className="space-y-1.5">
              {result.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="text-red-400 mt-0.5 shrink-0">!</span>{w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-600">No major weaknesses identified</p>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
        <p className="text-[11px] text-amber-400/70 leading-relaxed">
          This is an estimate based on general admissions patterns and is not a guarantee.
          Actual admission decisions depend on many factors including essays, recommendations,
          demonstrated interest, and institutional priorities.
        </p>
      </div>
    </motion.div>
  );
};
