"use client";

import { useState, useEffect, useCallback } from "react";
import type { UserProfile, SATScores, ACTScores } from "@/lib/profile-types";
import { EMPTY_PROFILE, PROFILE_STORAGE_KEY } from "@/lib/profile-types";

interface ComputedValues {
  gpaUW: string;
  gpaW: string;
  essayCommonApp: string;
  essayVspice: string;
  ecBand: string;
  ecStrength: "low" | "medium" | "high";
  rigor: "low" | "medium" | "high";
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

  try {
    const gpaRaw = localStorage.getItem("gpa-calc-v1");
    if (gpaRaw) {
      const state = JSON.parse(gpaRaw);
      if (state?.years?.length) {
        const COL_UW: Record<string, number> = {
          "A+":4.00,"A":4.00,"A−":3.70,"B+":3.30,"B":3.00,"B−":2.70,
          "C+":2.30,"C":2.00,"C−":1.70,"D+":1.00,"D":1.00,"F":0.00,
        };
        const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1.0, HDE:1.0, AP:1.0 };
        let colUW = 0, colW = 0, totalCredits = 0;
        for (const year of state.years) {
          for (const row of year.rows) {
            if (!row.grade || row.nonCore) continue;
            const credits = parseFloat(row.credits) || 1;
            const base = COL_UW[row.grade] ?? 0;
            const isF = row.grade === "F";
            colUW += base * credits;
            colW += (isF ? 0 : base + (COL_BONUS[row.level] ?? 0)) * credits;
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
    }
  } catch { /* ignore */ }

  try {
    const essayRaw = localStorage.getItem("essay-grader-result");
    if (essayRaw) {
      const r = JSON.parse(essayRaw);
      if (r?.rawScore != null) result.essayCommonApp = String(r.rawScore);
      if (r?.vspiceComposite != null) result.essayVspice = String(r.vspiceComposite);
    }
  } catch { /* ignore */ }

  try {
    const ecRaw = localStorage.getItem("ec-evaluator-result");
    if (ecRaw) {
      const r = JSON.parse(ecRaw);
      if (r?.band) {
        result.ecBand = r.band;
        const map: Record<string, "low" | "medium" | "high"> = {
          exceptional: "high", strong: "high", solid: "medium", developing: "low", limited: "low",
        };
        result.ecStrength = map[r.band] ?? "medium";
      }
    }
  } catch { /* ignore */ }

  return result;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [computed, setComputed] = useState<ComputedValues | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load saved profile + computed values
  useEffect(() => {
    const computedVals = readComputedValues();
    setComputed(computedVals);

    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed: UserProfile = JSON.parse(saved);
        // Merge computed values into empty fields
        setProfile({
          ...parsed,
          gpaUW: parsed.gpaUW || computedVals.gpaUW,
          gpaW: parsed.gpaW || computedVals.gpaW,
          essayCommonApp: parsed.essayCommonApp || computedVals.essayCommonApp,
          essayVspice: parsed.essayVspice || computedVals.essayVspice,
          ecBand: parsed.ecBand || computedVals.ecBand,
          ecStrength: parsed.ecStrength === "medium" ? computedVals.ecStrength : parsed.ecStrength,
          rigor: parsed.rigor === "medium" ? computedVals.rigor : parsed.rigor,
        });
      } else {
        // No saved profile — use computed values
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
    } catch {
      setProfile({
        ...EMPTY_PROFILE,
        ...computedVals,
      });
    }

    setLoaded(true);
  }, []);

  // Save on change
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile, loaded]);

  const updateField = useCallback(<K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateSAT = useCallback((field: keyof SATScores, value: string) => {
    setProfile((prev) => ({ ...prev, sat: { ...prev.sat, [field]: value } }));
  }, []);

  const updateACT = useCallback((field: keyof ACTScores, value: string) => {
    setProfile((prev) => ({ ...prev, act: { ...prev.act, [field]: value } }));
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
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  return { profile, computed, loaded, updateField, updateSAT, updateACT, resetToComputed };
}
