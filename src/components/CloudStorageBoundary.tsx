"use client";

import { useEffect, useRef } from "react";
import { useAuthContext } from "./AuthProvider";
import { reconcileFromCloud, setActiveUserId } from "@/lib/cloud-storage";

/**
 * Drives the cloud-storage lifecycle:
 *   - On sign-in: register active user and reconcile cache from cloud row
 *   - On window focus: re-reconcile so values updated on another device
 *     replace the local cache
 *   - On sign-out: clear active user (writes go cache-only)
 *
 * Replaces the previous ProfileSync component, which polled localStorage
 * every 5 seconds. cloud-storage.ts now drives writes synchronously from
 * the call site (debounced internally), so polling is unnecessary.
 */
export function CloudStorageBoundary() {
  const { user } = useAuthContext();
  const lastReconciledUserId = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      setActiveUserId(user.id);
      // Only reconcile once per sign-in. Subsequent re-renders keep the
      // active user but don't re-fetch (focus handler covers freshness).
      if (lastReconciledUserId.current !== user.id) {
        lastReconciledUserId.current = user.id;
        void reconcileFromCloud(user.id);
      }
    } else {
      setActiveUserId(null);
      lastReconciledUserId.current = null;
    }
  }, [user]);

  // Re-reconcile when the tab regains focus. Catches edits made on other
  // devices since last reconcile.
  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      void reconcileFromCloud(user.id);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  return null;
}
