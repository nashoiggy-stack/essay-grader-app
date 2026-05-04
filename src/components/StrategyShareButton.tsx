"use client";

import React, { useRef, useState, useEffect } from "react";
import { Share2, Link as LinkIcon, Check, Loader2 } from "lucide-react";
import { useStrategyShare } from "@/hooks/useStrategyShare";
import type { StrategyShareSnapshot } from "@/lib/strategy-share-types";

interface StrategyShareButtonProps {
  readonly getSnapshot: () => StrategyShareSnapshot | null;
  readonly disabled?: boolean;
}

export const StrategyShareButton: React.FC<StrategyShareButtonProps> = ({
  getSnapshot,
  disabled,
}) => {
  const { active, loading, error, generate, revoke } = useStrategyShare();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onGenerate = async () => {
    const snap = getSnapshot();
    if (!snap) return;
    await generate(snap);
  };

  const onCopy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in some browsers/contexts — the input is
      // selectable manually as fallback.
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface hover:bg-bg-elevated text-text-primary px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Share2 className="w-3.5 h-3.5" />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 z-20 rounded-xl bg-bg-inset border border-border-strong shadow-[0_16px_32px_rgba(0,0,0,0.4)] p-4">
          <p className="text-[12px] font-semibold text-text-primary mb-2">
            Share your briefing
          </p>

          {!active ? (
            <>
              <p className="text-[11px] text-text-muted leading-relaxed mb-3">
                Generates a read-only link that parents or counselors can open
                without signing in. Expires in 30 days.
              </p>
              <button
                type="button"
                onClick={onGenerate}
                disabled={loading || disabled}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-soft hover:bg-accent-soft disabled:bg-bg-surface disabled:text-text-faint text-accent-text px-3 py-2 text-xs font-semibold transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating link…
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    Generate Link
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 mb-2">
                <input
                  type="text"
                  readOnly
                  value={active.url}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 rounded-md bg-bg-surface border border-border-strong px-2 py-1.5 text-[11px] text-text-primary font-mono focus:outline-none focus: focus:ring-accent-line"
                />
                <button
                  type="button"
                  onClick={onCopy}
                  aria-label="Copy share link"
                  className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-md bg-accent-soft hover:bg-accent-soft text-accent-text transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-text-muted mb-3">
                Expires {new Date(active.expiresAt).toLocaleDateString()}.
              </p>
              <button
                type="button"
                onClick={revoke}
                disabled={loading}
                className="text-[11px] text-text-muted hover:text-red-300 transition-colors disabled:opacity-40"
              >
                {loading ? "Revoking…" : "Revoke link"}
              </button>
            </>
          )}

          {error && (
            <p className="mt-2 text-[11px] text-red-300">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};
