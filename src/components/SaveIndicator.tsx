"use client";

import React, { useEffect, useState } from "react";
import { Check, RefreshCw } from "lucide-react";

export type SaveState = "saved" | "saving" | "dirty";

interface SaveIndicatorProps {
  /**
   * Manual state override. If provided, controls the indicator directly
   * (used during in-flight AI improves, network fetches, etc.).
   */
  readonly state?: SaveState;
  /**
   * Optional cloud-storage key (or list of keys) to listen to. When set,
   * the indicator self-syncs to `cloud-storage-changed` events and
   * updates "Saved · Ns ago" automatically — no parent wiring required
   * for the common case (every keystroke writes to cloud-storage).
   */
  readonly storageKey?: string | readonly string[];
  /** Brief label shown in the "saved" terminal state. Defaults to "Saved". */
  readonly savedLabel?: string;
}

/**
 * Quiet 11px row-status pill near the masthead.
 *
 * - role="status" + aria-live="polite" so screen readers announce the
 *   transition without interrupting the user.
 * - When `storageKey` is set, the component listens to cloud-storage
 *   events and renders "Saved · Ns ago". A 500ms "Saving…" pulse on
 *   each change communicates the write happened without flapping.
 * - When `state` is provided, the parent owns the state explicitly.
 *
 * This is the inline masthead indicator. AppShell mounts a separate
 * global cloud-sync toast (CloudSyncToast) that shows transient save
 * feedback at the bottom of the viewport — they answer different
 * questions and can coexist.
 */
export function SaveIndicator({
  state,
  storageKey,
  savedLabel = "Saved",
}: SaveIndicatorProps) {
  const [autoState, setAutoState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [, forceTick] = useState(0);

  useEffect(() => {
    if (!storageKey) return;
    if (typeof window === "undefined") return;

    const watched = Array.isArray(storageKey) ? new Set(storageKey) : new Set([storageKey]);
    let pulseTimer: ReturnType<typeof setTimeout> | null = null;

    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      const key = ce.detail?.key;
      if (!key || !watched.has(key)) return;
      setAutoState("saving");
      setSavedAt(Date.now());
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => setAutoState("saved"), 500);
    };

    window.addEventListener("cloud-storage-changed", onChange);
    return () => {
      window.removeEventListener("cloud-storage-changed", onChange);
      if (pulseTimer) clearTimeout(pulseTimer);
    };
  }, [storageKey]);

  // Tick once a minute so "Saved · 2m ago" recomputes without watching the
  // wall clock continuously. If we never saved yet, no need to tick.
  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [savedAt]);

  const effectiveState: SaveState = state ?? autoState;
  const ago = savedAt ? formatAgo(Date.now() - savedAt) : null;

  const label =
    effectiveState === "saving"
      ? "Saving\u2026"
      : effectiveState === "dirty"
        ? "Edits not yet saved"
        : ago
          ? `${savedLabel} \u00b7 ${ago}`
          : savedLabel;

  const Icon =
    effectiveState === "saving" ? RefreshCw : effectiveState === "dirty" ? null : Check;

  return (
    <p
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1 text-[11px] text-text-faint"
    >
      {Icon && (
        <Icon
          className={`w-3 h-3 ${
            effectiveState === "saving" ? "animate-spin" : "text-tier-safety-fg"
          }`}
          aria-hidden
        />
      )}
      <span>{label}</span>
    </p>
  );
}

function formatAgo(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 60 * 60_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 24 * 60 * 60_000) return `${Math.round(ms / (60 * 60_000))}h ago`;
  return `${Math.round(ms / (24 * 60 * 60_000))}d ago`;
}
