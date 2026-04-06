"use client";

import { useState, useMemo, useEffect } from "react";
import { COLLEGES } from "@/data/colleges";
import type { CollegeFilters, ClassifiedCollege } from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";
import { classifyCollege } from "@/lib/admissions";

export function useCollegeFilter() {
  const [filters, setFilters] = useState<CollegeFilters>(DEFAULT_FILTERS);

  // ── Auto-fill GPA from GPA calculator ──────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gpa-calc-v1");
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state?.years?.length) return;

      const COL_UW: Record<string, number> = {
        "A+":4.00,"A":4.00,"A−":3.70,"B+":3.30,"B":3.00,"B−":2.70,
        "C+":2.30,"C":2.00,"C−":1.70,"D+":1.00,"D":1.00,"F":0.00,
      };
      const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1.0, HDE:1.0, AP:1.0 };

      let colUW = 0, colW = 0, totalCredits = 0;
      for (const year of state.years) {
        for (const row of year.rows) {
          if (!row.grade) continue;
          // Skip non-core classes — college GPA only counts core classes
          if (row.nonCore) continue;
          const credits = parseFloat(row.credits) || 1;
          const base = COL_UW[row.grade] ?? 0;
          const isF = row.grade === "F";
          colUW += base * credits;
          colW += (isF ? 0 : base + (COL_BONUS[row.level] ?? 0)) * credits;
          totalCredits += credits;
        }
      }

      if (totalCredits > 0) {
        setFilters((prev) => ({
          ...prev,
          gpaUW: prev.gpaUW || (colUW / totalCredits).toFixed(2),
          gpaW: prev.gpaW || (colW / totalCredits).toFixed(2),
        }));
      }
    } catch (e) {
      console.warn("Could not read GPA from calculator:", e);
    }
  }, []);

  // ── Auto-fill essay scores from essay grader ───────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("essay-grader-result");
      if (!raw) return;
      const result = JSON.parse(raw);
      if (result?.rawScore != null && result?.vspiceComposite != null) {
        setFilters((prev) => ({
          ...prev,
          essayCommonApp: prev.essayCommonApp || String(result.rawScore),
          essayVspice: prev.essayVspice || String(result.vspiceComposite),
        }));
      }
    } catch (e) {
      console.warn("Could not read essay scores:", e);
    }
  }, []);

  const updateFilter = <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const results = useMemo((): ClassifiedCollege[] => {
    const gpaUW = filters.gpaUW ? parseFloat(filters.gpaUW) : null;
    const gpaW = filters.gpaW ? parseFloat(filters.gpaW) : null;
    const sat = filters.sat ? parseInt(filters.sat) : null;
    const act = filters.act ? parseInt(filters.act) : null;
    const essayCA = filters.essayCommonApp ? parseFloat(filters.essayCommonApp) : null;
    const essayV = filters.essayVspice ? parseFloat(filters.essayVspice) : null;
    const arMin = filters.acceptanceRateMin ? parseFloat(filters.acceptanceRateMin) : 0;
    const arMax = filters.acceptanceRateMax ? parseFloat(filters.acceptanceRateMax) : 100;

    return COLLEGES
      .filter((c) => {
        if (filters.region !== "any" && c.region !== filters.region) return false;
        if (filters.size !== "any" && c.size !== filters.size) return false;
        if (filters.setting !== "any" && c.setting !== filters.setting) return false;
        if (filters.type !== "any" && c.type !== filters.type) return false;
        if (filters.testPolicy !== "any" && c.testPolicy !== filters.testPolicy) return false;
        if (c.acceptanceRate < arMin || c.acceptanceRate > arMax) return false;
        if (filters.major && filters.major !== "Any") {
          if (!c.topMajors.some((m) => m.toLowerCase().includes(filters.major.toLowerCase()))) return false;
        }
        return true;
      })
      .map((c) => {
        const { classification, reason, fitScore } = classifyCollege(c, gpaUW, gpaW, sat, act, essayCA, essayV);
        return { college: c, classification, reason, fitScore };
      })
      .sort((a, b) => a.college.acceptanceRate - b.college.acceptanceRate);
  }, [filters]);

  const sortedBy = (key: "acceptanceRate" | "fit"): ClassifiedCollege[] => {
    if (key === "fit") return [...results].sort((a, b) => b.fitScore - a.fitScore);
    return results;
  };

  return { filters, updateFilter, resetFilters, results, sortedBy };
}
