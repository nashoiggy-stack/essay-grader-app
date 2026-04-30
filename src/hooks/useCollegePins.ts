"use client";

import { useCallback, useEffect, useState } from "react";
import type { PinnedCollege, ApplicationPlan } from "@/lib/college-types";
import { PINNED_COLLEGES_KEY } from "@/lib/college-types";
import {
  getCachedJson,
  setJson,
  type CloudKey,
} from "@/lib/cloud-storage";

const PINS_KEY: CloudKey = PINNED_COLLEGES_KEY as CloudKey;

function isPinnedColleges(v: unknown): v is PinnedCollege[] {
  if (!Array.isArray(v)) return false;
  return v.every(
    (p) =>
      p !== null &&
      typeof p === "object" &&
      typeof (p as { name: unknown }).name === "string" &&
      typeof (p as { pinnedAt: unknown }).pinnedAt === "number",
  );
}

function readPinned(): PinnedCollege[] {
  return getCachedJson<PinnedCollege[]>(PINS_KEY, isPinnedColleges) ?? [];
}

export interface UseCollegePinsReturn {
  readonly pinned: readonly PinnedCollege[];
  readonly loaded: boolean;
  readonly isPinned: (name: string) => boolean;
  readonly togglePin: (name: string) => void;
  readonly setPlanFor: (name: string, plan: ApplicationPlan | undefined) => void;
  readonly clearAll: () => void;
}

export function useCollegePins(): UseCollegePinsReturn {
  const [pinned, setPinned] = useState<PinnedCollege[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load + cross-component / cross-tab sync.
  useEffect(() => {
    setPinned(readPinned());
    setLoaded(true);

    const refresh = () => setPinned(readPinned());

    // Same-tab updates from other components (cloud-storage emits this on
    // every write).
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (ce.detail?.key === PINS_KEY) refresh();
    };

    // Cross-tab StorageEvent (browsers fire this when localStorage changes
    // in another tab; covers users editing pins in two tabs at once).
    const onStorage = (e: StorageEvent) => {
      if (e.key === PINS_KEY) refresh();
    };

    // Cloud reconcile completed (focus / first sign-in) — re-read.
    const onReconciled = () => refresh();

    window.addEventListener("cloud-storage-changed", onChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("cloud-storage-reconciled", onReconciled);
    return () => {
      window.removeEventListener("cloud-storage-changed", onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cloud-storage-reconciled", onReconciled);
    };
  }, []);

  // Persist on change. cloud-storage.ts handles localStorage cache + Supabase.
  useEffect(() => {
    if (loaded) setJson<PinnedCollege[]>(PINS_KEY, pinned);
  }, [pinned, loaded]);

  const isPinned = useCallback(
    (name: string) => pinned.some((p) => p.name === name),
    [pinned],
  );

  const togglePin = useCallback((name: string) => {
    setPinned((prev) => {
      const existing = prev.find((p) => p.name === name);
      if (existing) {
        return prev.filter((p) => p.name !== name);
      }
      return [...prev, { name, pinnedAt: Date.now() }];
    });
  }, []);

  const setPlanFor = useCallback(
    (name: string, plan: ApplicationPlan | undefined) => {
      setPinned((prev) =>
        prev.map((p) =>
          p.name === name ? { ...p, applicationPlan: plan } : p,
        ),
      );
    },
    [],
  );

  const clearAll = useCallback(() => setPinned([]), []);

  return { pinned, loaded, isPinned, togglePin, setPlanFor, clearAll };
}
