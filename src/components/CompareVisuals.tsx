"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crown, ChevronDown, Info } from "lucide-react";

// ── Comparison bar — horizontal bar showing relative positioning ────────────

interface CompareBarProps {
  readonly values: readonly { name: string; value: number; isBest: boolean }[];
  readonly min: number;
  readonly max: number;
  readonly unit?: string;
  readonly format?: (v: number) => string;
  readonly invertBest?: boolean; // true = lower is better (acceptance rate)
  readonly gradient?: string;   // tailwind gradient classes
}

export function CompareBar({
  values,
  min,
  max,
  unit = "",
  format,
  invertBest = false,
  gradient = "from-blue-500 to-blue-400",
}: CompareBarProps) {
  const range = max - min || 1;
  const formatter = format ?? ((v: number) => `${v}${unit}`);

  return (
    <div className="space-y-2">
      {values.map((v) => {
        const pct = Math.max(2, Math.min(100, ((v.value - min) / range) * 100));
        return (
          <div key={v.name} className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-400 w-20 sm:w-28 truncate shrink-0 text-right">
              {v.name.split(" ").slice(0, 2).join(" ")}
            </span>
            <div className="flex-1 h-6 rounded-lg bg-white/[0.03] overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                className={`h-full rounded-lg bg-gradient-to-r ${gradient} ${
                  v.isBest ? "opacity-100" : "opacity-60"
                }`}
              />
              <div className="absolute inset-0 flex items-center px-2 justify-between">
                <span className={`text-[11px] font-mono tabular-nums font-semibold ${
                  v.isBest ? "text-white" : "text-zinc-200"
                }`}>
                  {formatter(v.value)}
                </span>
                {v.isBest && (
                  <Crown className="w-3 h-3 text-amber-300" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Metric card — large number with label and context ───────────────────────

interface MetricCardProps {
  readonly value: string;
  readonly label: string;
  readonly context?: string;
  readonly isBest?: boolean;
  readonly color?: string; // text color class
}

export function MetricCard({
  value,
  label,
  context,
  isBest = false,
  color = "text-zinc-100",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl p-3 transition-[background-color,border-color] duration-200 ${
        isBest
          ? "bg-blue-500/[0.06] border border-blue-500/20"
          : "bg-white/[0.02] border border-white/[0.04]"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className={`text-xl sm:text-2xl font-bold font-mono tabular-nums leading-none ${color}`}>
          {value}
        </p>
        {isBest && <Crown className="w-3 h-3 text-amber-300 shrink-0 mt-1" />}
      </div>
      <p className="text-[10px] text-zinc-500 mt-1.5 uppercase tracking-[0.1em] leading-snug">
        {label}
      </p>
      {context && (
        <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">{context}</p>
      )}
    </div>
  );
}

// ── Expandable comparison section ───────────────────────────────────────────

interface CompareSectionProps {
  readonly title: string;
  readonly defaultExpanded?: boolean;
  readonly children: React.ReactNode;
}

export function CompareSection({
  title,
  defaultExpanded = true,
  children,
}: CompareSectionProps) {
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
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Row with context tooltip ────────────────────────────────────────────────

interface CompareRowProps {
  readonly label: string;
  readonly context?: string;
  readonly children: React.ReactNode;
}

export function CompareRow({ label, context, children }: CompareRowProps) {
  const [showContext, setShowContext] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-[11px] uppercase tracking-[0.1em] text-zinc-500 font-semibold">
          {label}
        </p>
        {context && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowContext((v) => !v)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              aria-label="Why this matters"
            >
              <Info className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {showContext && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute left-0 top-full mt-1 w-56 z-10 rounded-lg bg-[#0a0a14] border border-white/[0.1] p-2.5 shadow-[0_12px_24px_rgba(0,0,0,0.5)]"
                >
                  <p className="text-[10px] text-zinc-300 leading-relaxed">{context}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Tag pills row ───────────────────────────────────────────────────────────

export function TagRow({
  colleges,
  field,
}: {
  colleges: readonly { name: string; tags: readonly string[] }[];
  field: string;
}) {
  void field;
  return (
    <div className="space-y-2">
      {colleges.map((c) => (
        <div key={c.name} className="flex items-start gap-2">
          <span className="text-[10px] text-zinc-500 w-20 sm:w-28 truncate shrink-0 text-right mt-0.5">
            {c.name.split(" ").slice(0, 2).join(" ")}
          </span>
          <div className="flex flex-wrap gap-1">
            {c.tags.map((tag) => (
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
  );
}

// ── Currency formatter ──────────────────────────────────────────────────────

export function formatCurrency(v: number): string {
  if (v >= 1000) return `$${Math.round(v / 1000)}k`;
  return `$${v}`;
}

export function formatPct(v: number): string {
  return `${v}%`;
}

export function formatRatio(v: number): string {
  return `${v}:1`;
}
