"use client";

import React from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { MissingDataItem } from "@/lib/strategy-types";

// ── Generate / Re-run bar ──────────────────────────────────────────────────

export function GenerateBar({
  loading,
  hasResult,
  generatedAt,
  onGenerate,
  shareSlot,
}: {
  readonly loading: boolean;
  readonly hasResult: boolean;
  readonly generatedAt: number | null;
  readonly onGenerate: () => void;
  readonly shareSlot?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
      <div className="text-center sm:text-left">
        {generatedAt && (
          <p className="text-[11px] text-text-muted">
            Last updated {new Date(generatedAt).toLocaleString()}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {shareSlot}
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,opacity] duration-200"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : hasResult ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Re-run
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Strategy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Footer rerun bar ───────────────────────────────────────────────────────

export function FooterBar({
  generatedAt,
  onRerun,
  loading,
}: {
  readonly generatedAt: number;
  readonly onRerun: () => void;
  readonly loading: boolean;
}) {
  return (
    <div className="mt-6 rounded-md bg-bg-surface border border-border-hair p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-[11px] text-text-muted">
        Last updated {new Date(generatedAt).toLocaleString()} · Re-run after improvements to see how the briefing changes.
      </p>
      <button
        type="button"
        onClick={onRerun}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface hover:bg-bg-elevated text-text-primary px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Re-run strategy
      </button>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────

export function EmptyState() {
  return (
    <div className="rounded-md bg-bg-surface border border-border-hair p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-md bg-accent-soft border border-accent-line flex items-center justify-center mb-5">
        <Bookmark className="w-6 h-6 text-accent-text" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Pin your target schools first
      </h2>
      <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-6">
        The Strategy Engine analyzes <em>your</em> pinned college list — not a generic database.
        Head to the College List Builder, find the schools you&apos;re actually considering, and
        pin them with the bookmark icon.
      </p>
      <Link
        href="/colleges"
        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition-colors"
      >
        Go to College List Builder
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ── Missing-data banner ────────────────────────────────────────────────────

const MISSING_IMPACT_DOT: Record<MissingDataItem["impact"], string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-zinc-500",
};

export function MissingDataBanner({ items }: { readonly items: readonly MissingDataItem[] }) {
  return (
    <div className="rounded-xl bg-amber-500/[0.04] border border-amber-500/15 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-amber-200 font-semibold mb-2">
            Missing data will weaken this analysis
          </p>
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-start gap-3 text-[13px] leading-relaxed"
              >
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${MISSING_IMPACT_DOT[item.impact]}`}
                  aria-label={`${item.impact} impact`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium">{item.label}</p>
                  <p className="text-text-muted text-xs">{item.unlockDescription}</p>
                </div>
                <Link
                  href={item.ctaHref}
                  className="text-xs text-accent-text hover:text-accent-text font-semibold whitespace-nowrap shrink-0 mt-0.5"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Pre-generation hint ────────────────────────────────────────────────────

export function PreGenerationHint({ hasDreamSchool }: { readonly hasDreamSchool: boolean }) {
  return (
    <div className="rounded-md bg-bg-surface border border-border-hair p-8 text-center">
      <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
        Click <span className="text-text-primary font-semibold">Generate Strategy</span> to run the
        analyzers and produce your consultant briefing.
        {hasDreamSchool
          ? " You'll get a dedicated recommendation block for your dream school."
          : " Pick a dream school above to unlock the dedicated early-application recommendation block."}
      </p>
    </div>
  );
}
