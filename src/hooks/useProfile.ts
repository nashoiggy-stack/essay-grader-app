"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, SATScores, ACTScores, BasicStudentInfo } from "@/lib/profile-types";
import { EMPTY_PROFILE, PROFILE_STORAGE_KEY, EMPTY_BASIC_STUDENT_INFO, normalizeProfile } from "@/lib/profile-types";
import { bandFromEvaluation } from "@/lib/extracurricular-types";
import { setItemAndNotify } from "@/lib/sync-event";
import {
  getCachedJson,
  setJson,
  removeKey,
  type CloudKey,
} from "@/lib/cloud-storage";

const PROFILE_KEY: CloudKey = PROFILE_STORAGE_KEY as CloudKey;
const OVERRIDES_KEY: CloudKey = "admitedge-profile-overrides";

interface ComputedValues {
  gpaUW: string;
  gpaW: string;
  essayCommonApp: string;
  essayVspice: string;
  ecBand: string;
  ecStrength: "low" | "medium" | "high";
  rigor: "low" | "medium" | "high";
}

interface FieldOverrides {
  gpaUW?: boolean;
  gpaW?: boolean;
  essayCommonApp?: boolean;
  essayVspice?: boolean;
  ecBand?: boolean;
  ecStrength?: boolean;
  rigor?: boolean;
}

interface GpaCalcRow {
  grade?: string;
  credits?: string;
  level?: string;
  nonCore?: boolean;
}
interface GpaCalcYear {
  rows?: GpaCalcRow[];
}
interface GpaCalcState {
  years?: GpaCalcYear[];
}
interface EssayGraderResult {
  rawScore?: number;
  vspiceComposite?: number;
}
interface EcEvaluatorResult {
  activities?: unknown[];
  spikes?: unknown[];
  band?: string;
}

function readComputedValues(): ComputedValues {
  const result: ComputedValues = {
    gpaUW: "",
    gpaW: "",
    essayCommonApp: "",
    essayVspice: "",
    ecBand: "",
    ecStrength: "medium",
    rigor: "medium",
  };

  const gpaState = getCachedJson<GpaCalcState>("gpa-calc-v1");
  if (gpaState?.years?.length) {
    const COL_UW: Record<string, number> = {
      "A+": 4.00, "A": 4.00, "A−": 3.70, "B+": 3.30, "B": 3.00, "B−": 2.70,
      "C+": 2.30, "C": 2.00, "C−": 1.70, "D+": 1.00, "D": 1.00, "F": 0.00,
    };
    const COL_BONUS: Record<string, number> = { CP: 0, Honors: 0.5, DE: 1.0, HDE: 1.0, AP: 1.0 };
    let colUW = 0, colW = 0, totalCredits = 0;
    for (const year of gpaState.years) {
      for (const row of year.rows ?? []) {
        if (!row.grade || row.nonCore) continue;
        const credits = parseFloat(row.credits ?? "1") || 1;
        const base = COL_UW[row.grade] ?? 0;
        const isF = row.grade === "F";
        colUW += base * credits;
        colW += (isF ? 0 : base + (COL_BONUS[row.level ?? "CP"] ?? 0)) * credits;
        totalCredits += credits;
      }
    }
    if (totalCredits > 0) {
      const computedW = colW / totalCredits;
      result.gpaUW = (colUW / totalCredits).toFixed(2);
      result.gpaW = computedW.toFixed(2);
      result.rigor = computedW >= 4.4 ? "high" : computedW >= 4.0 ? "medium" : "low";
    }
  }

  const essay = getCachedJson<EssayGraderResult>("essay-grader-result");
  if (essay) {
    if (essay.rawScore != null) result.essayCommonApp = String(essay.rawScore);
    if (essay.vspiceComposite != null) result.essayVspice = String(essay.vspiceComposite);
  }

  const ec = getCachedJson<EcEvaluatorResult>("ec-evaluator-result");
  if (ec) {
    let band: string | undefined;
    if (Array.isArray(ec.activities) && ec.activities.length > 0) {
      band = bandFromEvaluation({
        activities: ec.activities as Parameters<typeof bandFromEvaluation>[0]["activities"],
        spikes: (Array.isArray(ec.spikes) ? ec.spikes : []) as Parameters<
          typeof bandFromEvaluation
        >[0]["spikes"],
      });
    } else if (ec.band) {
      band = ec.band;
    }
    if (band) {
      result.ecBand = band;
      const map: Record<string, "low" | "medium" | "high"> = {
        exceptional: "high", strong: "high", solid: "medium", developing: "low", limited: "low",
      };
      result.ecStrength = map[band] ?? "medium";
    }
  }

  return result;
}

