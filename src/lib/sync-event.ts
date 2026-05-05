/**
 * sync-event.ts
 *
 * Backward-compat shim for legacy setItemAndNotify call sites. Delegates to
 * cloud-storage so the persistence boundary stays in one place, then emits
 * the legacy "profile-source-updated" event so existing listeners
 * (useProfile, useCollegeFilter, useChanceCalculator, BackgroundProvider)
 * keep refreshing without a wider rewrite.
 *
 * Also clears stale manual overrides for any fields owned by this source —
 * fresh tool output should beat a previously manually-edited profile field.
 *
 * NOTE: cloud-storage emits its own "cloud-storage-changed" event with the
 * key in detail. Hooks added in this PR listen for that event directly.
 * This shim is for pre-migration listeners that haven't been updated yet.
 */

import { setRaw, getCachedJson, setJson, type CloudKey } from "./cloud-storage";

const OVERRIDES_KEY: CloudKey = "admitedge-profile-overrides";

// Map source localStorage keys → profile fields they own
const OVERRIDES_BY_SOURCE: Record<string, string[]> = {
  "gpa-calc-v1": ["gpaUW", "gpaW", "rigor"],
  "essay-grader-result": ["essayCommonApp", "essayVspice"],
  "ec-evaluator-result": ["ecBand", "ecStrength"],
};

function clearOverridesFor(key: string): void {
  const fields = OVERRIDES_BY_SOURCE[key];
  if (!fields) return;
  const current = getCachedJson<Record<string, boolean>>(OVERRIDES_KEY) ?? {};
  let changed = false;
  for (const f of fields) {
    if (current[f]) {
      delete current[f];
      changed = true;
    }
  }
  if (changed) setJson<Record<string, boolean>>(OVERRIDES_KEY, current);
}

/**
 * Persist a value through cloud-storage and notify same-tab listeners. The
 * value is treated as a raw string (already JSON-stringified by the caller
 * for JSON-shape keys); cloud-storage's runSync handles serializer mapping
 * via the SPEC table when uploading to Supabase.
 */
export function setItemAndNotify(key: string, value: string): void {
  setRaw(key as CloudKey, value);
  clearOverridesFor(key);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("profile-source-updated", { detail: { key } }),
    );
  }
}
