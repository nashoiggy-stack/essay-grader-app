"use client";

import { useState, useMemo, useEffect } from "react";
import { COLLEGES } from "@/data/colleges";
import type { CollegeFilters, ClassifiedCollege } from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";
import { classifyCollege } from "@/lib/admissions";

export function useCollegeFilter() {
  const [filters, setFilters] = useState<CollegeFilters>(DEFAULT_FILTERS);

  // ── Auto-fill from profile (localStorage) ──────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admitedge-profile");
      if (!raw) return;
      const p = JSON.parse(raw);

      setFilters((prev) => ({
        ...prev,
        gpaUW: prev.gpaUW || p.gpaUW || "",
        gpaW: prev.gpaW || p.gpaW || "",
        sat: prev.sat || (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : ""),
        act: prev.act || (p.act?.english && p.act?.math && p.act?.reading && p.act?.science
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading) + parseInt(p.act.science)) / 4))
          : ""),
        essayCommonApp: prev.essayCommonApp || p.essayCommonApp || "",
        essayVspice: prev.essayVspice || p.essayVspice || "",
      }));
    } catch (e) {
      console.warn("Could not read profile:", e);
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
