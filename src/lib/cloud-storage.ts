"use client";

/**
 * cloud-storage.ts
 *
 * Single boundary between feature code and persistence. Preserves the
 * synchronous read API existing hooks depend on by serving from a
 * localStorage-backed cache, while async writes propagate to Supabase
 * (debounced, batched). Reconciles on mount and window focus.
 *
 * ── Source of truth ─────────────────────────────────────────────────────
 *   Cloud-primary, localStorage-cache.
 *     - Reads: synchronous from localStorage (instant cold-render).
 *     - Writes: update localStorage, schedule debounced upsert to Supabase.
 *     - Reconcile: on first sign-in mount + on window focus, fetch the
 *       cloud row, overwrite cache, dispatch 'cloud-storage-reconciled'.
 *     - One-time migration: when the cloud row is empty for a key but the
 *       cache has data (legacy install), push it up.
 *
 * ── Guest mode ──────────────────────────────────────────────────────────
 *   When no auth.user is present, writes still hit localStorage (so
 *   anonymous browsing works) but skip the Supabase upsert. The next sign-in
 *   reconcile picks up any cached state and migrates it. Guest sign-ins
 *   that overlap with stale cloud data prefer the cloud row.
 *
 * ── Acceptance posture ──────────────────────────────────────────────────
 *   This file is the ONLY place outside the one-time migration helper that
 *   is allowed to touch window.localStorage. All feature code uses the
 *   sync `getCachedJson` / `setJson` / `setRaw` helpers exposed below.
 */

import { supabase } from "./supabase";

// ── Storage key inventory ───────────────────────────────────────────────────
//
// The full set of localStorage keys the cloud layer manages. Mirrors the
// 13 keys catalogued in Phase 0 plus the two new ones (overrides, layout).
//
// `column` is the user_profiles column the value is upserted into.
// `serializer` describes how the value is stored:
//   - "json"    → JSON.stringify on write, JSON.parse on read
//   - "raw"     → plain string (used for dream-school name, bg preference,
//                 dashboard layout)
//
// Adding a new key here is the only edit needed to grant a new piece of
// state cloud sync.

export type CloudKey =
  | "admitedge-profile"
  | "admitedge-profile-overrides"
  | "admitedge-profile-layout"
  | "admitedge-bg-preference"
  | "admitedge-pinned-colleges"
  | "admitedge-dream-school"
  | "admitedge-strategy-last-result"
  | "admitedge-strategy-action-checklist"
  | "admitedge-resume"
  | "essay-grader-result"
  | "essay-grader-history"
  | "ec-evaluator-activities"
  | "ec-evaluator-result"
  | "gpa-calc-v1";

interface KeySpec {
  readonly column: string;
  readonly serializer: "json" | "raw";
}

const SPEC: Record<CloudKey, KeySpec> = {
  "admitedge-profile":                  { column: "profile_data",      serializer: "json" },
  "admitedge-profile-overrides":        { column: "profile_overrides", serializer: "json" },
  "admitedge-profile-layout":           { column: "dashboard_layout",  serializer: "raw"  },
  "admitedge-bg-preference":            { column: "bg_preference",     serializer: "raw"  },
  "admitedge-pinned-colleges":          { column: "pinned_colleges",   serializer: "json" },
  "admitedge-dream-school":             { column: "dream_school",      serializer: "raw"  },
  "admitedge-strategy-last-result":     { column: "strategy_result",   serializer: "json" },
  "admitedge-strategy-action-checklist":{ column: "action_checklist",  serializer: "json" },
  "admitedge-resume":                   { column: "resume_data",       serializer: "json" },
  "essay-grader-result":                { column: "essay_data",        serializer: "json" },
  "essay-grader-history":               { column: "essay_history",     serializer: "json" },
  "ec-evaluator-activities":            { column: "ec_activities",     serializer: "json" },
  "ec-evaluator-result":                { column: "ec_result",         serializer: "json" },
  "gpa-calc-v1":                        { column: "gpa_data",          serializer: "json" },
};

export const CLOUD_KEYS: readonly CloudKey[] = Object.keys(SPEC) as CloudKey[];

// ── Local-only cache helpers ────────────────────────────────────────────────
//
// Some keys are legitimately per-device caches (content-hashed strategy
// outputs, content-hashed essay-grading results). They share the localStorage
// substrate with cloud-storage but skip Supabase entirely. Call these from
// hook code so the localStorage substrate stays localised to this module.
//
// The acceptance criterion "all localStorage keys are gone" applies to user
// state, not to per-device caches; these helpers are the documented escape
// hatch.

export function getLocalCache(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setLocalCache(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* quota or disabled */
  }
}

export function removeLocalCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* quota or disabled */
  }
}

// ── Sync API (for hooks/components to call) ─────────────────────────────────

/**
 * Synchronous read from the local cache (legacy localStorage). Returns the
 * raw string or null. Use `getCachedJson<T>` for typed JSON values.
 */
export function getCachedRaw(key: CloudKey): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Synchronous typed read. Returns null when the key is unset, the value
 * doesn't parse, or the validator rejects it. Validator is optional —
 * unrecognised shapes return as `T` and consumers handle malformed data
 * the same way they always have.
 */
