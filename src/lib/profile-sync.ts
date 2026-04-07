"use client";

import { supabase } from "./supabase";
import type { UserProfile } from "./profile-types";
import { PROFILE_STORAGE_KEY } from "./profile-types";

const SYNC_DEBOUNCE_MS = 2000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

// ── Save to Supabase (debounced) ────────────────────────────────────────────

export function scheduleSyncToCloud(userId: string) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncToCloud(userId), SYNC_DEBOUNCE_MS);
}

async function syncToCloud(userId: string) {
  try {
    const profileRaw = localStorage.getItem(PROFILE_STORAGE_KEY);
    const gpaRaw = localStorage.getItem("gpa-calc-v1");
    const essayRaw = localStorage.getItem("essay-grader-result");
    const ecActivitiesRaw = localStorage.getItem("ec-evaluator-activities");
    const ecResultRaw = localStorage.getItem("ec-evaluator-result");

    const { error } = await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        profile_data: profileRaw ? JSON.parse(profileRaw) : {},
        gpa_data: gpaRaw ? JSON.parse(gpaRaw) : null,
        essay_data: essayRaw ? JSON.parse(essayRaw) : null,
        ec_activities: ecActivitiesRaw ? JSON.parse(ecActivitiesRaw) : null,
        ec_result: ecResultRaw ? JSON.parse(ecResultRaw) : null,
      }, { onConflict: "user_id" });

    if (error) {
      console.warn("Profile sync failed:", error.message);
    }
  } catch (e) {
    console.warn("Profile sync error:", e);
  }
}

// ── Load from Supabase ──────────────────────────────────────────────────────

export async function loadFromCloud(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("profile_data, gpa_data, essay_data, ec_activities, ec_result, updated_at")
      .eq("user_id", userId)
      .single();

    if (error || !data) return false;

    // Only overwrite localStorage if cloud data is newer or local is empty
    const localProfile = localStorage.getItem(PROFILE_STORAGE_KEY);

    if (data.profile_data && Object.keys(data.profile_data).length > 0) {
      // If no local profile exists, use cloud data
      if (!localProfile) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(data.profile_data));
      }
    }

    if (data.gpa_data && !localStorage.getItem("gpa-calc-v1")) {
      localStorage.setItem("gpa-calc-v1", JSON.stringify(data.gpa_data));
    }

    if (data.essay_data && !localStorage.getItem("essay-grader-result")) {
      localStorage.setItem("essay-grader-result", JSON.stringify(data.essay_data));
    }

    if (data.ec_activities && !localStorage.getItem("ec-evaluator-activities")) {
      localStorage.setItem("ec-evaluator-activities", JSON.stringify(data.ec_activities));
    }

    if (data.ec_result && !localStorage.getItem("ec-evaluator-result")) {
      localStorage.setItem("ec-evaluator-result", JSON.stringify(data.ec_result));
    }

    return true;
  } catch (e) {
    console.warn("Profile load error:", e);
    return false;
  }
}
