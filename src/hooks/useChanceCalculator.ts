"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { COLLEGES } from "@/data/colleges";
import type { ChanceInputs, ChanceResult, Classification, ECBandInput } from "@/lib/college-types";
import { EMPTY_CHANCE_INPUTS } from "@/lib/college-types";
import { computeAdmissionChance, computeWhatIfs } from "@/lib/admissions";
import { computeApAcademicSupport } from "@/lib/ap-scores";
import { bandFromEvaluation } from "@/lib/extracurricular-types";
import { setItemAndNotify } from "@/lib/sync-event";
import { getCachedJson } from "@/lib/cloud-storage";

const TIER_LABELS: Record<Classification, string> = {
  safety: "Safety",
  likely: "Likely",
  target: "Target",
  reach: "Reach",
  unlikely: "Unlikely",
  insufficient: "Insufficient data",
};

export function useChanceCalculator() {
  const [inputs, setInputs] = useState<ChanceInputs>(EMPTY_CHANCE_INPUTS);

  // ── Auto-fill from profile + source keys (direct read) ─────────────────
  // Reads admitedge-profile first, then overlays fresh values directly from
  // source keys (essay-grader-result, ec-evaluator-result, gpa-calc-v1).
  // This works even when useProfile isn't mounted (e.g. user is on /chances).
  const fillFromSources = useCallback(() => {
    try {
      type ProfileShape = {
        essayCommonApp?: string;
        essayVspice?: string;
        ecBand?: ECBandInput;
        gpaUW?: string;
        gpaW?: string;
        rigor?: "low" | "medium" | "high";
        sat?: { readingWriting?: string; math?: string };
        act?: { english?: string; math?: string; reading?: string; science?: string };
        apScores?: ChanceInputs["apScores"];
        intendedMajor?: string;
      };
      const p = getCachedJson<ProfileShape>("admitedge-profile") ?? {};

      // Direct reads from source tools (fresher than profile)
      let essayCA = p.essayCommonApp || "";
      let essayV = p.essayVspice || "";
      const e = getCachedJson<{ rawScore?: number; vspiceComposite?: number }>(
        "essay-grader-result",
      );
      if (e) {
        if (e.rawScore != null) essayCA = String(e.rawScore);
        if (e.vspiceComposite != null) essayV = String(e.vspiceComposite);
      }

      let ecBand: ECBandInput = p.ecBand ?? "";
      const ecr = getCachedJson<{ activities?: unknown[]; spikes?: unknown[]; band?: string }>(
        "ec-evaluator-result",
      );
      if (ecr) {
        if (Array.isArray(ecr.activities) && ecr.activities.length > 0) {
          ecBand = bandFromEvaluation({
            activities: ecr.activities as Parameters<typeof bandFromEvaluation>[0]["activities"],
            spikes: (Array.isArray(ecr.spikes) ? ecr.spikes : []) as Parameters<
              typeof bandFromEvaluation
            >[0]["spikes"],
          }) as ECBandInput;
        } else if (ecr.band) {
          ecBand = ecr.band as ECBandInput;
        }
      }

      let gpaUW = p.gpaUW || "";
      let gpaW = p.gpaW || "";
      let rigor: "low" | "medium" | "high" = p.rigor || "medium";
      const state = getCachedJson<{ years?: { rows?: { grade?: string; credits?: string; level?: string; nonCore?: boolean }[] }[] }>(
        "gpa-calc-v1",
      );
      if (state?.years?.length) {
        const COL_UW: Record<string, number> = {
          "A+": 4, "A": 4, "A−": 3.7, "B+": 3.3, "B": 3, "B−": 2.7,
          "C+": 2.3, "C": 2, "C−": 1.7, "D+": 1, "D": 1, "F": 0,
        };
        const COL_BONUS: Record<string, number> = { CP: 0, Honors: 0.5, DE: 1, HDE: 1, AP: 1 };
        let uw = 0, w = 0, tc = 0;
        for (const year of state.years) {
          for (const row of year.rows ?? []) {
            if (!row.grade || row.nonCore) continue;
            const cr = parseFloat(row.credits ?? "1") || 1;
            const base = COL_UW[row.grade] ?? 0;
            uw += base * cr;
            w += (row.grade === "F" ? 0 : base + (COL_BONUS[row.level ?? "CP"] ?? 0)) * cr;
            tc += cr;
          }
        }
        if (tc > 0) {
          const cw = w / tc;
          gpaUW = (uw / tc).toFixed(2);
          gpaW = cw.toFixed(2);
          rigor = cw >= 4.4 ? "high" : cw >= 4.0 ? "medium" : "low";
        }
      }

      setInputs((prev) => ({
        ...prev,
        gpaUW: gpaUW || prev.gpaUW || "",
        gpaW: gpaW || prev.gpaW || "",
        rigor: rigor || prev.rigor,
        essayCommonApp: essayCA || prev.essayCommonApp || "",
        essayVspice: essayV || prev.essayVspice || "",
        ecBand: ecBand || prev.ecBand || "",
        sat: (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : prev.sat) || "",
        act: (p.act?.english && p.act?.math && p.act?.reading
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading)) / 3))
          : prev.act) || "",
        actScience: p.act?.science || prev.actScience || "",
        apScores: prev.apScores.length > 0 ? prev.apScores : (p.apScores ?? []),
        // Major carries over from the shared profile so picking it on the
        // college list or strategy page flows through here automatically.
        // Only adopt the stored value if the user hasn't already typed
        // something different into this form.
        major: prev.major || p.intendedMajor || "",
      }));
    } catch (e) {
      console.warn("Could not read sources:", e);
    }
  }, []);

  // Initial load + re-fill when any source updates (legacy + new events)
  useEffect(() => {
    fillFromSources();

    const onUpdated = () => fillFromSources();
    window.addEventListener("profile-source-updated", onUpdated);
    window.addEventListener("cloud-storage-changed", onUpdated);
    window.addEventListener("cloud-storage-reconciled", onUpdated);
    return () => {
      window.removeEventListener("profile-source-updated", onUpdated);
      window.removeEventListener("cloud-storage-changed", onUpdated);
      window.removeEventListener("cloud-storage-reconciled", onUpdated);
    };
  }, [fillFromSources]);

  const updateInput = <K extends keyof ChanceInputs>(key: K, value: ChanceInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    // Major is shared with the college list + strategy page. Writing it
    // back to the profile keeps all three surfaces in sync.
    if (key === "major") {
      const current = getCachedJson<Record<string, unknown>>("admitedge-profile") ?? {};
      setItemAndNotify(
        "admitedge-profile",
        JSON.stringify({ ...current, intendedMajor: value }),
      );
    }
  };

  const resetInputs = () => setInputs(EMPTY_CHANCE_INPUTS);

  const college = inputs.collegeIndex !== null ? COLLEGES[inputs.collegeIndex] : null;

  // Plan-selector validity: when the user switches colleges, fall back to RD
  // if the previously-selected plan isn't offered. RD is always a valid
  // baseline so we don't need a per-college lookup.
  useEffect(() => {
    if (!college) return;
    const validPlans = (college.applicationOptions ?? [{ type: "RD" as const }]).map(
      (o) => o.type,
    );
    if (!validPlans.includes(inputs.applicationPlan)) {
      setInputs((prev) => ({ ...prev, applicationPlan: "RD" }));
    }
  }, [college, inputs.applicationPlan]);

  const result = useMemo((): ChanceResult | null => {
    if (!college) return null;

    const gpaUW = inputs.gpaUW ? parseFloat(inputs.gpaUW) : null;
    const gpaW = inputs.gpaW ? parseFloat(inputs.gpaW) : null;
    const sat = inputs.sat ? parseInt(inputs.sat) : null;
    const act = inputs.act ? parseInt(inputs.act) : null;
    const essayCA = inputs.essayCommonApp ? parseFloat(inputs.essayCommonApp) : null;
    const essayV = inputs.essayVspice ? parseFloat(inputs.essayVspice) : null;

    // Drive /chances off the same chance model that powers /colleges, /compare,
    // /strategy, /dashboard. Inputs here include extras that the College List
    // hook doesn't surface (per-school applicationPlan, AP support, ACT
    // Science) — those are layered on top as small qualitative signals after
    // the percentile-based midpoint.
    // Distinguished EC flags + advancedCoursework + essayScores live on the
    // shared profile. Read them here so /chances reflects the same chance
    // math the rest of the app does.
    let distinguishedEC = false;
    let advancedCoursework: import("@/lib/profile-types").AdvancedCourseworkRow[] | undefined;
    let advancedCourseworkAvailable: "all" | "limited" | "none" | undefined;
    let essayScores: import("@/lib/profile-types").EssayScoreRecord[] | undefined;
    type ProfileSlice = {
      firstAuthorPublication?: boolean;
      nationalCompetitionPlacement?: boolean;
      founderWithUsers?: boolean;
      selectiveProgram?: boolean;
      advancedCoursework?: import("@/lib/profile-types").AdvancedCourseworkRow[];
      advancedCourseworkAvailable?: "all" | "limited" | "none";
      essayScores?: import("@/lib/profile-types").EssayScoreRecord[];
    };
    const p = getCachedJson<ProfileSlice>("admitedge-profile");
    if (p) {
      distinguishedEC =
        p.firstAuthorPublication === true ||
        p.nationalCompetitionPlacement === true ||
        p.founderWithUsers === true ||
        p.selectiveProgram === true;
      if (Array.isArray(p.advancedCoursework)) advancedCoursework = p.advancedCoursework;
      if (
        p.advancedCourseworkAvailable === "all" ||
        p.advancedCourseworkAvailable === "limited" ||
        p.advancedCourseworkAvailable === "none"
      ) {
        advancedCourseworkAvailable = p.advancedCourseworkAvailable;
      }
      if (Array.isArray(p.essayScores)) essayScores = p.essayScores;
    }

    // Synthesize an essayScores entry from the form's Common App + VSPICE
    // inputs when /profile hasn't surfaced graded essays yet. Auto-filled by
    // the Essay Grader, but the form values are read-trusted: if essayCA is
    // set and is in the Essay Grader's range, treat it as the combinedScore.
    // Without this, the chance model stays at the 1.0× neutral essay
    // multiplier and the user can't reach the maxed branches via the form.
    if ((!essayScores || essayScores.length === 0) && essayCA != null) {
      const vspice0to24 = essayV != null ? Math.max(0, Math.min(24, essayV)) : 0;
      essayScores = [
        {
          promptId: "chances-form",
          combinedScore: essayCA,
          rubricScore: essayCA,
          vspiceScore: vspice0to24,
          gradedAt: Date.now(),
        },
      ];
    }

    const chanceArgs = {
      college,
      gpaUW,
      gpaW,
      sat,
      act,
      essayCA,
      essayV,
      ecBand: inputs.ecBand || undefined,
      distinguishedEC,
      rigor: inputs.rigor,
      apScores: inputs.apScores,
      advancedCoursework,
      advancedCourseworkAvailable,
      essayScores,
      applicationPlan: inputs.applicationPlan,
    };
    const r = computeAdmissionChance(chanceArgs);
    const whatIfs = computeWhatIfs(chanceArgs, r);

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // The chance model's `reason` already strings together the headline
    // GPA + test + plan signals deterministically — split into sentence
    // fragments so the legacy ChanceResultDisplay UI can list them.
    // Split on ". " (period+space) so we don't break inside decimals like
    // "4.00" or test ranges like "34-36".
    if (r.reason) {
      const parts = r.reason
        .replace(/\.$/, "")
        .split(". ")
        .map((s) => s.trim())
        .filter(Boolean);
      for (const part of parts) {
        const lower = part.toLowerCase();
        const sentence = part.endsWith(".") ? part : part + ".";
        if (lower.includes("above") || lower.includes("within") || lower.includes("school-published")) {
          strengths.push(sentence);
        } else if (lower.includes("below") || lower.includes("widened") || lower.includes("based on overall trends")) {
          weaknesses.push(sentence);
        } else {
          strengths.push(sentence);
        }
      }
    }

    // Caveat flags from the chance model — surface as weaknesses so the user
    // sees them prominently.
    if (r.usedFallback === "ed") weaknesses.push("ED estimate based on overall trends, not school-specific data");
    if (r.usedFallback === "ea") weaknesses.push("EA estimate based on overall trends, not school-specific data");
    if (r.yieldProtectedNote) weaknesses.push("This school may consider demonstrated interest");
    if (r.stale) weaknesses.push("Data for this school may be stale (older than 2 academic cycles)");

    // ── EC band display (matches multiplier from chance model) ──
    const EC_BAND_LABELS: Record<string, { label: string; positive: boolean }> = {
      exceptional: { label: "Exceptional extracurriculars are a major strength", positive: true },
      strong: { label: "Strong extracurriculars strengthen your application", positive: true },
      solid: { label: "Solid extracurricular profile meets expectations", positive: true },
      developing: { label: "Developing extracurriculars — deeper involvement would help", positive: false },
      limited: { label: "Limited extracurriculars — consider building a meaningful commitment", positive: false },
    };
    if (inputs.ecBand && EC_BAND_LABELS[inputs.ecBand]) {
      const ec = EC_BAND_LABELS[inputs.ecBand];
      (ec.positive ? strengths : weaknesses).push(ec.label);
    }

    // ── Course rigor display ──
    if (inputs.rigor === "high") strengths.push("Strong course rigor signals academic readiness");
    else if (inputs.rigor === "low") weaknesses.push("Consider taking more challenging courses");

    // ── Test-required penalty surfaces as a weakness note ──
    if (sat === null && act === null && college.testPolicy === "required") {
      weaknesses.push("This school requires test scores — submitting a score would strengthen your application");
    }

    // ── ACT Science (small qualitative note, no math impact) ──
    const actScience = inputs.actScience ? parseInt(inputs.actScience) : null;
    if (actScience !== null && college.testPolicy !== "blind") {
      const actMid = (college.act25 + college.act75) / 2;
      if (actScience >= actMid) {
        strengths.push(`ACT Science (${actScience}) is ${actScience >= college.act75 ? "above" : "within"} range`);
      }
    }

    // ── AP Scores (supporting academic evidence) ──
    if (inputs.apScores.length > 0) {
      const hasTests = sat !== null || act !== null;
      const apResult = computeApAcademicSupport(inputs.apScores, inputs.major, hasTests);
      for (const s of apResult.signals) {
        (s.delta >= 0 ? strengths : weaknesses).push(s.label);
      }
    }

    // ── Major (qualitative note, math already handled by chance model) ──
    if (inputs.major && inputs.major !== "Any") {
      const isCompetitive = (college.competitiveMajors ?? []).some(
        (m) => m.toLowerCase() === inputs.major.toLowerCase(),
      );
      if (isCompetitive) {
        weaknesses.push(`${inputs.major} is a competitive major at this school`);
      }
    }

    const baseAR = college.acceptanceRate;
    const multiple = baseAR > 0 ? r.chance.mid / baseAR : 0;
    const explanation = buildExplanation(
      r.classification,
      r.chance,
      college.name,
      baseAR,
      r.confidence,
    );

    return {
      classification: r.classification,
      tierLabel: TIER_LABELS[r.classification],
      chance: r.chance,
      baseAcceptanceRate: baseAR,
      multiple,
      explanation,
      strengths,
      weaknesses,
      confidence: r.confidence,
      breakdown: r.breakdown,
      whatIfs,
    };
  }, [inputs, college]);

  return { inputs, updateInput, resetInputs, college, result, colleges: COLLEGES };
}

