"use client";

import { useCallback, useEffect, useState } from "react";
import type { SavedEssay, GradingResult } from "@/lib/types";
import {
  getCachedJson,
  setJson,
  type CloudKey,
} from "@/lib/cloud-storage";

const KEY: CloudKey = "essay-grader-history";

function isSavedEssayArray(v: unknown): v is SavedEssay[] {
  return Array.isArray(v);
}

function loadHistory(): SavedEssay[] {
  return getCachedJson<SavedEssay[]>(KEY, isSavedEssayArray) ?? [];
}

function persistHistory(essays: SavedEssay[]): void {
  setJson<SavedEssay[]>(KEY, essays);
}

function generateTitle(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 40) return clean || "Untitled Essay";
  return clean.slice(0, 40).trim() + "...";
}

interface UseEssayHistoryReturn {
  readonly essays: SavedEssay[];
  readonly save: (essayText: string, result: GradingResult) => void;
  readonly load: (id: string) => SavedEssay | null;
  readonly remove: (id: string) => void;
  readonly rename: (id: string, newTitle: string) => void;
}

export function useEssayHistory(): UseEssayHistoryReturn {
  const [essays, setEssays] = useState<SavedEssay[]>([]);

  useEffect(() => {
    setEssays(loadHistory());

    const refresh = () => setEssays(loadHistory());
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (ce.detail?.key === KEY) refresh();
    };
    const onReconciled = () => refresh();

    window.addEventListener("cloud-storage-changed", onChange);
    window.addEventListener("cloud-storage-reconciled", onReconciled);
    return () => {
      window.removeEventListener("cloud-storage-changed", onChange);
      window.removeEventListener("cloud-storage-reconciled", onReconciled);
    };
  }, []);

  const save = useCallback((essayText: string, result: GradingResult) => {
    const newEssay: SavedEssay = {
      id: crypto.randomUUID(),
      title: generateTitle(essayText),
      essayText,
      result,
      savedAt: Date.now(),
    };
    setEssays((prev) => {
      const updated = [newEssay, ...prev];
      persistHistory(updated);
      return updated;
    });
  }, []);

  const load = useCallback(
    (id: string): SavedEssay | null => essays.find((e) => e.id === id) ?? null,
    [essays],
  );

  const remove = useCallback((id: string) => {
    setEssays((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      persistHistory(updated);
      return updated;
    });
  }, []);

  const rename = useCallback((id: string, newTitle: string) => {
    setEssays((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, title: newTitle } : e,
      );
      persistHistory(updated);
      return updated;
    });
  }, []);

  return { essays, save, load, remove, rename };
}
