"use client";

import { useState, useEffect, useCallback } from "react";
import { ACTION_CHECKLIST_KEY } from "@/lib/strategy-types";
import {
  getCachedJson,
  setJson,
  type CloudKey,
} from "@/lib/cloud-storage";

const KEY: CloudKey = ACTION_CHECKLIST_KEY as CloudKey;

// Shape stored under the cache:
// {
//   "<generatedAt>": { "<actionIndex>": true, ... }
// }
// Keyed by generation timestamp so a fresh strategy run resets the checklist
// automatically — done state is tied to a specific plan.
type ChecklistState = Record<string, Record<string, boolean>>;

function isChecklistState(v: unknown): v is ChecklistState {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readChecklist(): ChecklistState {
  return getCachedJson<ChecklistState>(KEY, isChecklistState) ?? {};
}

function writeChecklist(state: ChecklistState): void {
  // Keep only the 5 most recent strategies to cap storage growth.
  const keys = Object.keys(state).sort((a, b) => Number(b) - Number(a));
  const trimmed: ChecklistState = {};
  for (const k of keys.slice(0, 5)) trimmed[k] = state[k];
  setJson<ChecklistState>(KEY, trimmed);
}

export interface UseActionChecklistReturn {
  readonly isDone: (index: number) => boolean;
  readonly toggle: (index: number) => void;
  readonly completedCount: number;
}

/**
 * Persistent checkbox state for the Action Plan card. Keyed by the strategy
 * result's generatedAt timestamp — re-running strategy starts a fresh
 * checklist automatically.
 */
export function useActionChecklist(
  generatedAt: number | null,
  totalItems: number,
): UseActionChecklistReturn {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (generatedAt == null) {
      setChecked({});
      return;
    }
    const all = readChecklist();
    setChecked(all[String(generatedAt)] ?? {});
  }, [generatedAt]);

  const isDone = useCallback(
    (index: number) => !!checked[String(index)],
    [checked],
  );

  const toggle = useCallback(
    (index: number) => {
      if (generatedAt == null) return;
      setChecked((prev) => {
        const next = { ...prev, [String(index)]: !prev[String(index)] };
        const all = readChecklist();
        all[String(generatedAt)] = next;
        writeChecklist(all);
        return next;
      });
    },
    [generatedAt],
  );

  const completedCount = Object.values(checked).filter(Boolean).length;
  void totalItems;

  return { isDone, toggle, completedCount };
}
