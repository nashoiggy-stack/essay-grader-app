"use client";

import { useState, useEffect, useCallback } from "react";
import { DREAM_SCHOOL_KEY } from "@/lib/strategy-types";
import {
  getCachedRaw,
  setRaw,
  removeKey,
  type CloudKey,
} from "@/lib/cloud-storage";

const KEY: CloudKey = DREAM_SCHOOL_KEY as CloudKey;

export interface UseDreamSchoolReturn {
  readonly dreamSchool: string | null;
  readonly loaded: boolean;
  readonly setDreamSchool: (name: string | null) => void;
  readonly clear: () => void;
}

/**
 * Persists the user's single selected dream school name through cloud-storage.
 * Strategy Engine reads this separately and passes it to the LLM prompt
 * so the dream-school card gets a dedicated decision block. Only one dream
 * school at a time — picking a new one replaces the old.
 */
export function useDreamSchool(): UseDreamSchoolReturn {
  const [dreamSchool, setDreamSchoolState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const raw = getCachedRaw(KEY);
    if (raw) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
          setDreamSchoolState(JSON.parse(trimmed) as string);
          return;
        } catch {
          /* fall through */
        }
      }
      setDreamSchoolState(trimmed.length > 0 ? trimmed : null);
    } else {
      setDreamSchoolState(null);
    }
  }, []);

  useEffect(() => {
    refresh();
    setLoaded(true);

    const onChange = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (ce.detail?.key === KEY) refresh();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh();
    };
    const onReconciled = () => refresh();

    window.addEventListener("cloud-storage-changed", onChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("cloud-storage-reconciled", onReconciled);
    return () => {
      window.removeEventListener("cloud-storage-changed", onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cloud-storage-reconciled", onReconciled);
    };
  }, [refresh]);

  const setDreamSchool = useCallback((name: string | null) => {
    setDreamSchoolState(name);
    if (name) {
      setRaw(KEY, name);
    } else {
      removeKey(KEY);
    }
  }, []);

  const clear = useCallback(() => setDreamSchool(null), [setDreamSchool]);

  return { dreamSchool, loaded, setDreamSchool, clear };
}