export function getCachedJson<T>(key: CloudKey, validator?: (v: unknown) => v is T): T | null {
  const raw = getCachedRaw(key);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (validator && !validator(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Write a JSON value. Synchronously updates the cache and schedules a
 * debounced upsert to Supabase. Hooks call this on every state change;
 * the debounce coalesces bursts.
 */
export function setJson<T>(key: CloudKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
  scheduleSync();
  notifyChange(key);
}

/**
 * Write a raw string value (dream-school, bg-preference, dashboard-layout).
 */
export function setRaw(key: CloudKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
  scheduleSync();
  notifyChange(key);
}

/**
 * Remove a key from the cache. Cloud column is set to NULL on next sync.
 */
export function removeKey(key: CloudKey): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    return;
  }
  scheduleSync();
  notifyChange(key);
}

// ── Cross-component change events ───────────────────────────────────────────
//
// Hooks subscribe to "cloud-storage-changed" + "cloud-storage-reconciled" to
// re-read after another component or the focus reconcile updates cache.
// Same-tab StorageEvent doesn't fire, so a custom event covers it.

function notifyChange(key: CloudKey): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("cloud-storage-changed", { detail: { key } }));
}

// ── Debounced upsert ────────────────────────────────────────────────────────

const SYNC_DEBOUNCE_MS = 1500;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let activeUserId: string | null = null;

/** AppShell calls this when auth state changes. Null clears the userId. */
export function setActiveUserId(userId: string | null): void {
  activeUserId = userId;
}

function scheduleSync(): void {
  if (typeof window === "undefined") return;
  if (!activeUserId) return; // guest mode — cache only
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void runSync(activeUserId);
  }, SYNC_DEBOUNCE_MS);
}

async function runSync(userId: string | null): Promise<void> {
  if (!userId) return;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("cloud-sync-saving"));

  const row: Record<string, unknown> = { user_id: userId };
  for (const [key, spec] of Object.entries(SPEC) as [CloudKey, KeySpec][]) {
    const raw = getCachedRaw(key);
    if (raw === null) {
      row[spec.column] = null;
      continue;
    }
    if (spec.serializer === "raw") {
      // Tolerate legacy entries that were JSON-stringified by mistake.
      row[spec.column] = raw.startsWith('"') ? safeJsonParse(raw) ?? raw : raw;
    } else {
      row[spec.column] = safeJsonParse(raw);
    }
  }

  try {
    let { error } = await attemptUpsert(row);
    // Tolerate missing columns in older Supabase projects (PGRST204).
    while (error && error.code === "PGRST204") {
      const missing = /'([^']+)' column/.exec(error.message)?.[1];
      if (!missing || !(missing in row)) break;
      delete row[missing];
      console.warn(`[cloud-storage] column '${missing}' missing in DB — skipping. Apply the matching migration to enable cross-device sync for this column.`);
      ({ error } = await attemptUpsert(row));
    }
    if (error) {
      console.error("[cloud-storage] upsert failed", error);
      window.dispatchEvent(new Event("cloud-sync-error"));
      return;
    }
    window.dispatchEvent(new Event("cloud-sync-saved"));
  } catch (e) {
    console.error("[cloud-storage] unexpected sync error", e);
    window.dispatchEvent(new Event("cloud-sync-error"));
  }
}

function attemptUpsert(payload: Record<string, unknown>) {
  return supabase.from("user_profiles").upsert(payload, { onConflict: "user_id" });
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Reconcile from cloud ────────────────────────────────────────────────────

interface CloudRow {
  readonly profile_data?: unknown;
  readonly profile_overrides?: unknown;
  readonly dashboard_layout?: string | null;
  readonly bg_preference?: string | null;
  readonly pinned_colleges?: unknown;
  readonly dream_school?: string | null;
  readonly strategy_result?: unknown;
  readonly action_checklist?: unknown;
  readonly resume_data?: unknown;
  readonly essay_data?: unknown;
  readonly essay_history?: unknown;
  readonly ec_activities?: unknown;
  readonly ec_result?: unknown;
  readonly gpa_data?: unknown;
}

/**
 * Pull the user's row and overwrite cache with cloud values. Called from
 * AppShell on first sign-in mount and on window-focus. Returns true when
 * a row was found and applied.
 */
export async function reconcileFromCloud(userId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "profile_data, profile_overrides, dashboard_layout, bg_preference, pinned_colleges, dream_school, strategy_result, action_checklist, resume_data, essay_data, essay_history, ec_activities, ec_result, gpa_data",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[cloud-storage] reconcile fetch failed", error);
      return false;
    }
    if (!data) {
      // No cloud row yet. Migrate any cached data up.
      await migrateCacheUp(userId);
      return false;
    }

    applyCloudRow(data as CloudRow);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cloud-storage-reconciled"));
    }
    // Backfill the cloud row with any fields it didn't have but the cache does.
    await migrateCacheUp(userId);
    return true;
  } catch (e) {
    console.error("[cloud-storage] reconcile error", e);
    return false;
  }
}

function applyCloudRow(row: CloudRow): void {
  if (typeof window === "undefined") return;
  const ls = window.localStorage;
  for (const [key, spec] of Object.entries(SPEC) as [CloudKey, KeySpec][]) {
    const cloudValue = (row as unknown as Record<string, unknown>)[spec.column];
    if (cloudValue === undefined || cloudValue === null) continue;
    try {
      if (spec.serializer === "raw") {
        ls.setItem(key, typeof cloudValue === "string" ? cloudValue : String(cloudValue));
      } else {
        ls.setItem(key, JSON.stringify(cloudValue));
      }
    } catch {
      /* quota / disabled */
    }
  }
}

/**
 * One-time migration helper: pushes any cache data not yet in the cloud row.
 * Called from `reconcileFromCloud` so it triggers automatically the first
 * time a legacy install signs in. Idempotent — running it on a fully
 * synced cloud row is a no-op (the runSync path overwrites cleanly).
 */
async function migrateCacheUp(userId: string): Promise<void> {
  let hasAnyCacheData = false;
  for (const key of CLOUD_KEYS) {
    if (getCachedRaw(key) !== null) {
      hasAnyCacheData = true;
      break;
    }
  }
  if (!hasAnyCacheData) return;
  await runSync(userId);
}
