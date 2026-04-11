"use client";

import { useState, useMemo, useEffect } from "react";
import { COLLEGES } from "@/data/colleges";
import type { ChanceInputs, ChanceResult, ChanceBand } from "@/lib/college-types";
import { EMPTY_CHANCE_INPUTS } from "@/lib/college-types";
import {
  compareGPA, compareTests, selectivityPenalty, majorAdjustment,
  scoreToBand, BAND_LABELS, essayScoreAdjustment,
  // UNDO [application-plan]: remove these two imports
  applicationPlanAdjustment, defaultApplicationPlan,
} from "@/lib/admissions";
import { computeApAcademicSupport } from "@/lib/ap-scores";

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
        ecBand: prev.ecBand || p.ecBand || "",
        // Compute SAT/ACT composites from section scores
        sat: prev.sat || (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : ""),
        // ACT composite excludes science
        act: prev.act || (p.act?.english && p.act?.math && p.act?.reading
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading)) / 3))
          : ""),
        actScience: prev.actScience || p.act?.science || "",
        // Auto-fill AP scores from profile
        apScores: prev.apScores.length > 0 ? prev.apScores : (p.apScores ?? []),
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

  // UNDO [application-plan]: delete this effect. Without it, stale plans
  // simply never rematch the new college's options and the helper falls back
  // to RD, which is still safe — but the UX of the plan selector would be
  // confusing.
  useEffect(() => {
    if (!college) return;
    const validPlans = (college.applicationOptions ?? [{ type: "RD" as const }]).map(
      (o) => o.type,
    );
    if (!validPlans.includes(inputs.applicationPlan)) {
      setInputs((prev) => ({ ...prev, applicationPlan: defaultApplicationPlan(college) }));
    }
  }, [college, inputs.applicationPlan]);

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

    // ── AP Scores (supporting academic evidence, max +6) ──
    if (inputs.apScores.length > 0) {
      const hasTests = sat !== null || act !== null;
      const apResult = computeApAcademicSupport(inputs.apScores, inputs.major, hasTests);
      score += apResult.adjustment;
      for (const s of apResult.signals) {
        (s.delta >= 0 ? strengths : weaknesses).push(s.label);
      }
    }

    // ── Holistic boosts (small) ──
    if (inputs.rigor === "high") { score += 5; strengths.push("Strong course rigor signals academic readiness"); }
    else if (inputs.rigor === "low") { score -= 5; weaknesses.push("Consider taking more challenging courses"); }

    // ── EC band (5-level scale from EC Evaluator) ──
    // Gradient: exceptional = best boost, limited = penalty. Unset = neutral.
    const EC_BAND_ADJUSTMENT: Record<string, { delta: number; label: string }> = {
      exceptional: { delta: 10, label: "Exceptional extracurriculars are a major strength" },
      strong: { delta: 6, label: "Strong extracurriculars strengthen your application" },
      solid: { delta: 2, label: "Solid extracurricular profile meets expectations" },
      developing: { delta: -3, label: "Developing extracurriculars — deeper involvement would help" },
      limited: { delta: -6, label: "Limited extracurriculars — consider building a meaningful commitment" },
    };
    if (inputs.ecBand && EC_BAND_ADJUSTMENT[inputs.ecBand]) {
      const ec = EC_BAND_ADJUSTMENT[inputs.ecBand];
      score += ec.delta;
      (ec.delta >= 0 ? strengths : weaknesses).push(ec.label);
    }

    // ── Essay scores (real numbers from grader) ──
    const essayCA = inputs.essayCommonApp ? parseFloat(inputs.essayCommonApp) : null;
    const essayV = inputs.essayVspice ? parseFloat(inputs.essayVspice) : null;
    const essayResult = essayScoreAdjustment(essayCA, essayV);
    score += essayResult.adjustment;
    for (const s of essayResult.signals) {
      (s.delta >= 0 ? strengths : weaknesses).push(s.label);
    }

    // UNDO [application-plan]: remove this block. The plan adjustment is
    // deliberately the LAST signal applied so the pre-plan score can gate it
    // (weak-profile floor in the helper). Order matters here.
    const preScore = score;
    const planResult = applicationPlanAdjustment(
      inputs.applicationPlan,
      college.acceptanceRate,
      preScore,
      college.name,
    );
    score += planResult.adjustment;
    // Plan boosts are never negative by construction (see admissions.ts).
    // A zero-delta signal (Rolling, or elite-capped weak profile) is still
    // informational, so always push to strengths for display.
    if (planResult.signal) {
      strengths.push(planResult.signal.label);
    }
    // end UNDO [application-plan]

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
