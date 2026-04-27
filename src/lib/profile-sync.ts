"use client";

import { supabase } from "./supabase";
import { PROFILE_STORAGE_KEY } from "./profile-types";

const SYNC_DEBOUNCE_MS = 2000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

// ── All localStorage keys that participate in cloud sync ──────────────────
// Maps localStorage key → Supabase column name.
export const CLOUD_SYNC_MAP: Record<string, string> = {
  [PROFILE_STORAGE_KEY]:              "profile_data",
  "gpa-calc-v1":                      "gpa_data",
  "essay-grader-result":              "essay_data",
  "ec-evaluator-activities":          "ec_activities",
  "ec-evaluator-result":              "ec_result",
  "admitedge-resume":                 "resume_data",
  "essay-grader-history":             "essay_history",
  "admitedge-pinned-colleges":        "pinned_colleges",
  "admitedge-dream-school":           "dream_school",
  "admitedge-strategy-last-result":   "strategy_result",
  "admitedge-strategy-action-checklist": "action_checklist",
  "admitedge-bg-preference":           "bg_preference",
};

/** All localStorage keys tracked by cloud sync. */
export const SYNC_KEYS = Object.keys(CLOUD_SYNC_MAP);

// ── Save to Supabase (debounced) ────────────────────────────────────────────

export function scheduleSyncToCloud(userId: string) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncToCloud(userId), SYNC_DEBOUNCE_MS);
}

async function syncToCloud(userId: string) {
  // Notify the SaveIndicator (and any future listeners) before/after the
  // network round-trip so the UI can show saving → saved state.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cloud-sync-saving"));
  }
  let ok = true;
  try {
    // Build upsert payload from all tracked localStorage keys
    const row: Record<string, unknown> = { user_id: userId };

    for (const [lsKey, column] of Object.entries(CLOUD_SYNC_MAP)) {
      const raw = localStorage.getItem(lsKey);
      if (raw === null) {
        row[column] = null;
        continue;
      }
      // dream_school and bg_preference are stored as plain strings, not JSON
      if (column === "dream_school" || column === "bg_preference") {
        row[column] = raw.startsWith('"') ? JSON.parse(raw) : raw;
      } else {
        try { row[column] = JSON.parse(raw); } catch { row[column] = null; }
      }
    }

    // Try the full payload first. If a column doesn't exist in this Supabase
    // project (e.g. bg_preference before its migration is applied), PostgREST
    // returns 400 with PGRST204 ("Could not find the 'X' column"). Strip the
    // offending column and retry once so the rest of the data still saves.
    const attempt = async (payload: Record<string, unknown>) =>
      supabase.from("user_profiles").upsert(payload, { onConflict: "user_id" });

    let { error } = await attempt(row);

    if (error && error.code === "PGRST204") {
      const missingCol = /'([^']+)' column/.exec(error.message)?.[1];
      if (missingCol && missingCol in row) {
        delete row[missingCol];
        console.warn(`[cloud-sync] column '${missingCol}' missing in DB — skipping it. Apply the matching migration in Supabase to enable cross-device sync for this field.`);
        ({ error } = await attempt(row));
      }
    }

    if (error) {
      ok = false;
      console.error("[cloud-sync] upsert failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
    } else {
      console.info("[cloud-sync] saved", { userId, columns: Object.keys(row).filter((k) => k !== "user_id").length });
    }
  } catch (e) {
    ok = false;
    console.error("[cloud-sync] unexpected error", e);
  } finally {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(ok ? "cloud-sync-saved" : "cloud-sync-error"));
    }
  }
}

// ── Load from Supabase ──────────────────────────────────────────────────────
// Cloud-first: always overwrites localStorage with cloud data on sign-in.
// This ensures the user sees the same state on every device/browser.

export async function loadFromCloud(userId: string): Promise<boolean> {
  try {
    // select("*") instead of an explicit column list so a missing optional
    // column (e.g. bg_preference before the migration is applied) doesn't
    // 400 the entire load.
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[cloud-sync] load failed", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
      });
      return false;
    }
    if (!data) {
      console.info("[cloud-sync] no row in cloud yet for this user", { userId });
      return false;
    }
    console.info("[cloud-sync] loaded from cloud", {
      userId,
      hasProfile: !!data.profile_data,
      hasEssay: !!data.essay_data,
      essayHistoryEntries: Array.isArray(data.essay_history) ? data.essay_history.length : 0,
      pinnedColleges: Array.isArray(data.pinned_colleges) ? data.pinned_colleges.length : 0,
    });

    // Write each cloud column back to its localStorage key
    const row = data as Record<string, unknown>;
    for (const [lsKey, column] of Object.entries(CLOUD_SYNC_MAP)) {
      const value = row[column];
      if (value === null || value === undefined) continue;

      if (column === "dream_school" || column === "bg_preference") {
        // Stored as plain strings
        localStorage.setItem(lsKey, typeof value === "string" ? value : String(value));
      } else {
        localStorage.setItem(lsKey, JSON.stringify(value));
      }
    }

    return true;
  } catch (e) {
    console.warn("Cloud load error:", e);
    return false;
  }
}
