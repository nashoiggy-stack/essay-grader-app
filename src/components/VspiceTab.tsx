"use client";

import React from "react";
import { motion } from "motion/react";
import type { CriterionResult } from "@/lib/types";
import { useScoreColor } from "@/hooks/useScoreColor";

interface VspiceTabProps {
  readonly scores: Record<string, CriterionResult>;
  readonly bonuses: string[];
  readonly pitfalls: string[];
}

export const VspiceTab: React.FC<VspiceTabProps> = ({ scores, bonuses, pitfalls }) => (
  <motion.div
    key="vspice"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
    className="space-y-6"
  >
    {Object.entries(scores).map(([name, c], i) => (
      <VspiceRow key={name} name={name} score={c.score} feedback={c.feedback} index={i} />
    ))}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/[0.06]">
      <SignalList title="Bonus Signals" items={bonuses} color="emerald" icon="+" />
      <SignalList title="Pitfall Warnings" items={pitfalls} color="red" icon="!" />
    </div>
  </motion.div>
);

// ── Internal ─────────────────────────────────────────────────────────────────

interface VspiceRowProps {
  readonly name: string;
  readonly score: number;
  readonly feedback: string;
  readonly index: number;
}

const VspiceRow: React.FC<VspiceRowProps> = ({ name, score, feedback, index }) => {
  const { text, bg } = useScoreColor(score, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-200">{name}</span>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((level) => (
            <motion.div
              key={level}
              className={`w-8 h-2.5 rounded-full ${level <= score ? bg : "bg-white/[0.05]"}`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: index * 0.08 + level * 0.1, duration: 0.4 }}
              style={{ transformOrigin: "left" }}
            />
          ))}
          <span className={`ml-2 text-sm font-bold font-mono ${text}`}>{score}/4</span>
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-400 leading-relaxed">{feedback}</p>
    </motion.div>
  );
};

interface SignalListProps {
  readonly title: string;
  readonly items: string[];
  readonly color: "emerald" | "red";
  readonly icon: string;
}

const SignalList: React.FC<SignalListProps> = ({ title, items, color, icon }) => (
  <div>
    <h4 className={`text-sm font-semibold text-${color}-400 mb-3`}>{title}</h4>
    {items.length > 0 ? (
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
            <span className={`text-${color}-400 mt-0.5`}>{icon}</span>{item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-zinc-600">None detected</p>
    )}
  </div>
);
