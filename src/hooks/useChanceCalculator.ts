"use client";

import { useState, useMemo, useEffect } from "react";
import { COLLEGES } from "@/data/colleges";
import type { ChanceInputs, ChanceResult, ChanceBand } from "@/lib/college-types";
import { EMPTY_CHANCE_INPUTS } from "@/lib/college-types";
import {
  compareGPA, compareTests, selectivityPenalty, majorAdjustment,
  scoreToBand, BAND_LABELS, essayScoreAdjustment,
} from "@/lib/admissions";

export function useChanceCalculator() {
  const [inputs, setInputs] = useState<ChanceInputs>(EMPTY_CHANCE_INPUTS);

  // ── Auto-fill from GPA calculator (localStorage) ───────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gpa-calc-v1");
      if (!raw) return;
      const state = JSON.parse(raw);
      // Recalculate cumulative college-recalc GPA from saved rows
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
        setInputs((prev) => ({
          ...prev,
          gpaUW: prev.gpaUW || (colUW / totalCredits).toFixed(2),
          gpaW: prev.gpaW || (colW / totalCredits).toFixed(2),
        }));
      }
    } catch (e) {
      console.warn("Could not read GPA from calculator:", e);
    }
  }, []);

  // ── Auto-fill essay scores from essay grader (localStorage) ─────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("essay-grader-result");
      if (!raw) return;
      const result = JSON.parse(raw);
      if (result?.rawScore != null && result?.vspiceComposite != null) {
        setInputs((prev) => ({
          ...prev,
          essayCommonApp: prev.essayCommonApp || String(result.rawScore),
          essayVspice: prev.essayVspice || String(result.vspiceComposite),
        }));
      }
    } catch (e) {
      console.warn("Could not read essay scores:", e);
    }
  }, []);

  const updateInput = <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const resetInputs = () => setInputs(EMPTY_CHANCE_INPUTS);

  const college = inputs.collegeIndex !== null ? COLLEGES[inputs.collegeIndex] : null;

  const result = useMemo((): ChanceResult | null => {
    if (!college) return null;

    const gpaUW = inputs.gpaUW ? parseFloat(inputs.gpaUW) : null;
    const gpaW = inputs.gpaW ? parseFloat(inputs.gpaW) : null;
    const sat = inputs.sat ? parseInt(inputs.sat) : null;
    const act = inputs.act ? parseInt(inputs.act) : null;

    let score = 50;
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // ── Academic fit ──
    const gpaResult = compareGPA(gpaUW, gpaW, college.avgGPAUW, college.avgGPAW);
    for (const s of gpaResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }
    score += gpaResult.delta * 10;

    const testResult = compareTests(sat, act, college);
    for (const s of testResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }
    score += testResult.delta * 10;

    // Test-required penalty if no scores
    if (sat === null && act === null && college.testPolicy === "required") {
      score -= 5;
      weaknesses.push("This school requires test scores — submitting a score would strengthen your application");
    }

    // ── Selectivity ──
    const selResult = selectivityPenalty(college.acceptanceRate);
    score += selResult.adjustment;
    if (selResult.signal) {
      (selResult.adjustment < 0 ? weaknesses : strengths).push(selResult.signal.label);
    }

    // ── Major ──
    const majResult = majorAdjustment(inputs.major, college.competitiveMajors);
    score += majResult.adjustment;
    if (majResult.signal) weaknesses.push(majResult.signal.label);

    // ── Holistic boosts (small) ──
    if (inputs.rigor === "high") { score += 5; strengths.push("Strong course rigor signals academic readiness"); }
    else if (inputs.rigor === "low") { score -= 5; weaknesses.push("Consider taking more challenging courses"); }

    if (inputs.ecStrength === "high") { score += 7; strengths.push("Strong extracurriculars strengthen your application"); }
    else if (inputs.ecStrength === "low") { score -= 4; weaknesses.push("Deeper extracurricular involvement would help"); }

    // ── Essay scores (real numbers from grader) ──
    const essayCA = inputs.essayCommonApp ? parseFloat(inputs.essayCommonApp) : null;
    const essayV = inputs.essayVspice ? parseFloat(inputs.essayVspice) : null;
    const essayResult = essayScoreAdjustment(essayCA, essayV);
    score += essayResult.adjustment;
    for (const s of essayResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }

    score = Math.max(5, Math.min(95, Math.round(score)));

    // ── Confidence based on how many metrics were provided ──
    const totalMetrics = gpaResult.metrics + testResult.metrics;
    const confidence: "low" | "medium" | "high" =
      totalMetrics >= 3 ? "high" : totalMetrics >= 1 ? "medium" : "low";

    const band = scoreToBand(score);
    const explanation = buildExplanation(band, college.name, college.acceptanceRate, confidence, strengths, weaknesses);

    return { band, bandLabel: BAND_LABELS[band], explanation, strengths, weaknesses, score, confidence };
  }, [inputs, college]);

  return { inputs, updateInput, resetInputs, college, result, colleges: COLLEGES };
}

function buildExplanation(
  band: ChanceBand,
  name: string,
  rate: number,
  confidence: "low" | "medium" | "high",
  strengths: string[],
  weaknesses: string[]
): string {
  const prefix: Record<ChanceBand, string> = {
    "very-low": `Admission to ${name} (${rate}% acceptance rate) would be very challenging based on your current profile.`,
    low: `Getting into ${name} (${rate}% acceptance rate) is an uphill battle, but not impossible with the right application.`,
    possible: `You have a reasonable shot at ${name} (${rate}% acceptance rate). Your profile has both strengths and areas to address.`,
    competitive: `You're a competitive applicant for ${name} (${rate}% acceptance rate). Your profile aligns well with what they're looking for.`,
    strong: `You're in a strong position for ${name} (${rate}% acceptance rate). Your stats are well above their typical admitted student.`,
  };

  const confidenceNote = confidence === "low"
    ? " Note: limited data was provided, so this estimate is less certain."
    : confidence === "medium"
    ? " Adding more data (test scores, GPA) would make this estimate more reliable."
    : "";

  const advice = strengths.length > weaknesses.length
    ? "Focus on making your application stand out through essays and extracurriculars."
    : "Consider strengthening the areas flagged below to improve your chances.";

  return `${prefix[band]} ${advice}${confidenceNote}`;
}
