"use client";

import { useEffect, useRef } from "react";
import { useAuthContext } from "./AuthProvider";
import { loadFromCloud, scheduleSyncToCloud } from "@/lib/profile-sync";

const SYNC_KEYS = [
  "admitedge-profile",
  "gpa-calc-v1",
  "essay-grader-result",
  "ec-evaluator-activities",
  "ec-evaluator-result",
];

export function ProfileSync() {
  const { user } = useAuthContext();
  const loadedRef = useRef(false);

  // Load from cloud on first sign-in
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    loadFromCloud(user.id);
  }, [user]);

  // Watch localStorage changes and sync to cloud
  useEffect(() => {
    if (!user) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key)) {
        scheduleSyncToCloud(user.id);
      }
    };

    // Also watch for same-tab writes via a polling interval
    // (StorageEvent only fires for cross-tab changes)
    let lastSnapshots: Record<string, string | null> = {};
    for (const key of SYNC_KEYS) {
      lastSnapshots[key] = localStorage.getItem(key);
    }

    const interval = setInterval(() => {
      let changed = false;
      for (const key of SYNC_KEYS) {
        const current = localStorage.getItem(key);
        if (current !== lastSnapshots[key]) {
          changed = true;
          lastSnapshots[key] = current;
        }
      }
      if (changed) scheduleSyncToCloud(user.id);
    }, 5000);

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [user]);

  return null;
}
