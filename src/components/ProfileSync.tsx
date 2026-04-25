"use client";

import { useEffect, useRef } from "react";
import { useAuthContext } from "./AuthProvider";
import { loadFromCloud, scheduleSyncToCloud, SYNC_KEYS } from "@/lib/profile-sync";

export function ProfileSync() {
  const { user } = useAuthContext();
  const loadedRef = useRef(false);

  // Load from cloud on first sign-in — cloud-first, overwrites localStorage
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    loadFromCloud(user.id).then((loaded) => {
      if (loaded) {
        // Dispatch a custom event so hooks can re-read their localStorage keys
        window.dispatchEvent(new Event("cloud-sync-loaded"));
      }
    });
  }, [user]);

  // Watch localStorage changes and sync to cloud
  useEffect(() => {
    if (!user) return;

    // Cross-tab: StorageEvent fires when another tab writes
    const handleStorage = (e: StorageEvent) => {
      if (e.key && SYNC_KEYS.includes(e.key)) {
        scheduleSyncToCloud(user.id);
      }
    };

    // Same-tab: poll every 5s for changes (StorageEvent doesn't fire for same-tab writes)
    const lastSnapshots: Record<string, string | null> = {};
    const captureSnapshots = () => {
      for (const key of SYNC_KEYS) {
        lastSnapshots[key] = localStorage.getItem(key);
      }
    };
    captureSnapshots();

    // Re-snapshot AFTER loadFromCloud finishes overwriting localStorage with
    // cloud data. Without this, the first poll tick compares current
    // (post-load) values to the snapshot taken pre-load, sees diffs on
    // every key the cloud replaced, and schedules a ghost sync that
    // re-uploads what we just downloaded — surfacing as a spurious
    // "Save failed" badge if any transient error hits the round trip.
    const handleCloudLoaded = () => captureSnapshots();
    window.addEventListener("cloud-sync-loaded", handleCloudLoaded);

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
      window.removeEventListener("cloud-sync-loaded", handleCloudLoaded);
      clearInterval(interval);
    };
  }, [user]);

  return null;
}
