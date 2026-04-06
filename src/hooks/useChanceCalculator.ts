"use client";

import { useState, useMemo } from "react";
import { COLLEGES } from "@/data/colleges";
import type {
  ChanceInputs, ChanceResult, ChanceBand,
} from "@/lib/college-types";
import { EMPTY_CHANCE_INPUTS } from "@/lib/college-types";

const BAND_LABELS: Record<ChanceBand, string> = {
  "very-low": "Very Low",
  low: "Low",
  possible: "Possible",
  competitive: "Competitive",
  strong: "Strong",
};

function scoreToBand(score: number): ChanceBand {
  if (score >= 75) return "strong";
  if (score >= 60) return "competitive";
  if (score >= 40) return "possible";
  if (score >= 20) return "low";
  return "very-low";
}

export function useChanceCalculator() {
  const [inputs, setInputs] = useState<ChanceInputs>(EMPTY_CHANCE_INPUTS);

  const updateInput = <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const resetInputs = () => setInputs(EMPTY_CHANCE_INPUTS);

  const college = inputs.collegeIndex !== null ? COLLEGES[inputs.collegeIndex] : null;

  const result = useMemo((): ChanceResult | null => {
    if (!college) return null;

    const gpa = inputs.gpa ? parseFloat(inputs.gpa) : null;
    const sat = inputs.sat ? parseInt(inputs.sat) : null;
    const act = inputs.act ? parseInt(inputs.act) : null;

    let score = 50; // baseline
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // ── GPA comparison ──
    if (gpa !== null) {
      const diff = gpa - college.avgGPA;
      if (diff >= 0.2) {
        score += 15;
        strengths.push(`Your GPA (${gpa.toFixed(2)}) is above the school average (${college.avgGPA.toFixed(2)})`);
      } else if (diff >= 0) {
        score += 5;
        strengths.push(`Your GPA (${gpa.toFixed(2)}) is at the school average`);
      } else if (diff >= -0.15) {
        score -= 5;
        weaknesses.push(`Your GPA (${gpa.toFixed(2)}) is slightly below average (${college.avgGPA.toFixed(2)})`);
      } else {
        score -= 15;
        weaknesses.push(`Your GPA (${gpa.toFixed(2)}) is below the school average (${college.avgGPA.toFixed(2)})`);
      }
    }

    // ── SAT comparison ──
    if (sat !== null && college.testPolicy !== "blind") {
      if (sat >= college.satRange[1]) {
        score += 12;
        strengths.push(`Your SAT (${sat}) is above the 75th percentile (${college.satRange[1]})`);
      } else if (sat >= college.satRange[0]) {
        score += 5;
        strengths.push(`Your SAT (${sat}) is within the school's range (${college.satRange[0]}-${college.satRange[1]})`);
      } else {
        score -= 12;
        weaknesses.push(`Your SAT (${sat}) is below the 25th percentile (${college.satRange[0]})`);
      }
    } else if (sat === null && college.testPolicy === "required") {
      score -= 5;
      weaknesses.push("This school requires test scores — submitting a score would strengthen your application");
    }
    // Test optional/blind with no score → no penalty

    // ── ACT comparison ──
    if (act !== null && college.testPolicy !== "blind") {
      if (act >= college.actRange[1]) {
        score += 10;
        strengths.push(`Your ACT (${act}) is above the 75th percentile (${college.actRange[1]})`);
      } else if (act >= college.actRange[0]) {
        score += 4;
        strengths.push(`Your ACT (${act}) is within range (${college.actRange[0]}-${college.actRange[1]})`);
      } else {
        score -= 10;
        weaknesses.push(`Your ACT (${act}) is below the 25th percentile (${college.actRange[0]})`);
      }
    }

    // ── Selectivity adjustment ──
    if (college.acceptanceRate <= 10) {
      score -= 15;
      weaknesses.push(`Extremely selective school (${college.acceptanceRate}% acceptance rate) — unpredictable for all applicants`);
    } else if (college.acceptanceRate <= 20) {
      score -= 8;
    } else if (college.acceptanceRate >= 60) {
      score += 8;
      strengths.push(`Higher acceptance rate (${college.acceptanceRate}%) works in your favor`);
    }

    // ── Rigor boost ──
    if (inputs.rigor === "high") { score += 5; strengths.push("Strong course rigor signals academic readiness"); }
    else if (inputs.rigor === "low") { score -= 5; weaknesses.push("Consider taking more challenging courses to show academic ambition"); }

    // ── EC boost ──
    if (inputs.ecStrength === "high") { score += 8; strengths.push("Strong extracurriculars will strengthen your application"); }
    else if (inputs.ecStrength === "low") { score -= 5; weaknesses.push("Developing deeper extracurricular involvement would help"); }

    // ── Essay boost ──
    if (inputs.essayStrength === "high") { score += 7; strengths.push("Strong essays can make a meaningful difference, especially at selective schools"); }
    else if (inputs.essayStrength === "low") { score -= 5; weaknesses.push("Investing more in your essays could improve your chances"); }

    // Clamp
    score = Math.max(5, Math.min(95, score));

    const band = scoreToBand(score);

    const explanation = buildExplanation(band, college.name, college.acceptanceRate, strengths, weaknesses);

    return { band, bandLabel: BAND_LABELS[band], explanation, strengths, weaknesses, score };
  }, [inputs, college]);

  return { inputs, updateInput, resetInputs, college, result, colleges: COLLEGES };
}

function buildExplanation(
  band: ChanceBand,
  name: string,
  rate: number,
  strengths: string[],
  weaknesses: string[]
): string {
  const prefix = {
    "very-low": `Admission to ${name} (${rate}% acceptance rate) would be very challenging based on your current profile.`,
    low: `Getting into ${name} (${rate}% acceptance rate) is an uphill battle, but not impossible with the right application.`,
    possible: `You have a reasonable shot at ${name} (${rate}% acceptance rate). Your profile has both strengths and areas to address.`,
    competitive: `You're a competitive applicant for ${name} (${rate}% acceptance rate). Your profile aligns well with what they're looking for.`,
    strong: `You're in a strong position for ${name} (${rate}% acceptance rate). Your stats are well above their typical admitted student.`,
  };

  const advice = strengths.length > weaknesses.length
    ? "Focus on making your application stand out through essays and extracurriculars."
    : "Consider strengthening the areas flagged below to improve your chances.";

  return `${prefix[band]} ${advice}`;
}
