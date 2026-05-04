"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";

export type StrategyStrength = "strong" | "mixed" | "weak" | "neutral" | "warning";

const STRENGTH_STYLES: Record<
  StrategyStrength,
  { dot: string; ring: string; label: string; text: string }
> = {
  // Strength badges use the OKLCH tier tokens so they stay legible in
  // light, dark, and monochrome themes — the prior raw Tailwind ramps
  // (emerald-300 / amber-300 / red-300 / orange-300) were dark-mode-only.
  strong: {
    dot: "bg-tier-safety-fg",
    ring: "ring-tier-safety-fg/40",
    label: "Strong",
    text: "text-tier-safety-fg",
  },
  mixed: {
    dot: "bg-tier-target-fg",
    ring: "ring-tier-target-fg/40",
    label: "Mixed",
    text: "text-tier-target-fg",
  },
  weak: {
    dot: "bg-tier-unlikely-fg",
    ring: "ring-tier-unlikely-fg/40",
    label: "Weak",
    text: "text-tier-unlikely-fg",
  },
  warning: {
    dot: "bg-tier-reach-fg",
    ring: "ring-tier-reach-fg/40",
    label: "Warning",
    text: "text-tier-reach-fg",
  },
  neutral: {
    dot: "bg-zinc-500",
    ring: "ring-zinc-500/30",
    label: "",
    text: "text-text-secondary",
  },
};

export interface StrategyCardProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly strength?: StrategyStrength;
  readonly headline?: string;             // one-line summary shown in header
  readonly defaultExpanded?: boolean;
  readonly emphasize?: boolean;           // highlighted card (Dream School, Action Plan)
  readonly rightSlot?: React.ReactNode;   // e.g. completed-count badge
  readonly children: React.ReactNode;
}

/**
 * Reusable expand/collapse card for the Strategy Engine.
 *
 * - Header shows icon, title, optional strength indicator dot, optional
 *   headline, and a chevron that rotates on expand.
 * - Children render only when expanded (animated height + opacity).
 * - `emphasize` swaps the default bg/border for a blue-tinted variant so
 *   the Dream School and Action Plan cards stand out.
 */
export const StrategyCard: React.FC<StrategyCardProps> = ({
  icon,
  title,
  strength = "neutral",
  headline,
  defaultExpanded = false,
  emphasize = false,
  rightSlot,
  children,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const style = STRENGTH_STYLES[strength];

  return (
    <div
      className={`rounded-md border overflow-hidden transition-[background-color,border-color] duration-200 ${
        emphasize
          ? "bg-blue-500/[0.04] border-accent-line hover:border-accent-line"
          : "bg-bg-surface border-border-hair hover:border-white/[0.12]"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            emphasize
              ? "bg-accent-soft text-accent-text"
              : "bg-bg-surface text-text-secondary group-hover:text-text-primary"
          }`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-[0.08em]">
              {title}
            </h3>
            {strength !== "neutral" && (
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded-full bg-bg-surface  ${style.ring} ${style.text}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </span>
            )}
          </div>
          {headline && (
            <p className="mt-0.5 text-xs text-text-secondary truncate">{headline}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0 mr-2">{rightSlot}</div>}
        <ChevronDown
          className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 [transition-timing-function:var(--ease-out)] ${
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
            <div className="px-5 pb-5 pt-1 border-t border-border-hair">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
