"use client";

import { useState, useMemo } from "react";
import { COLLEGES } from "@/data/colleges";
import type {
  College, CollegeFilters, ClassifiedCollege, Classification, EMPTY_FILTERS,
} from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";

function classify(
  college: College,
  gpa: number | null,
  sat: number | null,
  act: number | null
): { classification: Classification; reason: string; fitScore: number } {
  const signals: { label: string; delta: number }[] = [];
  let totalDelta = 0;
  let metrics = 0;

  if (gpa !== null) {
    const diff = gpa - college.avgGPA;
    const pct = diff / 0.5; // 0.5 GPA spread = full range
    totalDelta += pct;
    metrics++;
    if (diff >= 0.15) signals.push({ label: "GPA above average", delta: pct });
    else if (diff <= -0.15) signals.push({ label: "GPA below average", delta: pct });
    else signals.push({ label: "GPA in range", delta: pct });
  }

  if (sat !== null && college.testPolicy !== "blind") {
    const mid = (college.satRange[0] + college.satRange[1]) / 2;
    const spread = (college.satRange[1] - college.satRange[0]) / 2;
    const diff = (sat - mid) / Math.max(spread, 1);
    totalDelta += diff;
    metrics++;
    if (sat >= college.satRange[1]) signals.push({ label: "SAT above 75th percentile", delta: diff });
    else if (sat <= college.satRange[0]) signals.push({ label: "SAT below 25th percentile", delta: diff });
    else signals.push({ label: "SAT within range", delta: diff });
  }

  if (act !== null && college.testPolicy !== "blind") {
    const mid = (college.actRange[0] + college.actRange[1]) / 2;
    const spread = (college.actRange[1] - college.actRange[0]) / 2;
    const diff = (act - mid) / Math.max(spread, 1);
    totalDelta += diff;
    metrics++;
    if (act >= college.actRange[1]) signals.push({ label: "ACT above 75th percentile", delta: diff });
    else if (act <= college.actRange[0]) signals.push({ label: "ACT below 25th percentile", delta: diff });
    else signals.push({ label: "ACT within range", delta: diff });
  }

  const avg = metrics > 0 ? totalDelta / metrics : 0;
  let classification: Classification;
  let fitScore: number;

  if (avg > 0.5) {
    classification = "safety";
    fitScore = Math.min(95, 70 + avg * 20);
  } else if (avg > -0.3) {
    classification = "target";
    fitScore = Math.min(80, 50 + (avg + 0.3) * 40);
  } else {
    classification = "reach";
    fitScore = Math.max(5, 30 + avg * 20);
  }

  // Highly selective schools can never be safety
  if (college.acceptanceRate < 15 && classification === "safety") {
    classification = "target";
    fitScore = Math.min(fitScore, 75);
  }

  // If no metrics provided, default to acceptance rate heuristic
  if (metrics === 0) {
    if (college.acceptanceRate < 20) { classification = "reach"; fitScore = 30; }
    else if (college.acceptanceRate < 50) { classification = "target"; fitScore = 55; }
    else { classification = "safety"; fitScore = 75; }
  }

  const reason = signals.length > 0
    ? signals.map((s) => s.label).join(". ") + "."
    : `Based on ${college.acceptanceRate}% acceptance rate.`;

  return { classification, reason, fitScore: Math.round(fitScore) };
}

export function useCollegeFilter() {
  const [filters, setFilters] = useState<CollegeFilters>(DEFAULT_FILTERS);

  const updateFilter = <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const results = useMemo((): ClassifiedCollege[] => {
    const gpa = filters.gpa ? parseFloat(filters.gpa) : null;
    const sat = filters.sat ? parseInt(filters.sat) : null;
    const act = filters.act ? parseInt(filters.act) : null;
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
        const { classification, reason, fitScore } = classify(c, gpa, sat, act);
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
