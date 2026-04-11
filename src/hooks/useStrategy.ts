"use client";

import { useState, useCallback, useEffect } from "react";
import type {
  StrategyProfile,
  StrategyAnalysis,
  StrategyResult,
} from "@/lib/strategy-types";
import { STRATEGY_CACHE_KEY, STRATEGY_CACHE_VERSION } from "@/lib/strategy-types";
import { readStrategyProfile } from "@/lib/strategy-profile";
import { runStrategyAnalysis } from "@/lib/strategy-engine";

// ── Content-hash cache ─────────────────────────────────────────────────────
// Same pattern as useGrading: hash the input StrategyProfile so regenerating
// against an unchanged profile returns instantly. Profile changes → new hash
// → fresh call.

function hashInput(profile: StrategyProfile): string {
  // djb2 over a deterministic JSON projection of the fields that actually
  // matter for strategy generation. Excludes timestamps/booleans that would
  // flap without changing the analysis.
  const projected = {
    gpa: profile.gpa,
    tests: profile.tests,
    ec: profile.ec
      ? {
          band: profile.ec.band,
          spikes: profile.ec.spikes,
          activities: profile.ec.activities.map((a) => ({
            name: a.activityName,
            tier: a.tier,
            scores: a.scores,
          })),
        }
      : null,
    essay: profile.essay
      ? {
          summaryScore: profile.essay.summaryScore,
          vspice: profile.essay.vspice,
          latestId: profile.essay.latest?.rawScore ?? null,
        }
      : null,
    pinned: profile.pinnedSchools.map((s) => s.pin.name).sort(),
  };
  const str = JSON.stringify(projected);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(profile: StrategyProfile): string {
  return `${STRATEGY_CACHE_KEY}:${STRATEGY_CACHE_VERSION}:${hashInput(profile)}`;
}

function readCached(profile: StrategyProfile): StrategyResult | null {
  try {
    const raw = localStorage.getItem(cacheKey(profile));
    return raw ? (JSON.parse(raw) as StrategyResult) : null;
  } catch {
    return null;
  }
}

function writeCached(profile: StrategyProfile, result: StrategyResult): void {
  try {
    localStorage.setItem(cacheKey(profile), JSON.stringify(result));
  } catch {
    // Quota or disabled — silently degrade.
  }
}

// ── Hook ────────────────────────────────────────────────────────────────────

export interface UseStrategyReturn {
  readonly profile: StrategyProfile | null;
  readonly analysis: StrategyAnalysis | null;
  readonly result: StrategyResult | null;
  readonly loading: boolean;
  readonly error: string;
  readonly generate: (opts?: { bypassCache?: boolean }) => Promise<void>;
  readonly refresh: () => void;
}

export function useStrategy(): UseStrategyReturn {
  const [profile, setProfile] = useState<StrategyProfile | null>(null);
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [result, setResult] = useState<StrategyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load profile + analysis + cached result on mount and whenever refresh() is called
  const refresh = useCallback(() => {
    try {
      const p = readStrategyProfile();
      const a = runStrategyAnalysis(p);
      setProfile(p);
      setAnalysis(a);
      const cached = readCached(p);
      setResult(cached);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to read profile data.",
      );
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const generate = useCallback(
    async (opts: { bypassCache?: boolean } = {}) => {
      // Always rebuild profile+analysis at generate time so we use the
      // latest data, not the snapshot from mount.
      const p = readStrategyProfile();
      const a = runStrategyAnalysis(p);
      setProfile(p);
      setAnalysis(a);
      setError("");

      if (!opts.bypassCache) {
        const cached = readCached(p);
        if (cached) {
          setResult(cached);
          return;
        }
      }

      setLoading(true);
      try {
        const res = await fetch("/api/strategy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: p, analysis: a }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }
        const parsed = data as StrategyResult;
        setResult(parsed);
        writeCached(p, parsed);
      } catch {
        setError("Network error. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { profile, analysis, result, loading, error, generate, refresh };
}