function buildExplanation(
  classification: Classification,
  chance: { low: number; mid: number; high: number },
  name: string,
  rate: number,
  confidence: "low" | "medium" | "high",
): string {
  if (classification === "insufficient") {
    return `Insufficient data to estimate your chances at ${name}. Add a GPA or test score to see a percentile-based estimate.`;
  }

  // Tier-based phrasing keyed on the new five-tier classification — never
  // calls a high-multiple chance "very low" just because the absolute % is
  // small. 12% at Yale is genuinely strong positioning at that selectivity.
  const range = `${chance.low}–${chance.high}%`;
  const lead =
    classification === "safety"
      ? `${name} reads as a safety for your profile. Estimated chance: ${chance.mid}% (range ${range}).`
      : classification === "likely"
      ? `${name} is a likely match for your profile. Estimated chance: ${chance.mid}% (range ${range}).`
      : classification === "target"
      ? `${name} sits in the target range for your profile. Estimated chance: ${chance.mid}% (range ${range}).`
      : classification === "reach"
      ? `${name} is a reach — at ${rate}% overall acceptance, variance dominates. Estimated chance: ${chance.mid}% (range ${range}).`
      : `${name} is unlikely on stats alone. Estimated chance: ${chance.mid}% (range ${range}).`;

  const confidenceNote =
    confidence === "low"
      ? " Limited data was provided — this estimate is uncertain. Add GPA, tests, EC band, and essay scores for a tighter range."
      : confidence === "medium"
      ? " Adding more data (test scores, EC band, essay scores) would tighten this range."
      : "";

  return `${lead}${confidenceNote}`;
}
