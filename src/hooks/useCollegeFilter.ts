"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { COLLEGES } from "@/data/colleges";
import type { CollegeFilters, ClassifiedCollege } from "@/lib/college-types";
import { EMPTY_FILTERS as DEFAULT_FILTERS } from "@/lib/college-types";
import { classifyCollege } from "@/lib/admissions";
import { computeMajorFit, computeMajorFitMulti, MAJOR_MATCH_RANK } from "@/lib/major-match";
import { PROFILE_STORAGE_KEY } from "@/lib/profile-types";
import { setItemAndNotify } from "@/lib/sync-event";

// Caps from the spec — keeps the chip UI scannable and the per-card
// breakdown popover from running off the screen.
export const MAX_MAJORS = 5;
export const MAX_INTERESTS = 5;

// Helper: read profile and derive the saved + active arrays. Migrates
// legacy single-string `intendedMajor` / `intendedInterest` into the
// array shape on first read so existing profiles keep working without
// data loss. Returns the four arrays the filter uses.
function readMajorPrefs(p: Record<string, unknown>): {
  intendedMajors: string[];
  activeMajors: string[];
  intendedInterests: string[];
  activeInterests: string[];
} {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];

  const legacyMajor = typeof p.intendedMajor === "string" && p.intendedMajor ? p.intendedMajor : null;
  const legacyInterest = typeof p.intendedInterest === "string" && p.intendedInterest ? p.intendedInterest : null;

  let intendedMajors = arr(p.intendedMajors);
  let activeMajors = arr(p.activeMajors);
  let intendedInterests = arr(p.intendedInterests);
  let activeInterests = arr(p.activeInterests);

  // Migration: if arrays are empty but a legacy single value exists, seed
  // arrays from it. New writes will persist the arrays so this is a one-shot.
  if (intendedMajors.length === 0 && legacyMajor) intendedMajors = [legacyMajor];
  if (activeMajors.length === 0 && legacyMajor) activeMajors = [legacyMajor];
  if (intendedInterests.length === 0 && legacyInterest) intendedInterests = [legacyInterest];
  if (activeInterests.length === 0 && legacyInterest) activeInterests = [legacyInterest];

  return { intendedMajors, activeMajors, intendedInterests, activeInterests };
}

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

      const prefs = readMajorPrefs(p as Record<string, unknown>);

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
        // Major/interest preferences persist from the shared profile, but
        // only adopt the stored value if the user hasn't already chosen
        // something different in this filter panel.
        intendedMajors: prev.intendedMajors.length > 0 ? prev.intendedMajors : prefs.intendedMajors,
        activeMajors: prev.activeMajors.length > 0 ? prev.activeMajors : prefs.activeMajors,
        intendedInterests: prev.intendedInterests.length > 0 ? prev.intendedInterests : prefs.intendedInterests,
        activeInterests: prev.activeInterests.length > 0 ? prev.activeInterests : prefs.activeInterests,
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
    // Multi-interest: still only fetch one map at a time — pick the first
    // active interest. The matcher applies the resulting relatedMajors /
    // expandedKeywords across every active entry's score, which is the
    // intended widening effect.
    const interest = (filters.activeInterests[0] ?? "").trim();
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
  }, [filters.activeInterests]);

  const updateFilter = <K extends keyof CollegeFilters>(key: K, value: CollegeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));

    // Persist multi-major / multi-interest preferences to the shared profile
    // so the strategy page and other surfaces stay in sync. Other filter
    // fields are page-local. We always write all four chip arrays so the
    // legacy single fields (intendedMajor / intendedInterest) can be derived
    // separately by the primary-major effect below.
    if (
      key === "intendedMajors" ||
      key === "activeMajors" ||
      key === "intendedInterests" ||
      key === "activeInterests"
    ) {
      try {
        const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
        const current = raw ? JSON.parse(raw) : {};
        const next = { ...current, [key]: value };
        setItemAndNotify(PROFILE_STORAGE_KEY, JSON.stringify(next));
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

    // Read EC band and rigor from profile so the chance model can apply
    // their multipliers. Without this the model treats every applicant as
    // EC-band "solid" and rigor-neutral, which suppresses chances for
    // strong-profile applicants (the "20 unlikelies for a 4.0/exceptional"
    // bug).
    let ecBand: string | undefined;
    let rigor: "low" | "medium" | "high" | undefined;
    try {
      const rawProfile = localStorage.getItem("admitedge-profile");
      if (rawProfile) {
        const p = JSON.parse(rawProfile);
        if (typeof p?.ecBand === "string" && p.ecBand) ecBand = p.ecBand;
        if (p?.rigor === "low" || p?.rigor === "medium" || p?.rigor === "high") rigor = p.rigor;
      }
    } catch { /* ignore */ }

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
        const result = classifyCollege(c, gpaUW, gpaW, sat, act, essayCA, essayV, { ecBand, rigor });
        // Multi-input matcher: scores per active major + active interest,
        // returns max score, max level (OR), the per-entry breakdown for
        // the card UI, and a major-prefixed reason string.
        const multi = computeMajorFitMulti(c, {
          activeMajors: filters.activeMajors,
          activeInterests: filters.activeInterests,
          relatedMajors: interestMap?.relatedMajors,
          expandedKeywords: interestMap?.keywords,
        });
        return {
          college: c,
          classification: result.classification,
          reason: result.reason,
          chance: result.chance,
          confidence: result.confidence,
          yieldProtectedNote: result.yieldProtectedNote,
          usedFallback: result.usedFallback,
          stale: result.stale,
          recruitedAthletePathway: result.recruitedAthletePathway,
          majorMatch: multi.match,
          majorFitScore: multi.score,
          matchReason: multi.bestReason,
          majorFitBreakdown: multi.perEntry.map((e) => ({
            name: e.name,
            kind: e.kind,
            score: e.score,
            level: e.level,
          })),
          bestMatchMajor: multi.bestMatchName,
        };
      })
      // Default sort: highest chance midpoint first (replaces fitScore-based sort).
      .sort((a, b) => b.chance.mid - a.chance.mid);
  }, [filters, interestMap]);

  // Derive a single primary major and write it to profile.intendedMajor
  // (legacy single-string field) so strategy / chances / share view stay
  // on a sensible single value. The primary is whichever ACTIVE major has
  // the highest aggregate fitScore across the user's pinned schools (proxy
  // for "the major most aligned with where they're applying"). Zero active
  // majors → leave profile.intendedMajor untouched. Same idea for the
  // single intendedInterest field (uses the first active interest).
  useEffect(() => {
    if (filters.activeMajors.length === 0 && filters.activeInterests.length === 0) return;

    let primaryMajor: string | undefined;
    if (filters.activeMajors.length === 1) {
      primaryMajor = filters.activeMajors[0];
    } else if (filters.activeMajors.length > 1) {
      // Score each active major by aggregate fit across pinned schools.
      // We read pinned colleges from the same source useCollegePins reads.
      let pinnedNames: string[] = [];
      try {
        const rawPins = localStorage.getItem("admitedge-pinned-colleges");
        const arr = rawPins ? JSON.parse(rawPins) : [];
        if (Array.isArray(arr)) {
          pinnedNames = arr
            .map((p: { name?: string }) => p?.name)
            .filter((n): n is string => typeof n === "string" && n.length > 0);
        }
      } catch { /* ignore */ }

      let bestMajor = filters.activeMajors[0];
      let bestSum = -Infinity;
      for (const m of filters.activeMajors) {
        let sum = 0;
        const pool = pinnedNames.length > 0
          ? COLLEGES.filter((c) => pinnedNames.includes(c.name))
          : COLLEGES;
        for (const c of pool) {
          sum += computeMajorFit(c, { major: m, interest: null }).score;
        }
        if (sum > bestSum) {
          bestSum = sum;
          bestMajor = m;
        }
      }
      primaryMajor = bestMajor;
    }

    const primaryInterest = filters.activeInterests[0] ?? undefined;

    try {
      const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      const next: Record<string, unknown> = { ...current };
      if (primaryMajor !== undefined) next.intendedMajor = primaryMajor;
      if (primaryInterest !== undefined) next.intendedInterest = primaryInterest;
      // Skip write if nothing actually changed (keeps useEffect from
      // dispatching a sync event for no reason).
      if (
        next.intendedMajor !== current.intendedMajor ||
        next.intendedInterest !== current.intendedInterest
      ) {
        setItemAndNotify(PROFILE_STORAGE_KEY, JSON.stringify(next));
      }
    } catch { /* ignore */ }
  }, [filters.activeMajors, filters.activeInterests]);

  const sortedBy = (
    key: "acceptanceRate" | "chance" | "majorMatch" | "majorFitScore",
  ): ClassifiedCollege[] => {
    if (key === "chance") return [...results].sort((a, b) => b.chance.mid - a.chance.mid);
    if (key === "majorFitScore") {
      // Raw graded score — smoother than the tier bucket. Break ties by
      // chance midpoint so two same-score schools still order sensibly.
      return [...results].sort((a, b) => {
        const sa = a.majorFitScore ?? 0;
        const sb = b.majorFitScore ?? 0;
        if (sa !== sb) return sb - sa;
        return b.chance.mid - a.chance.mid;
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
        return b.chance.mid - a.chance.mid;
      });
    }
    return results;
  };

  return { filters, updateFilter, resetFilters, results, sortedBy };
}
