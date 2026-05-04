"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, X } from "lucide-react";

export interface ResumeImprovePending {
  readonly section: "awards" | "communityService" | "athletics" | "activities" | "summerExperience";
  readonly id: string;
  readonly fieldKey: string;
  readonly fieldLabel: string;
  readonly original: string;
  readonly improved: string;
}

interface Props {
  readonly pending: ResumeImprovePending | null;
  readonly onAccept: () => void;
  readonly onReject: () => void;
}

/**
 * Diff/undo preview for /resume's AI Improve action.
 *
 * The Improve button used to overwrite the field silently — dangerous
 * because the AI rewrite sometimes loses important specificity (numbers,
 * names) the user can't recover. Now: API returns the improved text,
 * page parks it in `pending`, this modal renders the before/after, and
 * the user explicitly accepts or rejects before any state mutation.
 *
 * Word-level diff: tokens present in original but missing in improved get
 * a strikethrough highlight; tokens in improved that weren't in original
 * get an additive highlight. It's a rough approximation, not a true LCS,
 * but enough for "did the AI drop a number I needed?"
 */
export function ResumeImproveDiff({ pending, onAccept, onReject }: Props) {
  // Esc to reject — standard modal expectation.
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onReject();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, onReject]);

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resume-improve-diff-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onReject();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-2xl bg-bg-surface border border-border-strong rounded-md overflow-hidden"
          >
            <header className="px-5 py-3 border-b border-border-hair flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold">
                  AI Improve
                </p>
                <h2
                  id="resume-improve-diff-title"
                  className="text-[14px] font-semibold text-text-primary truncate"
                >
                  Review changes to {pending.fieldLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={onReject}
                aria-label="Close without applying"
                className="text-text-muted hover:text-text-primary p-1 rounded-sm transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border-hair">
              <div className="p-4 max-h-[40vh] overflow-y-auto">
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                  Original
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {renderDiff(pending.original, pending.improved, "original")}
                </p>
              </div>
              <div className="p-4 max-h-[40vh] overflow-y-auto bg-bg-base/40">
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                  Improved
                </p>
                <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {renderDiff(pending.original, pending.improved, "improved")}
                </p>
              </div>
            </div>

            <footer className="px-5 py-3 border-t border-border-hair flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border-hair bg-bg-surface hover:bg-bg-elevated text-text-secondary px-3 py-1.5 text-[12px] font-medium transition-colors"
              >
                Keep original
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="inline-flex items-center gap-1.5 rounded-sm bg-[var(--accent)] hover:brightness-110 text-[var(--accent-fg,#fff)] px-3 py-1.5 text-[12px] font-semibold transition-[filter]"
              >
                <Check className="w-3.5 h-3.5" />
                Apply improvement
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function tokenize(s: string): string[] {
  // Split on whitespace boundaries while keeping punctuation attached so a
  // missing comma reads as a normal word change, not a noise token.
  return s.split(/(\s+)/);
}

function renderDiff(
  original: string,
  improved: string,
  side: "original" | "improved",
): React.ReactNode[] {
  const aTokens = tokenize(original);
  const bTokens = tokenize(improved);
  const aSet = new Set(aTokens.map((t) => t.toLowerCase()));
  const bSet = new Set(bTokens.map((t) => t.toLowerCase()));
  const tokens = side === "original" ? aTokens : bTokens;
  const compareSet = side === "original" ? bSet : aSet;

  return tokens.map((tok, i) => {
    const lower = tok.toLowerCase();
    if (/^\s+$/.test(tok) || tok === "") return tok;
    const inOther = compareSet.has(lower);
    if (inOther) return <span key={i}>{tok}</span>;
    if (side === "original") {
      return (
        <span
          key={i}
          className="bg-tier-unlikely-soft text-tier-unlikely-fg line-through decoration-tier-unlikely-fg/60"
        >
          {tok}
        </span>
      );
    }
    return (
      <span
        key={i}
        className="bg-tier-safety-soft text-tier-safety-fg"
      >
        {tok}
      </span>
    );
  });
}
