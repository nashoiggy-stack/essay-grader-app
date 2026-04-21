"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { COLLEGES } from "@/data/colleges";
import type { CollegeFilters, ClassifiedCollege } from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";
import { classifyCollege } from "@/lib/admissions";
import { computeMajorFit, buildMatchReason, MAJOR_MATCH_RANK } from "@/lib/major-match";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { setItemAndNotify } from "@/lib/sync-event";

// Pass 4 — cached LLM interest-mapping result. Matches the shape of what
// /api/interest-map returns; stored on the profile as `interest_map` once
// the debounced fetcher completes. Kept internal to the matcher — the
// matcher only consumes `relatedMajors` and `keywords` from it.
interface InterestMapResult {
  readonly relatedMajors: string[];
  readonly keywords: string[];
  readonly confidence: number;
}

// Seven days of freshness for a cached interest map. Long enough that
// re-typing the same interest doesn't re-hit Haiku, short enough that
// we regenerate if we ever improve the prompt.
const INTEREST_MAP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const LLM_INTEREST_MAP_ENABLED =
  process.env.NEXT_PUBLIC_LLM_INTEREST_MAP === "true";

export function useCollegeFilter() {
  const [filters, setFilters] = useState<CollegeFilters>(DEFAULT_FILTERS);
  // LLM interest mapping (Pass 4). Null when the flag is off, or the user
  // hasn't typed an interest, or a fetch hasn't resolved yet.
  const [interestMap, setInterestMap] = useState<InterestMapResult | null>(null);

  // ── Auto-fill from profile + source keys (direct read) ─────────────────
  const fillFromSources = useCallback(() => {
    try {
      const raw = localStorage.getItem("admitedge-profile");
      const p = raw ? JSON.parse(raw) : {};

      // Direct reads from source tools
      let essayCA = p.essayCommonApp || "";
      let essayV = p.essayVspice || "";
      try {
        const er = localStorage.getItem("essay-grader-result");
        if (er) {
          const e = JSON.parse(er);
          if (e?.rawScore != null) essayCA = String(e.rawScore);
          if (e?.vspiceComposite != null) essayV = String(e.vspiceComposite);
        }
      } catch { /* ignore */ }

      let gpaUW = p.gpaUW || "";
      let gpaW = p.gpaW || "";
      try {
        const gr = localStorage.getItem("gpa-calc-v1");
        if (gr) {
          const state = JSON.parse(gr);
          if (state?.years?.length) {
            const COL_UW: Record<string, number> = {
              "A+":4,"A":4,"A−":3.7,"B+":3.3,"B":3,"B−":2.7,"C+":2.3,"C":2,"C−":1.7,"D+":1,"D":1,"F":0,
            };
            const COL_BONUS: Record<string, number> = { CP:0, Honors:0.5, DE:1, HDE:1, AP:1 };
            let uw = 0, w = 0, tc = 0;
            for (const year of state.years) {
              for (const row of year.rows) {
                if (!row.grade || row.nonCore) continue;
                const cr = parseFloat(row.credits) || 1;
                const base = COL_UW[row.grade] ?? 0;
                uw += base * cr;
                w += (row.grade === "F" ? 0 : base + (COL_BONUS[row.level] ?? 0)) * cr;
                tc += cr;
              }
            }
            if (tc > 0) { gpaUW = (uw / tc).toFixed(2); gpaW = (w / tc).toFixed(2); }
          }
        }
      } catch { /* ignore */ }

      setFilters((prev) => ({
        ...prev,
        gpaUW: gpaUW || prev.gpaUW || "",
        gpaW: gpaW || prev.gpaW || "",
        sat: (p.sat?.readingWriting && p.sat?.math
          ? String(parseInt(p.sat.readingWriting) + parseInt(p.sat.math))
          : prev.sat) || "",
        act: (p.act?.english && p.act?.math && p.act?.reading && p.act?.science
          ? String(Math.round((parseInt(p.act.english) + parseInt(p.act.math) + parseInt(p.act.reading) + parseInt(p.act.science)) / 4))
          : prev.act) || "",
        essayCommonApp: essayCA || prev.essayCommonApp || "",
        essayVspice: essayV || prev.essayVspice || "",
        // Major/interest persist from the shared profile, but only adopt
        // the stored value if the user hasn't already typed something
        // different into this page's filter panel.
        major: prev.major || p.intendedMajor || "",
        intendedInterest: prev.intendedInterest || p.intendedInterest || "",
      }));
    } catch (e) {
      console.warn("Could not read sources:", e);
    }
  }, []);

  useEffect(() => {
    fillFromSources();

    const onUpdated = () => fillFromSources();
    window.addEventListener("profile-source-updated", onUpdated);
    window.addEventListener("cloud-sync-loaded", onUpdated);
    return () => {
      window.removeEventListener("profile-source-updated", onUpdated);
      window.removeEventListener("cloud-sync-loaded", onUpdated);
    };
  }, [fillFromSources]);

  // ── Pass 4: debounced LLM interest mapping ──────────────────────────────
  // When the user types a free-text interest, ping /api/interest-map after
  // 600ms of idle time to get formal relatedMajors + keywords. Cache in
  // localStorage under PROFILE_STORAGE_KEY.interest_map so re-mounts and
  // other surfaces pick it up. Off by default — gated on
  // NEXT_PUBLIC_LLM_INTEREST_MAP=true.
  useEffect(() => {
    if (!LLM_INTEREST_MAP_ENABLED) {
      // Reset is idempotent — React bails on null === null. The lint
      // rule flags synchronous setState in effects as cascading-render
      // risk, but this is a cleanup-on-flag-off, not a derivation.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInterestMap(null);
      return;
    }
    const interest = filters.intendedInterest.trim();
    if (!interest) {
      setInterestMap(null);
      return;
    }

    // Reuse a cached mapping if it's for this exact interest and still fresh.
    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const p = raw ? JSON.parse(raw) : {};
      const cached = p.interest_map;
      if (
        cached &&
        cached.interest === interest &&
        typeof cached.generatedAt === "number" &&
        Date.now() - cached.generatedAt < INTEREST_MAP_TTL_MS
      ) {
        setInterestMap({
          relatedMajors: Array.isArray(cached.relatedMajors) ? cached.relatedMajors : [],
          keywords: Array.isArray(cached.keywords) ? cached.keywords : [],
          confidence: typeof cached.confidence === "number" ? cached.confidence : 0,
        });
        return;
      }
    } catch { /* ignore */ }

    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch("/api/interest-map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interest }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as InterestMapResult;
        if (cancelled) return;
        setInterestMap(data);
        // Persist to the shared profile so other surfaces can use it and
        // we don't re-fetch on the next mount.
        try {
          const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
          const current = raw ? JSON.parse(raw) : {};
          setItemAndNotify(
            PROFILE_STORAGE_KEY,
            JSON.stringify({
              ...current,
              interest_map: { ...data, interest, generatedAt: Date.now() },
            }),
          );
        } catch { /* ignore write errors */ }
      } catch { /* network error — fall back to base matcher */ }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
    // NB: interestMap isn't a dependency. The effect only writes it, and
    // re-running on its own writes would loop when the cached-match branch
    // sets a fresh object for the same interest.
  }, [filters.intendedInterest]);

  const updateFilter = <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));

    // Persist major + interest to the shared profile so the strategy page
    // (and any other surface that reads PROFILE_STORAGE_KEY) stays in sync.
    // Other filter fields are page-local.
    if (key === "major" || key === "intendedInterest") {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : {};
        const field = key === "major" ? "intendedMajor" : "intendedInterest";
        setItemAndNotify(
          PROFILE_STORAGE_KEY,
          JSON.stringify({ ...current, [field]: value }),
        );
      } catch { /* ignore write errors */ }
    }
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

    // Major is now a *preference*, not a hard filter. Non-matching schools
    // stay in the list so users can discover unexpected fits — we just
    // attach a majorMatch level so the UI can badge strong ones.
    return COLLEGES
      .filter((c) => {
        if (filters.region !== "any" && c.region !== filters.region) return false;
        if (filters.size !== "any" && c.size !== filters.size) return false;
        if (filters.setting !== "any" && c.setting !== filters.setting) return false;
        if (filters.type !== "any" && c.type !== filters.type) return false;
        if (filters.testPolicy !== "any" && c.testPolicy !== filters.testPolicy) return false;
        if (c.acceptanceRate < arMin || c.acceptanceRate > arMax) return false;
        return true;
      })
      .map((c) => {
        const { classification, reason, fitScore } = classifyCollege(c, gpaUW, gpaW, sat, act, essayCA, essayV);
        const query = {
          major: filters.major,
          interest: filters.intendedInterest,
          relatedMajors: interestMap?.relatedMajors,
          expandedKeywords: interestMap?.keywords,
        };
        const fit = computeMajorFit(c, query);
        const matchReason = buildMatchReason(c, query, fit.signals);
        return {
          college: c,
          classification,
          reason,
          fitScore,
          majorMatch: fit.match,
          majorFitScore: fit.score,
          matchReason,
        };
      })
      .sort((a, b) => a.college.acceptanceRate - b.college.acceptanceRate);
  }, [filters, interestMap]);

  const sortedBy = (
    key: "acceptanceRate" | "fit" | "majorMatch" | "majorFitScore",
  ): ClassifiedCollege[] => {
    if (key === "fit") return [...results].sort((a, b) => b.fitScore - a.fitScore);
    if (key === "majorFitScore") {
      // Raw graded score — smoother than the tier bucket. Break ties by
      // academic fit so two same-score schools still order sensibly.
      return [...results].sort((a, b) => {
        const sa = a.majorFitScore ?? 0;
        const sb = b.majorFitScore ?? 0;
        if (sa !== sb) return sb - sa;
        return b.fitScore - a.fitScore;
      });
    }
    if (key === "majorMatch") {
      return [...results].sort((a, b) => {
        const ra = MAJOR_MATCH_RANK[a.majorMatch ?? "none"];
        const rb = MAJOR_MATCH_RANK[b.majorMatch ?? "none"];
        if (ra !== rb) return rb - ra;
        // Within a tier, use the graded fit score so Stanford > state
        // school even though both are "strong".
        const sa = a.majorFitScore ?? 0;
        const sb = b.majorFitScore ?? 0;
        if (sa !== sb) return sb - sa;
        return b.fitScore - a.fitScore;
      });
    }
    return results;
  };

  return { filters, updateFilter, resetFilters, results, sortedBy };
}