function readOverrides(): FieldOverrides {
  return getCachedJson<FieldOverrides>(OVERRIDES_KEY) ?? {};
}

function writeOverrides(o: FieldOverrides): void {
  setJson<FieldOverrides>(OVERRIDES_KEY, o);
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [computed, setComputed] = useState<ComputedValues | null>(null);
  const [loaded, setLoaded] = useState(false);

  const syncFromComputed = useCallback(() => {
    const computedVals = readComputedValues();
    const overrides = readOverrides();
    setComputed(computedVals);

    setProfile((prev) => ({
      ...prev,
      gpaUW: overrides.gpaUW ? prev.gpaUW : (computedVals.gpaUW || prev.gpaUW),
      gpaW: overrides.gpaW ? prev.gpaW : (computedVals.gpaW || prev.gpaW),
      essayCommonApp: overrides.essayCommonApp ? prev.essayCommonApp : (computedVals.essayCommonApp || prev.essayCommonApp),
      essayVspice: overrides.essayVspice ? prev.essayVspice : (computedVals.essayVspice || prev.essayVspice),
      ecBand: overrides.ecBand ? prev.ecBand : (computedVals.ecBand || prev.ecBand),
      ecStrength: overrides.ecStrength ? prev.ecStrength : computedVals.ecStrength,
      rigor: overrides.rigor ? prev.rigor : computedVals.rigor,
    }));
  }, []);

  // Initial load
  useEffect(() => {
    const computedVals = readComputedValues();
    const overrides = readOverrides();
    setComputed(computedVals);

    // Cloud-loaded blobs can be partial (older accounts may lack `sat`,
    // `act`, etc.) — normalizeProfile fills every required field with a
    // safe default before we touch nested properties. cloud-storage
    // returns null when the cache is empty; fall through to EMPTY_PROFILE.
    const rawSaved = getCachedJson<unknown>(PROFILE_KEY);
    if (rawSaved !== null) {
      const parsed = normalizeProfile(rawSaved);
      setProfile({
        ...parsed,
        gpaUW: overrides.gpaUW ? parsed.gpaUW : (computedVals.gpaUW || parsed.gpaUW),
        gpaW: overrides.gpaW ? parsed.gpaW : (computedVals.gpaW || parsed.gpaW),
        essayCommonApp: overrides.essayCommonApp ? parsed.essayCommonApp : (computedVals.essayCommonApp || parsed.essayCommonApp),
        essayVspice: overrides.essayVspice ? parsed.essayVspice : (computedVals.essayVspice || parsed.essayVspice),
        ecBand: overrides.ecBand ? parsed.ecBand : (computedVals.ecBand || parsed.ecBand),
        ecStrength: overrides.ecStrength ? parsed.ecStrength : computedVals.ecStrength,
        rigor: overrides.rigor ? parsed.rigor : computedVals.rigor,
      });
    } else {
      setProfile({
        ...EMPTY_PROFILE,
        gpaUW: computedVals.gpaUW,
        gpaW: computedVals.gpaW,
        essayCommonApp: computedVals.essayCommonApp,
        essayVspice: computedVals.essayVspice,
        ecBand: computedVals.ecBand,
        ecStrength: computedVals.ecStrength,
        rigor: computedVals.rigor,
      });
    }
    setLoaded(true);
  }, []);

  // Re-sync on tab focus, cross-tab StorageEvent, profile-source-updated
  // (legacy), cloud-storage-changed (new), and cloud reconcile.
  useEffect(() => {
    if (!loaded) return;

    const SOURCE_KEYS = ["gpa-calc-v1", "essay-grader-result", "ec-evaluator-result"];

    const OVERRIDES_BY_SOURCE: Record<string, Array<keyof FieldOverrides>> = {
      "gpa-calc-v1": ["gpaUW", "gpaW", "rigor"],
      "essay-grader-result": ["essayCommonApp", "essayVspice"],
      "ec-evaluator-result": ["ecBand", "ecStrength"],
    };

    const clearOverridesFor = (key: string): void => {
      const fields = OVERRIDES_BY_SOURCE[key];
      if (!fields) return;
      const current = readOverrides();
      let changed = false;
      for (const f of fields) {
        if (current[f]) {
          delete current[f];
          changed = true;
        }
      }
      if (changed) writeOverrides(current);
    };

    const onFocus = () => syncFromComputed();

    const onStorage = (e: StorageEvent) => {
      if (e.key && SOURCE_KEYS.includes(e.key)) {
        clearOverridesFor(e.key);
        syncFromComputed();
      }
    };

    const onSourceUpdated = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (key && SOURCE_KEYS.includes(key)) {
        clearOverridesFor(key);
        syncFromComputed();
      }
    };

    const onCloudChanged = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (key && SOURCE_KEYS.includes(key)) {
        clearOverridesFor(key);
        syncFromComputed();
      }
    };

    // Cloud reconcile: re-read both the profile blob and the computed sources.
    // Without re-reading the blob, sat/act/apScores entered on another device
    // wouldn't appear until the next page reload. normalizeProfile guards
    // against partial blobs from older accounts.
    const onReconciled = () => {
      const rawSaved = getCachedJson<unknown>(PROFILE_KEY);
      if (rawSaved !== null) {
        const parsed = normalizeProfile(rawSaved);
        setProfile((prev) => ({ ...prev, ...parsed }));
      }
      syncFromComputed();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    window.addEventListener("profile-source-updated", onSourceUpdated);
    window.addEventListener("cloud-storage-changed", onCloudChanged);
    window.addEventListener("cloud-storage-reconciled", onReconciled);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("profile-source-updated", onSourceUpdated);
      window.removeEventListener("cloud-storage-changed", onCloudChanged);
      window.removeEventListener("cloud-storage-reconciled", onReconciled);
    };
  }, [loaded, syncFromComputed]);

  // Persist profile changes through the sync-event shim so legacy listeners
  // also re-fire (chance calc, college filter still listen for it).
  useEffect(() => {
    if (loaded) {
      setItemAndNotify(PROFILE_KEY, JSON.stringify(profile));
    }
  }, [profile, loaded]);

  const updateField = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    const autoSyncedKeys: Array<keyof FieldOverrides> = [
      "gpaUW", "gpaW", "essayCommonApp", "essayVspice", "ecBand", "ecStrength", "rigor",
    ];
    if (autoSyncedKeys.includes(key as keyof FieldOverrides)) {
      const overrides = readOverrides();
      overrides[key as keyof FieldOverrides] = true;
      writeOverrides(overrides);
    }
  }, []);

  const updateSAT = useCallback((field: keyof SATScores, value: string) => {
    setProfile((prev) => ({ ...prev, sat: { ...prev.sat, [field]: value } }));
  }, []);

  const updateACT = useCallback((field: keyof ACTScores, value: string) => {
    setProfile((prev) => ({ ...prev, act: { ...prev.act, [field]: value } }));
  }, []);

  const updateBasicInfo = useCallback((patch: Partial<BasicStudentInfo>) => {
    setProfile((prev) => ({
      ...prev,
      basicInfo: { ...(prev.basicInfo ?? EMPTY_BASIC_STUDENT_INFO), ...patch },
    }));
  }, []);

  const resetToComputed = useCallback(() => {
    const fresh = readComputedValues();
    setComputed(fresh);
    setProfile({
      ...EMPTY_PROFILE,
      gpaUW: fresh.gpaUW,
      gpaW: fresh.gpaW,
      essayCommonApp: fresh.essayCommonApp,
      essayVspice: fresh.essayVspice,
      ecBand: fresh.ecBand,
      ecStrength: fresh.ecStrength,
      rigor: fresh.rigor,
    });
    removeKey(PROFILE_KEY);
    removeKey(OVERRIDES_KEY);
  }, []);

  return { profile, computed, loaded, updateField, updateSAT, updateACT, updateBasicInfo, resetToComputed };
}
