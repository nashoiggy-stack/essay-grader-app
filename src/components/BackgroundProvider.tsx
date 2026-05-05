"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { setItemAndNotify } from "@/lib/sync-event";
import { getCachedRaw, type CloudKey } from "@/lib/cloud-storage";

export type BackgroundChoice = "dark" | "light" | "monochrome";

const STORAGE_KEY: CloudKey = "admitedge-bg-preference";
const DEFAULT_CHOICE: BackgroundChoice = "monochrome";

interface BackgroundContextValue {
  background: BackgroundChoice;
  setBackground: (value: BackgroundChoice) => void;
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined);

function isBackgroundChoice(value: string | null): value is BackgroundChoice {
  return value === "dark" || value === "light" || value === "monochrome";
}

function readStoredChoice(): BackgroundChoice {
  const raw = getCachedRaw(STORAGE_KEY);
  // Migrate the legacy "shader" choice to the default — the WebGL shader
  // option was removed because the underlying renderer was broken on
  // several devices. Existing users with "shader" persisted in storage
  // get bumped to monochrome on next read.
  if (raw === "shader") return DEFAULT_CHOICE;
  return isBackgroundChoice(raw) ? raw : DEFAULT_CHOICE;
}

/** Map a picker choice to the next-themes class name applied to <html>. */
function themeForChoice(choice: BackgroundChoice): "light" | "dark" | "monochrome" {
  if (choice === "light") return "light";
  if (choice === "monochrome") return "monochrome";
  return "dark";
}

interface BackgroundProviderProps {
  readonly children: React.ReactNode;
}

export function BackgroundProvider({ children }: BackgroundProviderProps) {
  const [background, setBackgroundState] = useState<BackgroundChoice>(DEFAULT_CHOICE);
  const { setTheme } = useTheme();

  // Hydrate from localStorage on mount and apply theme
  useEffect(() => {
    const stored = readStoredChoice();
    setBackgroundState(stored);
    setTheme(themeForChoice(stored));
  }, [setTheme]);

  // Re-read on cross-tab / cloud-storage writes / cloud reconcile.
  useEffect(() => {
    const onUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      if (!detail || detail.key !== STORAGE_KEY) return;
      const fresh = readStoredChoice();
      setBackgroundState(fresh);
      setTheme(themeForChoice(fresh));
    };
    const onReconciled = () => {
      const fresh = readStoredChoice();
      setBackgroundState(fresh);
      setTheme(themeForChoice(fresh));
    };
    window.addEventListener("profile-source-updated", onUpdate);
    window.addEventListener("cloud-storage-changed", onUpdate);
    window.addEventListener("cloud-storage-reconciled", onReconciled);
    return () => {
      window.removeEventListener("profile-source-updated", onUpdate);
      window.removeEventListener("cloud-storage-changed", onUpdate);
      window.removeEventListener("cloud-storage-reconciled", onReconciled);
    };
  }, [setTheme]);

  const setBackground = useCallback(
    (value: BackgroundChoice) => {
      setBackgroundState(value);
      setTheme(themeForChoice(value));
      setItemAndNotify(STORAGE_KEY, value);
    },
    [setTheme]
  );

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground(): BackgroundContextValue {
  const ctx = useContext(BackgroundContext);
  if (!ctx) {
    // Safe fallback for SSR / out-of-tree usage
    return {
      background: DEFAULT_CHOICE,
      setBackground: () => {},
    };
  }
  return ctx;
}
