"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap } from "lucide-react";
import type { StrategyAnalysis, StrategyResult } from "@/lib/strategy-types";

export function SpikeBody({
  result,
  analysis,
}: {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
}) {
  const [improveOpen, setImproveOpen] = useState(false);
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
        {result.spikeAnalysis.body}
      </p>

      {/* Signals from analyzer */}
      <div className="flex flex-wrap gap-1.5">
        {analysis.spike.signals.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-bg-surface text-text-secondary"
          >
            {s}
          </span>
        ))}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setImproveOpen((v) => !v)}
          aria-expanded={improveOpen}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-text hover:text-accent-text transition-colors"
        >
          <Zap className="w-3.5 h-3.5" />
          How to sharpen this spike
        </button>
        <AnimatePresence initial={false}>
          {improveOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <ul className="mt-3 space-y-2 text-[13px] text-text-secondary leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-accent-text shrink-0">→</span>
                  <span>
                    Convert your strongest Tier-3 activity into a Tier-2 move via measurable
                    impact (numbers, growth, outcomes) — depth beats breadth.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-text shrink-0">→</span>
                  <span>
                    Thread your top 3 activities around one theme. A &quot;why&quot; statement
                    that connects them makes the spike legible to readers in 10 seconds.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent-text shrink-0">→</span>
                  <span>
                    Add one external validation signal — a published piece, a selective
                    program acceptance, or a regional-level win within the spike category.
                  </span>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
