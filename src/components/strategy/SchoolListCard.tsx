"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle } from "lucide-react";
import type { Classification } from "@/lib/college-types";
import type { StrategyAnalysis, StrategyResult } from "@/lib/strategy-types";
import { getCachedJson } from "@/lib/cloud-storage";
import { CLASSIFICATION_COLORS, CLASSIFICATION_TEXT } from "./helpers";

export function SchoolListBody({
  result,
  analysis,
}: {
  readonly result: StrategyResult;
  readonly analysis: StrategyAnalysis;
}) {
  const [selected, setSelected] = useState<Classification | null>(null);
  const { counts, total } = analysis.schoolList;
  const order: readonly Classification[] = [
    "safety",
    "likely",
    "target",
    "reach",
    "unlikely",
  ];
  return (
    <div className="space-y-4 pt-3">
      <p className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
        {result.schoolListStrategy.body}
      </p>

      {total > 0 && (
        <div>
          <div className="flex h-2 rounded-full overflow-hidden bg-bg-surface">
            {order.map((cat) => {
              const n = counts[cat];
              if (n === 0) return null;
              const pct = (n / total) * 100;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelected((s) => (s === cat ? null : cat))}
                  aria-label={`${n} ${cat} school${n === 1 ? "" : "s"}`}
                  className={`${CLASSIFICATION_COLORS[cat]} hover:brightness-125 transition-[filter] duration-150`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {order.map((cat) => {
              const n = counts[cat];
              const active = selected === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelected((s) => (s === cat ? null : cat))}
                  className={`rounded-lg px-2 py-2 text-center transition-[background-color,border-color] duration-200 border ${
                    active
                      ? "bg-bg-surface border-white/[0.16]"
                      : "bg-bg-surface border-border-hair hover:bg-bg-surface"
                  }`}
                >
                  <p
                    className={`text-lg font-semibold font-mono tabular-nums ${CLASSIFICATION_TEXT[cat]}`}
                  >
                    {n}
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-text-muted mt-0.5">
                    {cat}
                  </p>
                </button>
              );
            })}
          </div>

          <AnimatePresence initial={false}>
            {selected && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden mt-3"
              >
                <p className="text-[10px] uppercase tracking-[0.08em] text-text-muted font-semibold mb-2">
                  {counts[selected]} {selected} school{counts[selected] === 1 ? "" : "s"}
                </p>
                <SchoolsInClassificationNote classification={selected} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {analysis.schoolList.warnings.length > 0 && (
        <div className="space-y-1.5">
          {analysis.schoolList.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[12px] text-tier-target-fg"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reads pinned schools from localStorage at click time, filters by the
// selected classification, and renders the names. Avoids threading the
// full pinned list down through every card prop.
function SchoolsInClassificationNote({
  classification,
}: {
  classification: Classification;
}) {
  const names = useMemo(() => {
    const pins = getCachedJson<{ name?: string }[]>("admitedge-pinned-colleges");
    if (!Array.isArray(pins)) return [];
    return pins.map((p) => p?.name).filter((n): n is string => typeof n === "string");
  }, []);
  void classification;
  return (
    <p className="text-[12px] text-text-secondary leading-relaxed">
      Pinned schools: {names.length > 0 ? names.join(", ") : "—"}
    </p>
  );
}
