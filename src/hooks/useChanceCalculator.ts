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

  // ── Auto-fill from profile (localStorage) ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("admitedge-profile");
      if (!raw) return;
      const p = JSON.parse(raw);

      setInputs((prev) => ({
        ...prev,
        gpaUW: prev.gpaUW || p.gpaUW || "",
        gpaW: prev.gpaW || p.gpaW || "",
        rigor: prev.rigor === "medium" && p.rigor ? p.rigor : prev.rigor,
        essayCommonApp: prev.essayCommonApp || p.essayCommonApp || "",
        essayVspice: prev.essayVspice || p.essayVspice || "",
        ecStrength: prev.ecStrength === "medium" && p.ecStrength ? p.ecStrength : prev.ecStrength,
        // Compute SAT/ACT composites from section scores
        sat: prev.sat || (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : ""),
        // ACT composite excludes science
        act: prev.act || (p.act?.english && p.act?.math && p.act?.reading
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading)) / 3))
          : ""),
        actScience: prev.actScience || p.act?.science || "",
      }));
    } catch (e) {
      console.warn("Could not read profile:", e);
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

    // ── ACT Science (small optional boost, no penalty) ──
    const actScience = inputs.actScience ? parseInt(inputs.actScience) : null;
    if (actScience !== null && college.testPolicy !== "blind") {
      // Only a boost if within or above range — no penalty for low/missing
      const actMid = (college.act25 + college.act75) / 2;
      if (actScience >= actMid) {
        const boost = actScience >= college.act75 ? 2 : 1;
        score += boost;
        strengths.push(`ACT Science (${actScience}) is ${actScience >= college.act75 ? "above" : "within"} range — modest boost`);
      }
    }

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
